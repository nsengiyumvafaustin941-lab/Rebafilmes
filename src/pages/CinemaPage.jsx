import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Download, Star, Calendar, Globe } from 'lucide-react';
import StreamPlayer from '../components/StreamPlayer';
import ContentGrid from '../components/ContentGrid';
import AdBanner from '../components/AdBanner';
import Footer from '../components/Footer';
import { useMovies } from '../contexts/MoviesContext';
import { useLanguage } from '../contexts/LanguageContext';
import { moviePath, parseMovieId, getMovieOrTv } from '../utils/tmdb';
import { buildDownloadUrl } from '../utils/settings';
import './CinemaPage.css';

const CinemaPage = () => {
  const { t } = useLanguage();
  const { allMovies } = useMovies();
  const [params, setParams] = useSearchParams();

  const rawId = params.get('vd');
  const numericId = parseMovieId(rawId);
  const paramSeason = Number(params.get('s')) || 1;
  const paramEpisode = Number(params.get('e')) || 1;
  const paramServer = Number(params.get('srv')) || 0;
  const hintedType = params.get('type') || null;

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    const loadItem = async () => {
      if (!numericId) {
        setLoading(false);
        setItem(null);
        return;
      }

      setLoading(true);
      const cached = allMovies.find((m) => m.id === numericId);
      const isTv = cached?.type === 'series' || cached?.type === 'tv' || hintedType === 'series' || hintedType === 'tv';
      if (cached && (!isTv || (cached.seasons && cached.seasons.length > 0))) {
        if (!isCancelled) {
          setItem(cached);
          setLoading(false);
        }
        return;
      }

      const fetched = await getMovieOrTv(numericId, hintedType || cached?.type);
      if (!isCancelled) {
        setItem(fetched || cached || null);
        setLoading(false);
      }
    };

    loadItem();

    return () => {
      isCancelled = true;
    };
  }, [numericId, hintedType, allMovies]);

  // Handle URL sync when episode/season/server changes inside player
  const handleEpisodeChange = (sNum, epNum) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('s', String(sNum));
        next.set('e', String(epNum));
        return next;
      },
      { replace: true }
    );
  };

  const handleServerChange = (srvIdx) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('srv', String(srvIdx));
        return next;
      },
      { replace: true }
    );
  };

  // Related content
  const related = useMemo(() => {
    if (!item) return [];
    return allMovies
      .filter((c) => c.id !== item.id && (c.genre === item.genre || c.type === item.type))
      .slice(0, 8);
  }, [item, allMovies]);

  if (loading) {
    return (
      <div className="cinema-page">
        <div className="cinema-error page">
          <p>Loading streaming server infrastructure…</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="cinema-page">
        <div className="cinema-error page">
          <h2>{t('cinema_error') || 'Content Not Found'}</h2>
          <Link to="/" className="btn btn-primary" style={{ marginTop: '1.25rem' }}>
            ← {t('account_back_home') || 'Back Home'}
          </Link>
        </div>
      </div>
    );
  }

  const isSeries = item.type === 'series' || item.type === 'tv';
  const pageTitle = `${item.title} ${isSeries ? `(S${paramSeason} E${paramEpisode})` : ''} - Watch Stream Online | RebaFilme`;
  const downloadUrl = item.videoUrl
    ? `/api/download?url=${encodeURIComponent(item.videoUrl)}&title=${encodeURIComponent(item.title)}`
    : buildDownloadUrl(item.title);

  return (
    <div className="cinema-page">
      <div className="bg-logo-pattern" />
      <Helmet>
        <title>{pageTitle}</title>
        <meta
          name="description"
          content={`Stream ${item.title} in HD online free with 14 high-availability servers on RebaFilme.`}
        />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:image" content={item.poster} />
        <meta property="og:type" content="video.movie" />
      </Helmet>

      {/* Topbar */}
      <header className="cinema-topbar">
        <Link to={moviePath(item.id, item.title)} className="back-btn">
          <ArrowLeft size={19} />
          <span>{item.title}</span>
        </Link>
        <div className="cinema-title-badge-wrap">
          <span className="badge badge-accent">{isSeries ? 'TV Series' : 'HD Movie'}</span>
          {item.rating > 0 && (
            <span className="badge badge-dark" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Star size={12} fill="#ffb400" stroke="#ffb400" /> {Number(item.rating).toFixed(1)}
            </span>
          )}
        </div>
      </header>

      <AdBanner position="cinema_top" />

      {/* ── Main 14-Server Streaming Player Section ────────────────── */}
      <section className="cinema-player-section">
        <StreamPlayer
          item={item}
          initialSeason={paramSeason}
          initialEpisode={paramEpisode}
          initialServer={paramServer}
          onEpisodeChange={handleEpisodeChange}
          onServerChange={handleServerChange}
        />
      </section>

      {/* ── Content Metadata & Downloader Section ─────────────────── */}
      <div className="cinema-details-wrap">
        <div className="cinema-meta-card">
          <div className="cinema-meta-header">
            <div>
              <h1 className="cinema-meta-title">{item.title}</h1>
              <div className="cinema-tags-row">
                <span className="badge badge-accent">{item.badge || 'HD'}</span>
                {item.genre && <span className="badge badge-dark">{item.genre}</span>}
                {item.year && (
                  <span className="badge badge-dark" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} /> {item.year}
                  </span>
                )}
                {item.country && (
                  <span className="badge badge-dark" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Globe size={12} /> {item.country}
                  </span>
                )}
              </div>
            </div>

            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Download size={16} />
              <span>Download Media</span>
            </a>
          </div>

          {item.description && <p className="cinema-meta-desc">{item.description}</p>}
        </div>

        {/* Related Titles Carousel / Grid */}
        {related.length > 0 && (
          <div style={{ marginTop: '2.5rem' }}>
            <h2 className="section-title" style={{ marginBottom: '1.25rem' }}>
              {t('movie_related') || 'Recommended For You'}
            </h2>
            <ContentGrid items={related} />
          </div>
        )}

        <AdBanner position="cinema_download" />
      </div>

      <Footer />
    </div>
  );
};

export default CinemaPage;
