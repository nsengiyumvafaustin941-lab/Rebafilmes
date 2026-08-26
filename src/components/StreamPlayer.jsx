import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Play,
  RotateCw,
  Moon,
  Sun,
  SkipForward,
  SkipBack,
  Server,
  Layers,
  Film,
  Download,
  Crown,
  ExternalLink,
} from 'lucide-react';

import { STREAM_PROVIDERS, buildStreamUrl } from '../utils/streamProviders';
import { getTvSeason, getTvShow } from '../utils/tmdb';
import { buildDownloadUrl, getSettings } from '../utils/settings';
import { useVIP } from '../hooks/useVIP';
import { useVIPModal } from '../contexts/VIPModalContext';
import { useAds } from '../contexts/AdsContext';
import './StreamPlayer.css';

export const StreamPlayer = ({
  item,
  initialSeason = 1,
  initialEpisode = 1,
  initialServer = 0,
  onEpisodeChange,
  onServerChange,
}) => {
  const { isVip } = useVIP();
  const { openVIPModal } = useVIPModal();
  const { trackImpression, trackClick } = useAds();
  const settings = getSettings();

  const [activeServerIdx, setActiveServerIdx] = useState(
    initialServer >= 0 && initialServer < STREAM_PROVIDERS.length ? initialServer : 0
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [isTrailerMode, setIsTrailerMode] = useState(false);
  const [currentSeason, setCurrentSeason] = useState(initialSeason);
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode);
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [tvDetail, setTvDetail] = useState(null);

  // In-Stream Video Ad state
  const [playingVideoAd, setPlayingVideoAd] = useState(false);
  const [adSecondsLeft, setAdSecondsLeft] = useState(0);
  const [canSkipAd, setCanSkipAd] = useState(false);
  const adVideoRef = useRef(null);
  const adTrackedRef = useRef(false);

  const iframeRef = useRef(null);
  const playerContainerRef = useRef(null);

  const isSeries = item?.type === 'series' || item?.type === 'tv';
  const currentProvider = STREAM_PROVIDERS[activeServerIdx] || STREAM_PROVIDERS[0];
  const tmdbId = item?.tmdbId || item?.id;

  const handleVideoAdPlay = () => {
    if (!adTrackedRef.current) {
      adTrackedRef.current = true;
      if (trackImpression) trackImpression('video_preroll_global');
      try {
        window.dispatchEvent(new CustomEvent('rebafilme_video_ad_impression', {
          detail: { url: settings.videoAdUrl, timestamp: Date.now() }
        }));
      } catch {}
    }
  };

  const handleSponsorClick = () => {
    if (trackClick) trackClick('video_preroll_global');
    try {
      window.dispatchEvent(new CustomEvent('rebafilme_video_ad_click', {
        detail: { link: settings.videoAdLink, timestamp: Date.now() }
      }));
    } catch {}
  };

  const triggerPlay = () => {
    if (!isVip && settings.videoAdsEnabled && settings.videoAdUrl && settings.videoAdUrl.trim()) {
      setPlayingVideoAd(true);
      setAdSecondsLeft(Number(settings.videoAdDuration) || 10);
      setCanSkipAd(false);
      adTrackedRef.current = false;
    } else {
      setPlayingVideoAd(false);
    }
    setIsPlaying(true);
  };


  // Build active stream URL
  const embedUrl = buildStreamUrl(
    currentProvider.id,
    tmdbId,
    isSeries ? 'series' : 'movie',
    currentSeason,
    currentEpisode
  );

  // Sync props if initialSeason/initialEpisode changes from outside URL
  useEffect(() => {
    if (initialSeason) setCurrentSeason(Number(initialSeason));
    if (initialEpisode) setCurrentEpisode(Number(initialEpisode));
  }, [initialSeason, initialEpisode]);

  // Load TV Episodes when season changes
  useEffect(() => {
    if (!isSeries || !tmdbId) return;

    let isMounted = true;

    // Check if item already has episodes loaded
    if (item?.episodes && item.episodes.length > 0) {
      const filtered = item.episodes.filter((ep) => ep.s === currentSeason);
      if (filtered.length > 0) {
        setEpisodes(
          filtered.map((ep) => ({
            id: ep.id,
            episodeNumber: ep.e,
            seasonNumber: ep.s,
            title: ep.title || `Episode ${ep.e}`,
            still: ep.still || '',
          }))
        );
        return;
      }
    }

    setLoadingEpisodes(true);
    getTvSeason(tmdbId, currentSeason)
      .then((data) => {
        if (!isMounted) return;
        if (data && data.length > 0) {
          setEpisodes(data);
        } else {
          // Fallback array if TMDB returns empty
          const fallbackCount = item?.numberOfEpisodes || 12;
          const generated = Array.from({ length: Math.min(fallbackCount, 24) }, (_, i) => ({
            id: `ep-${currentSeason}-${i + 1}`,
            episodeNumber: i + 1,
            seasonNumber: currentSeason,
            title: `Episode ${i + 1}`,
            still: '',
          }));
          setEpisodes(generated);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setEpisodes([]);
      })
      .finally(() => {
        if (isMounted) setLoadingEpisodes(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isSeries, tmdbId, currentSeason, item]);

  // Episode Selection
  const handleEpisodeSelect = useCallback((epNum, sNum = currentSeason) => {
    setCurrentSeason(sNum);
    setCurrentEpisode(epNum);
    setIsPlaying(true);
    setIsTrailerMode(false);
    setReloadNonce((n) => n + 1);
    if (onEpisodeChange) onEpisodeChange(sNum, epNum);
  }, [currentSeason, onEpisodeChange]);

  // Handle Server Switching
  const handleServerSelect = (idx) => {
    setActiveServerIdx(idx);
    setIsPlaying(true);
    setIsTrailerMode(false);
    setReloadNonce((n) => n + 1);
    if (onServerChange) onServerChange(idx);
  };

  // Next Server Fallback
  const handleNextServer = () => {
    const nextIdx = (activeServerIdx + 1) % STREAM_PROVIDERS.length;
    handleServerSelect(nextIdx);
  };

  // If item is a series and doesn't have seasons loaded, fetch full TV details
  useEffect(() => {
    if (!isSeries || !tmdbId) return;
    if (item?.seasons && item.seasons.length > 0) return;

    let isMounted = true;
    getTvShow(tmdbId)
      .then((detail) => {
        if (isMounted && detail) {
          setTvDetail(detail);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [isSeries, tmdbId, item]);

  // Derive all seasons available
  const seasonsList = useMemo(() => {
    if (!isSeries) return [];

    // 1. Admin custom episodes
    if (item?.episodes && item.episodes.length > 0) {
      const distinct = [...new Set(item.episodes.map((ep) => ep.s || 1))].sort((a, b) => a - b);
      return distinct.map((sNum) => ({
        seasonNumber: sNum,
        name: `Season ${sNum}`,
        episodeCount: item.episodes.filter((ep) => (ep.s || 1) === sNum).length,
      }));
    }

    // 2. TMDB seasons
    const seasonsSource = item?.seasons?.length ? item.seasons : tvDetail?.seasons?.length ? tvDetail.seasons : null;
    if (seasonsSource && seasonsSource.length > 0) {
      return seasonsSource.map((s, idx) => ({
        seasonNumber: s.seasonNumber || s.season_number || idx + 1,
        name: s.name || `Season ${s.seasonNumber || s.season_number || idx + 1}`,
        episodeCount: s.episodeCount || s.episode_count || null,
      }));
    }

    // 3. Fallback count
    const count = item?.numberOfSeasons || tvDetail?.numberOfSeasons || item?.number_of_seasons || 1;
    return Array.from({ length: Math.max(count, 1) }, (_, i) => ({
      seasonNumber: i + 1,
      name: `Season ${i + 1}`,
      episodeCount: null,
    }));
  }, [isSeries, item, tvDetail]);

  // Next Episode Action
  const handleNextEpisode = useCallback(() => {
    const nextEp = currentEpisode + 1;
    const maxSeasonEpisodes = episodes.length || 24;
    if (nextEp <= maxSeasonEpisodes) {
      handleEpisodeSelect(nextEp, currentSeason);
    } else {
      const nextSeason = currentSeason + 1;
      const totalSeasons = seasonsList.length || 1;
      if (nextSeason <= totalSeasons) {
        handleEpisodeSelect(1, nextSeason);
      }
    }
  }, [currentEpisode, episodes.length, currentSeason, seasonsList.length, handleEpisodeSelect]);

  // Previous Episode Action
  const handlePrevEpisode = () => {
    if (currentEpisode > 1) {
      handleEpisodeSelect(currentEpisode - 1, currentSeason);
    } else if (currentSeason > 1) {
      handleEpisodeSelect(1, currentSeason - 1);
    }
  };

  // Cross-Window HTML5 postMessage Auto-Next Listener (MoviesJoy Pattern)
  useEffect(() => {
    const handleMessage = (ev) => {
      try {
        const d = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
        if (!d) return;
        const action = (d.event || d.type || d.action || '').toString().toLowerCase();
        if (action.includes('end') || d.ended === true) {
          if (isSeries) {
            handleNextEpisode();
          }
        }
      } catch {
        // Ignore cross-origin JSON parsing errors
      }
    };

    window.addEventListener('message', handleMessage, false);
    return () => window.removeEventListener('message', handleMessage);
  }, [isSeries, handleNextEpisode]);

  // Keyboard shortcut listener (F = Focus, N = Next Episode)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'f' || e.key === 'F') {
        setFocusMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const downloadUrl = item?.videoUrl
    ? `/api/download?url=${encodeURIComponent(item.videoUrl)}&title=${encodeURIComponent(item.title)}`
    : buildDownloadUrl(item?.title || '');

  // Video Ad Countdown & Skip logic
  useEffect(() => {
    if (!playingVideoAd) return;
    const interval = setInterval(() => {
      setAdSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setPlayingVideoAd(false);
          return 0;
        }
        if (prev <= 6) {
          setCanSkipAd(true);
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [playingVideoAd]);

  return (
    <div
      ref={playerContainerRef}
      className={`stream-player-root ${focusMode ? 'focus-mode' : ''}`}
    >
      {/* Focus Mode Ambient Backdrop */}
      <div
        className={`focus-backdrop ${focusMode ? 'active' : ''}`}
        onClick={() => setFocusMode(false)}
      />

      {/* ── Viewport Frame ────────────────────────────────────────── */}
      <div className="stream-viewport-wrapper">
        {!isPlaying ? (
          <div
            className="stream-facade"
            style={{
              backgroundImage: `url(${item?.backdrop || item?.poster})`,
            }}
            onClick={triggerPlay}
          >
            <div className="stream-facade-overlay" />
            <div className="stream-facade-content">
              <button
                className="stream-play-trigger"
                aria-label="Start Video Playback"
              >
                <Play size={40} fill="#ffffff" />
              </button>
              <div className="stream-facade-title">{item?.title}</div>
              <div className="stream-facade-subtitle">
                <span>{isSeries ? `Season ${currentSeason} · Episode ${currentEpisode}` : item?.year || 'Full Movie'}</span>
                <span>•</span>
                <span style={{ color: '#00e676', fontWeight: 600 }}>14 Servers Available</span>
              </div>
            </div>
          </div>
        ) : playingVideoAd && settings.videoAdUrl && !isVip ? (
          <div className="stream-video-ad-container">
            <video
              ref={adVideoRef}
              src={settings.videoAdUrl}
              autoPlay
              playsInline
              onPlay={handleVideoAdPlay}
              onEnded={() => setPlayingVideoAd(false)}
              className="stream-video-ad-element"
            />
            {/* Ad Overlay Controls */}
            <div className="stream-video-ad-overlay">
              <div className="stream-video-ad-top">
                <span className="stream-ad-badge">SPONSORED AD</span>
                {settings.videoAdLink && (
                  <a
                    href={settings.videoAdLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleSponsorClick}
                    className="stream-ad-visit-btn"
                  >
                    <span>Visit Sponsor</span>
                    <ExternalLink size={13} />
                  </a>
                )}
                <button
                  type="button"
                  className="stream-ad-vip-btn"
                  onClick={openVIPModal}
                  title="Remove ads with MoMo VIP"
                >
                  <Crown size={14} color="#ffd700" />
                  <span>Remove Ads (VIP)</span>
                </button>
              </div>

              <div className="stream-video-ad-bottom">
                <span className="stream-ad-timer">
                  Ad playing ({adSecondsLeft}s remaining)
                </span>
                {canSkipAd ? (
                  <button
                    className="stream-ad-skip-btn active"
                    onClick={() => setPlayingVideoAd(false)}
                  >
                    <span>Skip Ad</span>
                    <SkipForward size={14} />
                  </button>
                ) : (
                  <span className="stream-ad-skip-btn disabled">
                    Skip in {Math.max(1, adSecondsLeft - 5)}s
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : isTrailerMode && item?.trailerKey ? (
          <iframe
            key={`trailer-${item.trailerKey}`}
            src={`https://www.youtube.com/embed/${
              item.trailerKey.includes('http')
                ? new URL(item.trailerKey).searchParams.get('v')
                : item.trailerKey
            }?autoplay=1&rel=0`}
            title={`${item?.title} - Official Trailer`}
            className="stream-iframe"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <iframe
            key={`${currentProvider.id}-${tmdbId}-${currentSeason}-${currentEpisode}-${reloadNonce}`}
            ref={iframeRef}
            src={embedUrl}
            title={`${item?.title || 'Video Stream'} - ${currentProvider.name}`}
            className="stream-iframe"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        )}
      </div>

      {/* ── Player Toolbar ─────────────────────────────────────────── */}
      <div className="stream-toolbar">
        <div className="stream-toolbar-left">
          <div className="stream-status-pill">
            <span className="stream-status-dot" />
            <span>{isTrailerMode ? 'Official Trailer' : currentProvider.name}</span>
          </div>

          <button
            className="stream-tool-btn"
            onClick={() => setReloadNonce((n) => n + 1)}
            title="Reload Video Stream"
          >
            <RotateCw size={14} />
            <span>Reload</span>
          </button>

          <button
            className="stream-tool-btn"
            onClick={handleNextServer}
            title="Switch to next fallback server"
          >
            <Server size={14} />
            <span>Next Server</span>
          </button>

          {isSeries && (
            <>
              <button
                className="stream-tool-btn"
                onClick={handlePrevEpisode}
                disabled={currentEpisode <= 1 && currentSeason <= 1}
                title="Previous Episode"
              >
                <SkipBack size={14} />
                <span>Prev Ep</span>
              </button>
              <button
                className="stream-tool-btn"
                onClick={handleNextEpisode}
                title="Next Episode"
              >
                <SkipForward size={14} />
                <span>Next Ep</span>
              </button>
            </>
          )}
        </div>

        <div className="stream-toolbar-right">
          {!isVip && (
            <button
              className="stream-tool-btn stream-vip-cta-btn"
              onClick={() => setVipModalOpen(true)}
              title="Activate VIP: Ad-free & Direct Downloads"
            >
              <Crown size={14} color="#ffd700" />
              <span>👑 VIP Pass</span>
            </button>
          )}

          {item?.trailerKey && (
            <button
              className={`stream-tool-btn ${isTrailerMode ? 'active' : ''}`}
              onClick={() => {
                setIsTrailerMode(!isTrailerMode);
                setIsPlaying(true);
              }}
              title="Toggle Official Trailer"
            >
              <Film size={14} />
              <span>{isTrailerMode ? 'Back to Stream' : 'Trailer'}</span>
            </button>
          )}

          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="stream-tool-btn"
            title="Download Media File"
          >
            <Download size={14} />
            <span>Download</span>
          </a>

          <button
            className={`stream-tool-btn ${focusMode ? 'active' : ''}`}
            onClick={() => setFocusMode(!focusMode)}
            title="Toggle Theater / Focus Mode (Shortcut: F)"
          >
            {focusMode ? <Sun size={14} /> : <Moon size={14} />}
            <span>{focusMode ? 'Lights On' : 'Focus Mode'}</span>
          </button>
        </div>
      </div>



      {/* ── 14-Server Selection Section ───────────────────────────── */}
      <div className="stream-server-box">
        <div className="stream-server-header">
          <div className="stream-server-title">
            <Server size={17} color="var(--accent, #e50914)" />
            <span>Streaming Servers ({STREAM_PROVIDERS.length})</span>
          </div>
          <span className="stream-server-tip">
            If current server buffers or errors, click another server below
          </span>
        </div>

        <div className="stream-server-grid">
          {STREAM_PROVIDERS.map((provider, idx) => (
            <button
              key={provider.id}
              className={`server-pill-btn ${idx === activeServerIdx && !isTrailerMode ? 'active' : ''}`}
              onClick={() => handleServerSelect(idx)}
            >
              <div className="server-name-row">
                <span className="server-name">{provider.name}</span>
                <span className="server-badge-tag">{provider.badge}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── TV Shows Season & Episode Selector ────────────────────── */}
      {isSeries && (
        <div className="stream-episodes-box">
          <div className="stream-server-header">
            <div className="stream-server-title">
              <Layers size={17} color="var(--accent, #e50914)" />
              <span>Episodes · Season {currentSeason}</span>
            </div>
            <span className="stream-server-tip">
              Click any episode to stream immediately
            </span>
          </div>

          {/* Season Switcher Tabs */}
          {seasonsList.length > 0 && (
            <div className="stream-seasons-tabs">
              {seasonsList.map((s) => (
                <button
                  key={`season-${s.seasonNumber}`}
                  className={`season-tab-btn ${currentSeason === s.seasonNumber ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentSeason(s.seasonNumber);
                    setCurrentEpisode(1);
                    if (onEpisodeChange) onEpisodeChange(s.seasonNumber, 1);
                  }}
                >
                  {s.name} {s.episodeCount ? `(${s.episodeCount} Ep)` : ''}
                </button>
              ))}
            </div>
          )}

          {/* Episodes List Grid */}
          {loadingEpisodes ? (
            <div style={{ color: 'var(--text-secondary)', padding: '1.5rem', textAlign: 'center' }}>
              Loading season episodes…
            </div>
          ) : (
            <div className="stream-episodes-grid">
              {episodes.map((ep) => {
                const isActive = currentEpisode === ep.episodeNumber;
                return (
                  <button
                    key={ep.id || `ep-${ep.episodeNumber}`}
                    className={`episode-card-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleEpisodeSelect(ep.episodeNumber, currentSeason)}
                  >
                    <div className="episode-thumbnail-wrap">
                      <img
                        src={ep.still || item?.backdrop || item?.poster}
                        alt={ep.title}
                        className="episode-thumbnail"
                        loading="lazy"
                      />
                      <span className="episode-number-badge">EP {ep.episodeNumber}</span>
                    </div>
                    <div className="episode-meta-info">
                      <span className="episode-card-title">{ep.title}</span>
                      <span className="episode-card-air">
                        {ep.airDate ? ep.airDate.substring(0, 4) : `Season ${currentSeason}`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StreamPlayer;
