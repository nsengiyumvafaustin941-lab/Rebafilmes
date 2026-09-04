import React, { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Play,
  Bookmark,
  Globe,
  Calendar,
  Film,
  Download,
  Layers,
  Sparkles,
  Clock,
  Star,
} from "lucide-react";
import ContentGrid from "../components/ContentGrid";
import AdBanner from "../components/AdBanner";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import { useSaved } from "../contexts/SavedContext";
import { useMovies } from "../contexts/MoviesContext";
import { parseMovieId, getTvSeason } from "../utils/tmdb";
import { buildDownloadUrl } from "../utils/settings";
import "./MovieDetailPage.css";

const MovieDetailPage = () => {
  const { t } = useLanguage();
  const { isSaved, toggleSaved } = useSaved();
  const { allMovies, fetchMovieById } = useMovies();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const numericId = parseMovieId(id);
  const hintedType = searchParams.get('type') || null;

  const cached = allMovies.find((c) => {
    if (c.id !== numericId) return false;
    if (!hintedType) return true;
    const isTv = c.type === 'series' || c.type === 'tv';
    const targetIsTv = hintedType === 'series' || hintedType === 'tv';
    return isTv === targetIsTv;
  });
  const [item, setItem] = useState(cached || null);
  const [fetching, setFetching] = useState(!cached);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [seasonEpisodes, setSeasonEpisodes] = useState([]);
  const [loadingSeasonEpisodes, setLoadingSeasonEpisodes] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);

  // Load / upgrade item to full details (including seasons for TV series)
  useEffect(() => {
    let isCancelled = false;

    const isTv = cached?.type === 'series' || cached?.type === 'tv' || hintedType === 'series' || hintedType === 'tv';
    if (cached && (!isTv || (cached.seasons && cached.seasons.length > 0))) {
      setItem(cached);
      setFetching(false);
      return;
    }

    setFetching(!cached);
    fetchMovieById(id, hintedType).then((result) => {
      if (!isCancelled && result) {
        setItem(result);
        setFetching(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [id, numericId, cached, hintedType, fetchMovieById]);

  // Keep in sync if allMovies changes
  useEffect(() => {
    const fresh = allMovies.find((c) => {
      if (c.id !== numericId) return false;
      if (!hintedType) return true;
      const isTv = c.type === 'series' || c.type === 'tv';
      const targetIsTv = hintedType === 'series' || hintedType === 'tv';
      return isTv === targetIsTv;
    });
    if (fresh && fresh.seasons && fresh.seasons.length > 0) {
      setItem(fresh);
    }
  }, [allMovies, numericId, hintedType]);

  const isSeries = item?.type === "series" || item?.type === "tv";

  // Derive all available seasons
  const seasonsList = useMemo(() => {
    if (!isSeries || !item) return [];

    // 1. If admin custom episodes exist
    if (item.episodes && item.episodes.length > 0) {
      const distinct = [...new Set(item.episodes.map((ep) => ep.s || 1))].sort((a, b) => a - b);
      return distinct.map((sNum) => ({
        seasonNumber: sNum,
        name: `Season ${sNum}`,
        episodeCount: item.episodes.filter((ep) => (ep.s || 1) === sNum).length,
      }));
    }

    // 2. If TMDB seasons exist
    if (item.seasons && item.seasons.length > 0) {
      return item.seasons.map((s, idx) => ({
        seasonNumber: s.seasonNumber || s.season_number || idx + 1,
        name: s.name || `Season ${s.seasonNumber || s.season_number || idx + 1}`,
        episodeCount: s.episodeCount || s.episode_count || null,
        poster: s.poster || '',
        overview: s.overview || '',
      }));
    }

    // 3. Fallback based on numberOfSeasons
    const total = item.numberOfSeasons || item.number_of_seasons || 1;
    return Array.from({ length: total }, (_, i) => ({
      seasonNumber: i + 1,
      name: `Season ${i + 1}`,
      episodeCount: null,
    }));
  }, [isSeries, item]);

  // Ensure selectedSeason is valid
  useEffect(() => {
    if (seasonsList.length > 0) {
      const exists = seasonsList.some((s) => s.seasonNumber === selectedSeason);
      if (!exists) {
        setSelectedSeason(seasonsList[0].seasonNumber);
      }
    }
  }, [seasonsList, selectedSeason]);

  // Load episodes when selectedSeason or item changes
  useEffect(() => {
    if (!isSeries || !item) {
      setSeasonEpisodes([]);
      return;
    }

    // Admin custom episodes
    if (item.episodes && item.episodes.length > 0) {
      const filtered = item.episodes
        .filter((ep) => (ep.s || 1) === selectedSeason)
        .map((ep) => ({
          id: ep.id || `ep-${selectedSeason}-${ep.e}`,
          episodeNumber: ep.e || 1,
          seasonNumber: ep.s || selectedSeason,
          title: ep.title || `Episode ${ep.e || 1}`,
          videoUrl: ep.videoUrl || '',
          still: ep.still || item.backdrop || item.poster || '',
        }));
      setSeasonEpisodes(filtered);
      return;
    }

    // TMDB series live episodes
    let isCancelled = false;
    setLoadingSeasonEpisodes(true);

    getTvSeason(item.id, selectedSeason)
      .then((data) => {
        if (!isCancelled) {
          if (data && data.length > 0) {
            setSeasonEpisodes(data);
          } else {
            const fallbackCount = item.numberOfEpisodes || 10;
            const generated = Array.from({ length: Math.min(fallbackCount, 24) }, (_, i) => ({
              id: `ep-${selectedSeason}-${i + 1}`,
              episodeNumber: i + 1,
              seasonNumber: selectedSeason,
              title: `Episode ${i + 1}`,
              overview: '',
              still: item.backdrop || item.poster || '',
            }));
            setSeasonEpisodes(generated);
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch season episodes', err);
        if (!isCancelled) setSeasonEpisodes([]);
      })
      .finally(() => {
        if (!isCancelled) setLoadingSeasonEpisodes(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isSeries, item, selectedSeason]);

  const seoTitle = item?.seoTitle || `${item?.title} - RebaFilme`;
  const seoDesc = item?.seoDesc || item?.description || "";
  const seoKeywords =
    item?.seoKeywords ||
    `${item?.title}, watch free online, HD movies, new releases`;

  const related = useMemo(() => {
    if (!item) return [];
    return allMovies
      .filter((c) => c.id !== item.id && (c.genre === item.genre || c.type === item.type))
      .slice(0, 8);
  }, [item, allMovies]);

  if (fetching)
    return (
      <div
        className="page"
        style={{
          padding: "4rem 1.5rem",
          textAlign: "center",
          color: "var(--text-secondary)",
        }}
      >
        Loading…
      </div>
    );

  if (!item)
    return (
      <div className="not-found page">
        <h2>{t("movie_not_found")}</h2>
        <Link to="/" className="btn btn-primary" style={{ marginTop: "1rem" }}>
          ← {t("account_back_home")}
        </Link>
      </div>
    );

  return (
    <div className="detail-page">
      <div className="bg-logo-pattern" />
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDesc} />
        <meta name="keywords" content={seoKeywords} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDesc} />
        <meta property="og:image" content={item.poster} />
        <meta property="og:type" content="video.movie" />
      </Helmet>

      {/* Backdrop */}
      <div
        className="detail-backdrop"
        style={{ backgroundImage: `url(${item.backdrop || item.poster})` }}
      >
        <div className="detail-backdrop-overlay" />
      </div>

      {/* Main content */}
      <div className="detail-content page">
        <div className="detail-layout">
          {/* Poster */}
          <div className="detail-poster-wrap">
            <img src={item.poster} alt={item.title} className="detail-poster" />
          </div>

          {/* Info */}
          <div className="detail-info">
            <div
              style={{
                display: "flex",
                gap: ".5rem",
                flexWrap: "wrap",
                marginBottom: "1rem",
              }}
            >
              <span className="badge badge-accent">{item.badge}</span>
              <span className="badge badge-dark">{item.genre}</span>
              <span className="badge badge-dark">
                {isSeries ? "TV Series" : "Movie"}
              </span>
              {item.rating > 0 && (
                <span
                  className="badge badge-dark"
                  style={{ display: "flex", alignItems: "center", gap: "3px", color: "#ffb400" }}
                >
                  <Star size={11} fill="#ffb400" /> {Number(item.rating).toFixed(1)}
                </span>
              )}
            </div>

            <h1 className="detail-title">{item.title}</h1>

            <table className="detail-meta-table">
              <tbody>
                <tr>
                  <td>
                    <Film size={14} /> {t("movie_genre")}
                  </td>
                  <td>{item.genre}</td>
                </tr>
                <tr>
                  <td>
                    <Globe size={14} /> {t("movie_country")}
                  </td>
                  <td>{item.country}</td>
                </tr>
                <tr>
                  <td>
                    <Calendar size={14} /> {t("movie_year")}
                  </td>
                  <td>{item.year}</td>
                </tr>
                {isSeries && seasonsList.length > 0 && (
                  <tr>
                    <td>
                      <Layers size={14} /> Total Seasons
                    </td>
                    <td>{seasonsList.length} {seasonsList.length === 1 ? 'Season' : 'Seasons'} Available</td>
                  </tr>
                )}
              </tbody>
            </table>

            <p className="detail-desc">{item.description}</p>

            <div className="detail-actions">
              <Link
                to={`/cinema?vd=${item.id}&type=${isSeries ? 'series' : 'movie'}${isSeries ? `&s=${selectedSeason}&e=1` : ''}`}
                className="btn btn-primary"
              >
                <Play size={17} fill="currentColor" /> {t("movie_watch") || "Watch Stream"}
              </Link>

              {item.trailerKey && (
                <button
                  className="btn btn-ghost"
                  style={{
                    border: "1px solid rgba(255,255,255,.2)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                  onClick={() => setShowTrailer(true)}
                >
                  <Play size={15} fill="#ff0000" color="#ff0000" />
                  {t("watch_trailer") || "Watch Trailer"}
                </button>
              )}

              {!isSeries && (
                <a
                  href={
                    item.videoUrl
                      ? `/api/download?url=${encodeURIComponent(item.videoUrl)}&title=${encodeURIComponent(item.title)}`
                      : buildDownloadUrl(item.title)
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                  style={{
                    textDecoration: "none",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,.2)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <Download size={17} /> {t("download_movie") || "Download"}
                </a>
              )}

              <button
                className={`btn ${isSaved(item.id) ? "btn-primary" : "btn-ghost"}`}
                onClick={() => toggleSaved(item.id)}
              >
                <Bookmark
                  size={17}
                  fill={isSaved(item.id) ? "currentColor" : "none"}
                />{" "}
                {isSaved(item.id) ? t("nav_saved") : t("movie_save")}
              </button>
            </div>
          </div>
        </div>

        {/* ── Series Seasons & Episodes Explorer ──────────────────────── */}
        {isSeries && (
          <section className="detail-seasons-section">
            <div className="detail-seasons-header">
              <div className="detail-seasons-title">
                <Layers size={20} color="var(--accent, #e50914)" />
                <span>Seasons & Episodes</span>
              </div>
              <span className="detail-seasons-count-badge">
                {seasonsList.length} {seasonsList.length === 1 ? 'Season' : 'Seasons'} Available
              </span>
            </div>

            {/* All Available Season Tabs */}
            {seasonsList.length > 0 && (
              <div className="detail-season-tabs">
                {seasonsList.map((s) => (
                  <button
                    key={`season-${s.seasonNumber}`}
                    onClick={() => setSelectedSeason(s.seasonNumber)}
                    className={`detail-season-tab ${selectedSeason === s.seasonNumber ? "active" : ""}`}
                  >
                    {s.name} {s.episodeCount ? `(${s.episodeCount} Ep)` : ''}
                  </button>
                ))}
              </div>
            )}

            {/* Episodes List Grid */}
            {loadingSeasonEpisodes ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-secondary)" }}>
                <Sparkles size={24} color="var(--accent)" style={{ animation: "spin 2s linear infinite" }} />
                <p style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>Loading Season {selectedSeason} episodes…</p>
              </div>
            ) : seasonEpisodes.length > 0 ? (
              <div className="detail-episodes-grid">
                {seasonEpisodes.map((ep) => {
                  const linkTo = `/cinema?vd=${item.id}&type=series&s=${selectedSeason}&e=${ep.episodeNumber}`;
                  const downloadUrl = ep.videoUrl || buildDownloadUrl(`${item.title} S${selectedSeason}E${ep.episodeNumber}`);

                  return (
                    <div key={ep.id || `ep-${selectedSeason}-${ep.episodeNumber}`} className="detail-episode-card">
                      <Link to={linkTo} className="detail-ep-thumb-wrap">
                        <img
                          src={ep.still || item.backdrop || item.poster}
                          alt={ep.title}
                          className="detail-ep-thumb"
                          loading="lazy"
                        />
                        <span className="detail-ep-badge">EP {ep.episodeNumber}</span>
                        {ep.runtime && (
                          <span className="detail-ep-duration">
                            <Clock size={10} style={{ display: "inline", marginRight: "3px" }} />
                            {ep.runtime}m
                          </span>
                        )}
                        <div className="detail-ep-play-overlay">
                          <Play size={28} fill="#fff" />
                        </div>
                      </Link>

                      <div className="detail-ep-body">
                        <div className="detail-ep-title">{ep.title}</div>
                        {ep.airDate && (
                          <span className="detail-ep-meta">
                            Air Date: {ep.airDate}
                          </span>
                        )}
                        {ep.overview && (
                          <p className="detail-ep-desc">{ep.overview}</p>
                        )}

                        <div className="detail-ep-actions">
                          <Link to={linkTo} className="detail-ep-watch-btn">
                            <Play size={13} fill="currentColor" /> Watch
                          </Link>
                          <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="detail-ep-download-btn"
                            title="Download Episode"
                          >
                            <Download size={14} />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                No episodes found for Season {selectedSeason}.
              </div>
            )}
          </section>
        )}

        {/* ── Related Content ─────────────────────────────────────────── */}
        {related.length > 0 && (
          <div style={{ marginTop: "3rem" }}>
            <h2 className="section-title" style={{ marginBottom: "1rem" }}>
              {t("movie_related")}
            </h2>
            <ContentGrid items={related} />
          </div>
        )}

        <AdBanner position="detail_bottom" />
        <Footer />
      </div>

      {/* ── Official Trailer Modal ────────────────────────────────────── */}
      {showTrailer && item.trailerKey && (
        <div className="trailer-modal" onClick={() => setShowTrailer(false)}>
          <div
            className="trailer-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="trailer-modal-close"
              onClick={() => setShowTrailer(false)}
              aria-label="Close trailer modal"
            >
              &times;
            </button>
            <div className="trailer-video-responsive">
              <iframe
                src={`https://www.youtube.com/embed/${
                  item.trailerKey.includes("http")
                    ? new URL(item.trailerKey).searchParams.get("v")
                    : item.trailerKey
                }?autoplay=1`}
                title={`${item.title} Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieDetailPage;
