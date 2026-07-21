import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Play, Bookmark, Globe, Calendar, Film, Download } from "lucide-react";
import ContentGrid from "../components/ContentGrid";
import AdBanner from "../components/AdBanner";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import { useSaved } from "../contexts/SavedContext";
import { useMovies } from "../contexts/MoviesContext";
import { parseMovieId } from "../utils/tmdb";
import { buildDownloadUrl } from "../utils/settings";
import "./MovieDetailPage.css";

const MovieDetailPage = () => {
  const { t } = useLanguage();
  const { isSaved, toggleSaved } = useSaved();
  const { allMovies, fetchMovieById } = useMovies();
  const { id } = useParams();
  const numericId = parseMovieId(id);

  // Try local cache first; if not found fetch directly from TMDB
  const cached = allMovies.find((c) => c.id === numericId);
  const [item, setItem] = useState(cached || null);
  const [fetching, setFetching] = useState(!cached);

  useEffect(() => {
    if (cached) {
      setItem(cached);
      setFetching(false);
      return;
    }
    setFetching(true);
    fetchMovieById(numericId).then((result) => {
      setItem(result || null);
      setFetching(false);
    });
  }, [numericId, cached, fetchMovieById]);

  // Keep item in sync if allMovies updates (e.g. after fetch lands in context)
  useEffect(() => {
    const fresh = allMovies.find((c) => c.id === numericId);
    if (fresh) setItem(fresh);
  }, [allMovies, numericId]);

  const seoTitle = item?.seoTitle || `${item?.title} - RebaFilme`;
  const seoDesc = item?.seoDesc || item?.description || "";
  const seoKeywords =
    item?.seoKeywords ||
    `${item?.title}, watch free online, HD movies, new releases`;

  const [selectedSeason, setSelectedSeason] = useState(1);
  const [showTrailer, setShowTrailer] = useState(false);

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
  let seriesEpisodes = [];
  let useInternalEpisodes = false;
  if (item && item.type === "series") {
    if (item.episodes && item.episodes.length > 0) {
      seriesEpisodes = [...item.episodes].sort((a, b) =>
        a.s !== b.s ? a.s - b.s : a.e - b.e,
      );
      useInternalEpisodes = true;
    } else {
      const baseName = item.title.split("-")[0].trim();
      seriesEpisodes = allMovies
        .filter(
          (c) =>
            c.type === "series" && c.title.split("-")[0].trim() === baseName,
        )
        .sort((a, b) => {
          if (a.title < b.title) return -1;
          if (a.title > b.title) return 1;
          return a.id - b.id;
        });
    }
  }

  const uniqueSeasons = useInternalEpisodes
    ? [...new Set(seriesEpisodes.map((ep) => ep.s))].sort((a, b) => a - b)
    : [];
  const activeSeason = uniqueSeasons.includes(selectedSeason)
    ? selectedSeason
    : uniqueSeasons[0] || 1;
  const displayedEpisodes =
    useInternalEpisodes && uniqueSeasons.length > 0
      ? seriesEpisodes.filter((ep) => ep.s === activeSeason)
      : seriesEpisodes;

  const related = allMovies
    .filter((c) => c.id !== item.id && c.genre === item.genre)
    .slice(0, 8);

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
        style={{ backgroundImage: `url(${item.backdrop})` }}
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
                {item.type === "series" ? "Serie" : "Filme"}
              </span>
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
              </tbody>
            </table>

            <p className="detail-desc">{item.description}</p>

            <div className="detail-actions">
              <Link to={`/cinema?vd=${item.id}`} className="btn btn-primary">
                <Play size={17} fill="currentColor" /> {t("movie_watch")}
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
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="#ff0000"
                    style={{ verticalAlign: "middle" }}
                  >
                    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.507 9.388.507 9.388.507s7.518 0 9.388-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  {t("watch_trailer") || "Watch Trailer"}
                </button>
              )}
              {item.type === "movie" && (
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

        {/* Episode Selector for Series */}
        {item.type === "series" && seriesEpisodes.length > 0 && (
          <div style={{ marginTop: "2.5rem" }}>
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 600,
                marginBottom: "1rem",
                color: "#fff",
              }}
            >
              Watch / Download
            </h2>

            {uniqueSeasons.length > 1 && (
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  marginBottom: "1.25rem",
                  overflowX: "auto",
                  paddingBottom: "0.5rem",
                }}
              >
                {uniqueSeasons.map((seasonNum) => (
                  <button
                    key={seasonNum}
                    onClick={() => setSelectedSeason(seasonNum)}
                    className={`btn ${activeSeason === seasonNum ? "btn-primary" : "btn-ghost"}`}
                    style={{
                      padding: "0.5rem 1.25rem",
                      borderRadius: "50px",
                      whiteSpace: "nowrap",
                      border:
                        activeSeason !== seasonNum
                          ? "1px solid rgba(255,255,255,.1)"
                          : "none",
                    }}
                  >
                    Season {seasonNum}
                  </button>
                ))}
              </div>
            )}

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {displayedEpisodes.map((ep) => {
                const linkTo = useInternalEpisodes
                  ? `/cinema?vd=${item.id}&ep=${ep.id}`
                  : `/movie/${ep.id}`;
                const downloadUrl = ep.videoUrl || "#";

                return (
                  <div
                    key={ep.id}
                    style={{
                      background: "#13131a",
                      padding: "1rem 1.5rem",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,.05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.05rem",
                        color: "#fff",
                        fontWeight: 500,
                      }}
                    >
                      {ep.title}
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      <Link
                        to={linkTo}
                        className="btn btn-primary"
                        style={{
                          padding: "0.45rem 1rem",
                          fontSize: "0.9rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          textDecoration: "none",
                        }}
                      >
                        <Play size={14} fill="currentColor" /> Watch
                      </Link>
                      <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost"
                        style={{
                          padding: "0.45rem 1rem",
                          fontSize: "0.9rem",
                          border: "1px solid rgba(255,255,255,.2)",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          textDecoration: "none",
                          color: "#fff",
                        }}
                      >
                        <Download size={14} /> Download
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {related.length > 0 && (
          <div style={{ marginTop: "3rem" }}>
            <h2 className="section-title" style={{ marginBottom: "1rem" }}>
              {t("movie_related")}
            </h2>
            <ContentGrid items={related} />
          </div>
        )}
        <AdBanner position="movie_detail" />
      </div>

      {showTrailer && item.trailerKey && (
        <div className="trailer-modal" onClick={() => setShowTrailer(false)}>
          <div
            className="trailer-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="trailer-modal-close"
              onClick={() => setShowTrailer(false)}
            >
              ×
            </button>
            <div className="trailer-video-responsive">
              <iframe
                src={`https://www.youtube.com/embed/${item.trailerKey.includes("http") ? new URL(item.trailerKey).searchParams.get("v") : item.trailerKey}?autoplay=1`}
                title={`${item.title} Trailer`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default MovieDetailPage;
