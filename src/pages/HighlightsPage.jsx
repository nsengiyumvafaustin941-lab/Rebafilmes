import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Star,
  TrendingUp,
  Calendar,
  Newspaper,
  ExternalLink,
} from "lucide-react";
import { useMovies } from "../contexts/MoviesContext";
import {
  getTrending,
  getUpcoming,
  getTopRated,
  moviePath,
} from "../utils/tmdb";
import Footer from "../components/Footer";
import "./HighlightsPage.css";

const NewsfeedsPage = () => {
  const { allMovies } = useMovies();

  const [trendingMovies, setTrendingMovies] = useState([]);
  const [upcomingMovies, setUpcomingMovies] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch live TMDB data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([getTrending(1), getUpcoming(1), getTopRated(1)])
      .then(([trendingRes, upcomingRes]) => {
        if (cancelled) return;
        setTrendingMovies(trendingRes.filter((m) => m.poster || m.backdrop));
        setUpcomingMovies(upcomingRes.filter((m) => m.poster));
      })
      .catch((err) => console.warn("Failed to load TMDB newsfeed content", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Fetch live news articles (Automatic RSS)
  useEffect(() => {
    let cancelled = false;
    const rssUrl = encodeURIComponent(
      "https://www.hollywoodreporter.com/c/movies/feed/",
    );
    const API = `https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}&count=10`;

    fetch(API)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.status === "ok" && data.items?.length > 0) {
          setNews(
            data.items.map((item) => {
              let image = item.thumbnail || item.enclosure?.link || "";
              // Try extracting img src from content if thumbnail is missing
              if (!image) {
                const imgMatch = (item.description || item.content || "").match(
                  /<img[^>]+src="([^">]+)"/,
                );
                if (imgMatch) image = imgMatch[1];
              }
              return {
                id: item.guid || item.link,
                title: item.title,
                snippet:
                  item.description?.replace(/<[^>]+>/g, "").slice(0, 140) +
                  "...",
                url: item.link,
                image: image,
                date: item.pubDate
                  ? new Date(item.pubDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Recent",
              };
            }),
          );
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  // Use the very first news article for the Hero banner
  const heroNews = useMemo(() => news[0] || null, [news]);
  // Fallback image for hero if the RSS article lacks an image
  const heroBg =
    heroNews?.image || trendingMovies[0]?.backdrop || trendingMovies[0]?.poster;

  // Next 3 news articles for the Grid
  const gridNews = useMemo(() => news.slice(1, 4), [news]);

  // Sidebar trending list (TMDB movies)
  const sidebarTrending = useMemo(
    () => trendingMovies.slice(0, 4),
    [trendingMovies],
  );

  // Upcoming widget movie (TMDB movie)
  const upcomingWidgetMovie = useMemo(
    () => upcomingMovies[0] || allMovies[1] || null,
    [upcomingMovies, allMovies],
  );

  if (loading && !heroNews && trendingMovies.length === 0) {
    return (
      <div
        className="nf-page page"
        style={{ textAlign: "center", padding: "5rem 1rem", color: "#888" }}
      >
        Loading Newsfeeds...
      </div>
    );
  }

  return (
    <div className="nf-page page">
      <div className="bg-logo-pattern" />
      {/* ════════════════════════════════════════════════════════════
         TOP SECTION: Hero Banner (Left 2/3) + Trending Now (Right 1/3)
      ════════════════════════════════════════════════════════════ */}
      <div className="nf-top-layout">
        {/* HERO BANNER (Top News) */}
        {heroNews ? (
          <div
            className="nf-hero-card"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(14, 16, 22, 0.4) 0%, rgba(14, 16, 22, 0.92) 80%), url(${heroBg})`,
            }}
          >
            <div className="nf-hero-badge-tag">
              <Newspaper
                size={14}
                style={{
                  display: "inline",
                  marginRight: "5px",
                  verticalAlign: "text-bottom",
                }}
              />{" "}
              Breaking News
            </div>

            <div className="nf-hero-content">
              <h1 className="nf-hero-title">{heroNews.title}</h1>
              <p className="nf-hero-desc">{heroNews.snippet}</p>

              {/* Action bar below description */}
              <div className="nf-hero-actions" style={{ marginTop: "1.5rem" }}>
                <a
                  href={heroNews.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  <ExternalLink size={16} />
                  Read Full Article
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="nf-hero-card" style={{ background: "#1a1a24" }}>
            <div className="nf-hero-content">
              <h1 className="nf-hero-title">Loading Latest News...</h1>
            </div>
          </div>
        )}

        {/* TRENDING NOW SIDEBAR (Movies) */}
        <div className="nf-trending-sidebar">
          <div className="nf-sidebar-header">
            <TrendingUp size={18} color="#e50914" />
            <h3 className="nf-sidebar-title">Trending Movies</h3>
          </div>

          <div className="nf-trending-list">
            {sidebarTrending.map((item) => (
              <Link
                key={item.id}
                to={moviePath(item.id, item.title)}
                className="nf-trending-item"
              >
                <img
                  src={item.poster}
                  alt={item.title}
                  className="nf-trending-thumb"
                />
                <div className="nf-trending-info">
                  <h4 className="nf-trending-item-title">{item.title}</h4>
                  <div className="nf-trending-tags">
                    <span>{item.year || "2025"}</span>
                    <span>{item.genre || "Action"}</span>
                    <span className="nf-tag-rating">
                      <Star size={11} fill="#ffc107" color="#ffc107" />
                      {(item.rating || 8.0).toFixed(1)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
         MAIN MAGAZINE GRID: 3 Columns
         (Left: Large News Card | Middle: Medium News Cards | Right: Upcoming Release)
      ════════════════════════════════════════════════════════════ */}
      <div className="nf-grid-layout">
        {/* ── LEFT COLUMN: Large Vertical News Card ── */}
        {gridNews[0] && (
          <a
            href={gridNews[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="nf-card nf-card-large"
            style={{ textDecoration: "none" }}
          >
            <div className="nf-card-media-wrap">
              <img
                src={gridNews[0].image || trendingMovies[1]?.backdrop}
                alt={gridNews[0].title}
                className="nf-card-img"
              />
              <span className="nf-badge-label review">Featured</span>
            </div>
            <div className="nf-card-body">
              <h3 className="nf-card-title">{gridNews[0].title}</h3>
              <div className="nf-card-meta">
                <span>{gridNews[0].date}</span>
                <span>Hollywood Reporter</span>
              </div>
              <p className="nf-card-snippet">{gridNews[0].snippet}</p>
            </div>
          </a>
        )}

        {/* ── MIDDLE COLUMN: 2 Square / Medium News Cards ── */}
        <div className="nf-middle-col">
          {gridNews[1] && (
            <a
              href={gridNews[1].url}
              target="_blank"
              rel="noopener noreferrer"
              className="nf-card nf-card-medium"
              style={{ textDecoration: "none" }}
            >
              <div className="nf-card-media-wrap square">
                <img
                  src={gridNews[1].image || trendingMovies[2]?.backdrop}
                  alt={gridNews[1].title}
                  className="nf-card-img"
                />
                <span className="nf-badge-label news">Industry</span>
              </div>
              <div className="nf-card-body">
                <h3 className="nf-card-title">{gridNews[1].title}</h3>
                <div className="nf-card-meta">
                  <span>{gridNews[1].date}</span>
                </div>
                <p className="nf-card-snippet">{gridNews[1].snippet}</p>
              </div>
            </a>
          )}

          {gridNews[2] && (
            <a
              href={gridNews[2].url}
              target="_blank"
              rel="noopener noreferrer"
              className="nf-card nf-card-medium"
              style={{ textDecoration: "none" }}
            >
              <div className="nf-card-media-wrap">
                <img
                  src={gridNews[2].image || trendingMovies[3]?.backdrop}
                  alt={gridNews[2].title}
                  className="nf-card-img"
                />
                <span className="nf-badge-label trailer">Update</span>
              </div>
              <div className="nf-card-body">
                <h3 className="nf-card-title">{gridNews[2].title}</h3>
                <div className="nf-card-meta">
                  <span>{gridNews[2].date}</span>
                </div>
                <p className="nf-card-snippet">{gridNews[2].snippet}</p>
              </div>
            </a>
          )}
        </div>

        {/* ── RIGHT COLUMN: Upcoming Releases Widget Card (Movie) ── */}
        <div className="nf-right-col">
          <div className="nf-upcoming-widget">
            <div className="nf-sidebar-header">
              <Calendar size={18} color="#e50914" />
              <h3 className="nf-sidebar-title">Upcoming Movies</h3>
            </div>

            {upcomingWidgetMovie && (
              <div className="nf-card nf-card-widget">
                <div className="nf-card-media-wrap widget">
                  <img
                    src={
                      upcomingWidgetMovie.backdrop || upcomingWidgetMovie.poster
                    }
                    alt={upcomingWidgetMovie.title}
                    className="nf-card-img"
                  />
                </div>
                <div className="nf-card-body">
                  <h3 className="nf-card-title">{upcomingWidgetMovie.title}</h3>
                  <div className="nf-card-meta">
                    <span>{upcomingWidgetMovie.year || "2026"}</span>
                    <span>{upcomingWidgetMovie.genre}</span>
                  </div>
                  <p className="nf-card-snippet">
                    {upcomingWidgetMovie.description}
                  </p>

                  <div className="nf-card-footer">
                    <div className="nf-rating-pill">
                      <Star size={14} fill="#ffc107" color="#ffc107" />
                      <span>
                        {(upcomingWidgetMovie.rating || 8.7).toFixed(1)}/10
                      </span>
                    </div>
                    <div className="nf-card-btn-group">
                      <Link
                        to={`/movie/${upcomingWidgetMovie.id}`}
                        className="nf-icon-btn"
                        style={{
                          padding: "0 0.5rem",
                          width: "auto",
                          background: "rgba(229,9,20,0.1)",
                          color: "#e50914",
                          textDecoration: "none",
                        }}
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default NewsfeedsPage;
