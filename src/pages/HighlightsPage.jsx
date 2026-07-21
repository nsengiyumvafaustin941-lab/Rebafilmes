import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Star, Bookmark, Share2, MessageSquare, TrendingUp, Calendar, Newspaper, Film, Check, ExternalLink } from 'lucide-react';
import { useMovies } from '../contexts/MoviesContext';
import { useSaved } from '../contexts/SavedContext';
import { getTrending, getUpcoming, getTopRated, moviePath } from '../utils/tmdb';
import Footer from '../components/Footer';
import './HighlightsPage.css';

const NewsfeedsPage = () => {
  const navigate = useNavigate();
  const { allMovies } = useMovies();
  const { isSaved, toggleSaved } = useSaved();

  const [trendingMovies, setTrendingMovies] = useState([]);
  const [upcomingMovies, setUpcomingMovies] = useState([]);
  const [news, setNews] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Fetch live TMDB data (Trending & Upcoming)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([getTrending(1), getUpcoming(1), getTopRated(1)])
      .then(([trendingRes, upcomingRes, topRatedRes]) => {
        if (cancelled) return;
        setTrendingMovies(trendingRes.filter((m) => m.poster || m.backdrop));
        setUpcomingMovies(upcomingRes.filter((m) => m.poster));
      })
      .catch((err) => console.warn('Failed to load TMDB newsfeed content', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  // 2. Fetch live news articles (Automatic RSS)
  useEffect(() => {
    let cancelled = false;
    const RSS_URL = 'https://screenrant.com/feed/movie-news/';
    const API = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}&count=6`;

    fetch(API)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.status === 'ok' && data.items?.length > 0) {
          setNews(
            data.items.map((item) => ({
              id: item.guid || item.link,
              title: item.title,
              snippet: item.description?.replace(/<[^>]+>/g, '').slice(0, 120) + '…',
              url: item.link,
              image: item.thumbnail || item.enclosure?.link || '',
              date: item.pubDate ? new Date(item.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
            }))
          );
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  // Derive Hero movie (top 1 trending item or first featured movie)
  const heroMovie = useMemo(() => {
    if (trendingMovies.length > 0) return trendingMovies[0];
    if (allMovies.length > 0) return allMovies[0];
    return null;
  }, [trendingMovies, allMovies]);

  // Sidebar trending list (items 2 through 6)
  const sidebarTrending = useMemo(() => {
    return trendingMovies.slice(1, 5);
  }, [trendingMovies]);

  // Main grid items (items 6 through 12)
  const gridItems = useMemo(() => {
    const combined = [...trendingMovies.slice(5), ...allMovies];
    const seen = new Set();
    return combined.filter((m) => {
      if (!m.id || seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    }).slice(0, 5);
  }, [trendingMovies, allMovies]);

  // Upcoming widget movie
  const upcomingWidgetMovie = useMemo(() => {
    return upcomingMovies[0] || trendingMovies[6] || allMovies[1] || null;
  }, [upcomingMovies, trendingMovies, allMovies]);

  const handleShare = (movie, e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/movie/${movie.id}`;
    if (navigator.share) {
      navigator.share({ title: movie.title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      setCopiedId(movie.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleToggleBookmark = (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSaved(id);
  };

  if (loading && !heroMovie) {
    return (
      <div className="nf-page page" style={{ textAlign: 'center', padding: '5rem 1rem', color: '#888' }}>
        Loading Newsfeeds…
      </div>
    );
  }

  return (
    <div className="nf-page page">

      {/* ════════════════════════════════════════════════════════════
         TOP SECTION: Hero Banner (Left 2/3) + Trending Now (Right 1/3)
      ════════════════════════════════════════════════════════════ */}
      <div className="nf-top-layout">
        
        {/* HERO BANNER */}
        {heroMovie && (
          <div
            className="nf-hero-card"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(14, 16, 22, 0.4) 0%, rgba(14, 16, 22, 0.92) 80%), url(${heroMovie.backdrop || heroMovie.poster})`,
            }}
          >
            <div className="nf-hero-badge-tag">Hero Section</div>

            <div className="nf-hero-content">
              <h1 className="nf-hero-title">{heroMovie.title}</h1>
              <p className="nf-hero-desc">
                {heroMovie.description || 'Watch full movie in HD quality with original audio and Rwandan translations.'}
              </p>

              {/* Action bar below description */}
              <div className="nf-hero-actions">
                <div className="nf-hero-rating">
                  <Star size={15} fill="#ffc107" color="#ffc107" />
                  <span>{(heroMovie.rating || 9.1).toFixed(1)}/10</span>
                </div>

                <button
                  className={`nf-action-btn ${isSaved(heroMovie.id) ? 'active' : ''}`}
                  onClick={(e) => handleToggleBookmark(heroMovie.id, e)}
                  title="Bookmark"
                >
                  <Bookmark size={16} fill={isSaved(heroMovie.id) ? '#e50914' : 'none'} color={isSaved(heroMovie.id) ? '#e50914' : '#fff'} />
                </button>

                <button
                  className="nf-action-btn"
                  onClick={(e) => handleShare(heroMovie, e)}
                  title="Share"
                >
                  {copiedId === heroMovie.id ? <Check size={16} color="#4ade80" /> : <Share2 size={16} />}
                </button>

                <button
                  className="nf-action-btn"
                  onClick={() => navigate(moviePath(heroMovie.id, heroMovie.title))}
                  title="Comments"
                >
                  <MessageSquare size={16} />
                </button>
              </div>
            </div>

            {/* Play Button Overlay */}
            <Link
              to={`/cinema?vd=${heroMovie.id}`}
              className="nf-hero-play-btn"
              title={`Play ${heroMovie.title}`}
            >
              <div className="nf-play-circle">
                <Play size={28} fill="#fff" color="#fff" style={{ marginLeft: '4px' }} />
              </div>
            </Link>
          </div>
        )}

        {/* TRENDING NOW SIDEBAR */}
        <div className="nf-trending-sidebar">
          <div className="nf-sidebar-header">
            <TrendingUp size={18} color="#e50914" />
            <h3 className="nf-sidebar-title">Trending Now</h3>
          </div>

          <div className="nf-trending-list">
            {sidebarTrending.map((item) => (
              <Link
                key={item.id}
                to={moviePath(item.id, item.title)}
                className="nf-trending-item"
              >
                <img src={item.poster} alt={item.title} className="nf-trending-thumb" />
                <div className="nf-trending-info">
                  <h4 className="nf-trending-item-title">{item.title}</h4>
                  <div className="nf-trending-tags">
                    <span>{item.year || '2025'}</span>
                    <span>{item.genre || 'Action'}</span>
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
         (Left: Large Poster Card | Middle: Content Cards | Right: Upcoming Release)
      ════════════════════════════════════════════════════════════ */}
      <div className="nf-grid-layout">

        {/* ── LEFT COLUMN: Large Vertical Poster Card ── */}
        {gridItems[0] && (
          <div className="nf-card nf-card-large">
            <div className="nf-card-media-wrap">
              <img src={gridItems[0].poster || gridItems[0].backdrop} alt={gridItems[0].title} className="nf-card-img" />
              <span className="nf-badge-label review">Review</span>
            </div>
            <div className="nf-card-body">
              <h3 className="nf-card-title">{gridItems[0].title}</h3>
              <div className="nf-card-meta">
                <span>{gridItems[0].year}</span>
                <span>{gridItems[0].genre}</span>
                <span>{gridItems[0].type === 'series' ? 'TV Series' : 'Movie'}</span>
              </div>
              <p className="nf-card-snippet">{gridItems[0].description}</p>
              
              <div className="nf-card-footer">
                <div className="nf-rating-pill">
                  <Star size={14} fill="#ffc107" color="#ffc107" />
                  <span>{(gridItems[0].rating || 8.5).toFixed(1)}/10</span>
                </div>
                <div className="nf-card-btn-group">
                  <button
                    className={`nf-icon-btn ${isSaved(gridItems[0].id) ? 'saved' : ''}`}
                    onClick={(e) => handleToggleBookmark(gridItems[0].id, e)}
                  >
                    <Bookmark size={15} fill={isSaved(gridItems[0].id) ? '#e50914' : 'none'} color={isSaved(gridItems[0].id) ? '#e50914' : '#aaa'} />
                  </button>
                  <button
                    className="nf-icon-btn"
                    onClick={(e) => handleShare(gridItems[0], e)}
                  >
                    {copiedId === gridItems[0].id ? <Check size={15} color="#4ade80" /> : <Share2 size={15} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MIDDLE COLUMN: 2 Square / Medium Cards ── */}
        <div className="nf-middle-col">

          {/* Card 2: Square / News Badge */}
          {gridItems[1] && (
            <div className="nf-card nf-card-medium">
              <div className="nf-card-media-wrap square">
                <img src={gridItems[1].backdrop || gridItems[1].poster} alt={gridItems[1].title} className="nf-card-img" />
                <span className="nf-badge-label news">News</span>
              </div>
              <div className="nf-card-body">
                <h3 className="nf-card-title">{gridItems[1].title}</h3>
                <div className="nf-card-meta">
                  <span>{gridItems[1].year}</span>
                  <span>{gridItems[1].genre}</span>
                </div>
                <p className="nf-card-snippet">{gridItems[1].description}</p>
              </div>
            </div>
          )}

          {/* Card 3: Trailer Badge */}
          {gridItems[2] && (
            <div className="nf-card nf-card-medium">
              <div className="nf-card-media-wrap">
                <img src={gridItems[2].backdrop || gridItems[2].poster} alt={gridItems[2].title} className="nf-card-img" />
                <span className="nf-badge-label trailer">Trailer</span>
              </div>
              <div className="nf-card-body">
                <h3 className="nf-card-title">{gridItems[2].title}</h3>
                <div className="nf-card-meta">
                  <span>{gridItems[2].year}</span>
                  <span>{gridItems[2].genre}</span>
                </div>
                <p className="nf-card-snippet">{gridItems[2].description}</p>
                <div className="nf-card-footer">
                  <div className="nf-rating-pill">
                    <Star size={14} fill="#ffc107" color="#ffc107" />
                    <span>{(gridItems[2].rating || 8.0).toFixed(1)}/10</span>
                  </div>
                  <div className="nf-card-btn-group">
                    <button
                      className={`nf-icon-btn ${isSaved(gridItems[2].id) ? 'saved' : ''}`}
                      onClick={(e) => handleToggleBookmark(gridItems[2].id, e)}
                    >
                      <Bookmark size={15} fill={isSaved(gridItems[2].id) ? '#e50914' : 'none'} color={isSaved(gridItems[2].id) ? '#e50914' : '#aaa'} />
                    </button>
                    <button
                      className="nf-icon-btn"
                      onClick={(e) => handleShare(gridItems[2], e)}
                    >
                      {copiedId === gridItems[2].id ? <Check size={15} color="#4ade80" /> : <Share2 size={15} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── RIGHT COLUMN: Upcoming Releases Widget Card ── */}
        <div className="nf-right-col">
          <div className="nf-upcoming-widget">
            <div className="nf-sidebar-header">
              <Calendar size={18} color="#e50914" />
              <h3 className="nf-sidebar-title">Upcoming Releases</h3>
            </div>

            {upcomingWidgetMovie && (
              <div className="nf-card nf-card-widget">
                <div className="nf-card-media-wrap widget">
                  <img src={upcomingWidgetMovie.backdrop || upcomingWidgetMovie.poster} alt={upcomingWidgetMovie.title} className="nf-card-img" />
                </div>
                <div className="nf-card-body">
                  <h3 className="nf-card-title">{upcomingWidgetMovie.title}</h3>
                  <div className="nf-card-meta">
                    <span>{upcomingWidgetMovie.year || '2026'}</span>
                    <span>{upcomingWidgetMovie.genre}</span>
                  </div>
                  <p className="nf-card-snippet">{upcomingWidgetMovie.description}</p>
                  
                  <div className="nf-card-footer">
                    <div className="nf-rating-pill">
                      <Star size={14} fill="#ffc107" color="#ffc107" />
                      <span>{(upcomingWidgetMovie.rating || 8.7).toFixed(1)}/10</span>
                    </div>
                    <div className="nf-card-btn-group">
                      <button
                        className={`nf-icon-btn ${isSaved(upcomingWidgetMovie.id) ? 'saved' : ''}`}
                        onClick={(e) => handleToggleBookmark(upcomingWidgetMovie.id, e)}
                      >
                        <Bookmark size={15} fill={isSaved(upcomingWidgetMovie.id) ? '#e50914' : 'none'} color={isSaved(upcomingWidgetMovie.id) ? '#e50914' : '#aaa'} />
                      </button>
                      <button
                        className="nf-icon-btn"
                        onClick={(e) => handleShare(upcomingWidgetMovie, e)}
                      >
                        {copiedId === upcomingWidgetMovie.id ? <Check size={15} color="#4ade80" /> : <Share2 size={15} />}
                      </button>
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
