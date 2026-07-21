import React, { useState, useEffect } from 'react';
import { Newspaper, PlayCircle, ExternalLink, Calendar, RefreshCw, MessageSquare, ThumbsUp, Flame, Tv } from 'lucide-react';
import { useHighlights } from '../contexts/HighlightsContext';
import { getTrending, getUpcoming, moviePath } from '../utils/tmdb';
import { NavLink } from 'react-router-dom';
import Footer from '../components/Footer';
import './HighlightsPage.css';

// Pre-defined hot movie debates
const DEFAULT_DEBATES = [
  {
    id: 'deb-1',
    title: 'Is physical media (4K Blu-ray) better than 4K streaming services?',
    category: 'Cinema Tech',
    upvotes: 342,
    commentsCount: 89,
    author: 'CinemaBuff',
    timeAgo: '2 hours ago',
    optionA: 'Physical Media is far superior in bitrate & audio',
    optionB: 'Streaming is more convenient and cheaper',
    votesA: 260,
    votesB: 82,
  },
  {
    id: 'deb-2',
    title: 'Which film represents the pinnacle of Christopher Nolan’s career?',
    category: 'Director Spotlight',
    upvotes: 512,
    commentsCount: 144,
    author: 'FilmNerd2026',
    timeAgo: '5 hours ago',
    optionA: 'Oppenheimer / Interstellar',
    optionB: 'The Dark Knight / Inception',
    votesA: 210,
    votesB: 302,
  },
  {
    id: 'deb-3',
    title: 'Are superhero movies recovering in 2026 or is audience fatigue permanent?',
    category: 'Industry Talk',
    upvotes: 289,
    commentsCount: 76,
    author: 'MarvelVsDC',
    timeAgo: '1 day ago',
    optionA: 'Quality scripts will revive the genre',
    optionB: 'Audiences want original non-franchise stories',
    votesA: 145,
    votesB: 144,
  },
  {
    id: 'deb-4',
    title: 'Subtitles vs Dubbed versions for international & African cinema',
    category: 'Community',
    upvotes: 405,
    commentsCount: 112,
    author: 'RebaFan',
    timeAgo: '2 days ago',
    optionA: 'Subtitles preserve the original voice acting',
    optionB: 'Dubbed (Agasobanuye) makes watching more engaging',
    votesA: 230,
    votesB: 175,
  },
];

const NewsfeedsPage = () => {
  const { highlights } = useHighlights();
  const visibleHighlights = highlights.filter((h) => h.active);

  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [autoShows, setAutoShows] = useState([]);
  const [showsLoading, setShowsLoading] = useState(true);
  const [tab, setTab] = useState('all'); // 'all' | 'news' | 'debates' | 'shows'
  const [debates, setDebates] = useState(DEFAULT_DEBATES);
  const [userVotes, setUserVotes] = useState({});

  /* ── 1. Fetch live movie news automatically via RSS ── */
  useEffect(() => {
    let cancelled = false;
    setNewsLoading(true);

    const FEEDS = [
      'https://screenrant.com/feed/movie-news/',
      'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
    ];

    const fetchNews = async () => {
      for (const feedUrl of FEEDS) {
        try {
          const api = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}&count=12`;
          const res = await fetch(api);
          const data = await res.json();

          if (!cancelled && data.status === 'ok' && data.items?.length > 0) {
            const formatted = data.items.map((item) => ({
              id: item.guid || item.link,
              title: item.title,
              description: item.description?.replace(/<[^>]+>/g, '').slice(0, 140) + '…',
              url: item.link,
              image: item.thumbnail || item.enclosure?.link || '',
              date: item.pubDate ? new Date(item.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
              source: data.feed?.title?.split('-')[0]?.trim() || 'Movie News',
            }));
            setNews(formatted);
            setNewsLoading(false);
            return;
          }
        } catch (e) {
          console.warn('News RSS fetch failed:', e);
        }
      }
      if (!cancelled) setNewsLoading(false);
    };

    fetchNews();
    return () => { cancelled = true; };
  }, []);

  /* ── 2. Fetch automatic movie shows & trailers from TMDB ── */
  useEffect(() => {
    let cancelled = false;
    setShowsLoading(true);

    Promise.all([getTrending(1), getUpcoming(1)])
      .then(([trending, upcoming]) => {
        if (cancelled) return;
        const combined = [...trending, ...upcoming]
          .filter((m, i, self) => m.poster && self.findIndex(t => t.id === m.id) === i)
          .slice(0, 12);
        setAutoShows(combined);
      })
      .catch((err) => console.warn('Shows API failed', err))
      .finally(() => {
        if (!cancelled) setShowsLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const handleVote = (debateId, optionKey) => {
    if (userVotes[debateId]) return;

    setUserVotes((prev) => ({ ...prev, [debateId]: optionKey }));
    setDebates((prev) =>
      prev.map((d) => {
        if (d.id !== debateId) return d;
        return {
          ...d,
          votesA: optionKey === 'A' ? d.votesA + 1 : d.votesA,
          votesB: optionKey === 'B' ? d.votesB + 1 : d.votesB,
          upvotes: d.upvotes + 1,
        };
      })
    );
  };

  const showNews    = tab === 'all' || tab === 'news';
  const showDebates = tab === 'all' || tab === 'debates';
  const showShows   = tab === 'all' || tab === 'shows';

  return (
    <div className="nf-page page">
      {/* Header */}
      <div className="nf-header">
        <div className="nf-header-icon"><Newspaper size={26} /></div>
        <div>
          <h1 className="nf-title">Newsfeeds</h1>
          <p className="nf-subtitle">Movie news, automatic shows & community debates</p>
        </div>
      </div>

      {/* Navigation Tabs (No emojis) */}
      <div className="nf-tabs">
        {[
          { key: 'all',     label: 'All Updates' },
          { key: 'news',    label: 'Movie News' },
          { key: 'debates', label: 'Movie Debates' },
          { key: 'shows',   label: 'Shows & Clips' },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`nf-tab${tab === key ? ' active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Section 1: Movie News (Automatic API Feed) */}
      {showNews && (
        <section className="nf-section">
          <div className="nf-section-header">
            <h2 className="nf-section-title">
              <Newspaper size={18} /> Movie News
              {newsLoading && <RefreshCw size={14} className="nf-spinner" />}
            </h2>
          </div>

          {newsLoading ? (
            <div className="nf-news-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="nf-news-card nf-skeleton" />
              ))}
            </div>
          ) : news.length > 0 ? (
            <div className="nf-news-grid">
              {news.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nf-news-card"
                >
                  {item.image && (
                    <div className="nf-news-img-wrap">
                      <img src={item.image} alt={item.title} className="nf-news-img" loading="lazy" />
                    </div>
                  )}
                  <div className="nf-news-body">
                    <div className="nf-news-meta">
                      <span className="nf-news-source">{item.source}</span>
                      {item.date && (
                        <span className="nf-news-date"><Calendar size={11} /> {item.date}</span>
                      )}
                    </div>
                    <h3 className="nf-news-title">{item.title}</h3>
                    <p className="nf-news-desc">{item.description}</p>
                    <span className="nf-news-link"><ExternalLink size={12} /> Read Full Story</span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="hl-empty">
              <Newspaper size={40} />
              <p>Latest movie news unavailable right now. Try refreshing.</p>
            </div>
          )}
        </section>
      )}

      {/* Section 2: Movie Debates & Discussions */}
      {showDebates && (
        <section className="nf-section">
          <div className="nf-section-header">
            <h2 className="nf-section-title">
              <Flame size={18} style={{ color: '#e50914' }} /> Movie Debates & Discussions
            </h2>
          </div>

          <div className="nf-debates-grid">
            {debates.map((d) => {
              const totalVotes = d.votesA + d.votesB;
              const pctA = totalVotes ? Math.round((d.votesA / totalVotes) * 100) : 50;
              const pctB = 100 - pctA;
              const voted = userVotes[d.id];

              return (
                <article key={d.id} className="nf-debate-card">
                  <div className="nf-debate-top">
                    <span className="nf-debate-badge">{d.category}</span>
                    <span className="nf-debate-meta">{d.timeAgo} • by {d.author}</span>
                  </div>

                  <h3 className="nf-debate-question">{d.title}</h3>

                  <div className="nf-debate-options">
                    <button
                      className={`nf-debate-opt ${voted === 'A' ? 'voted' : ''}`}
                      onClick={() => handleVote(d.id, 'A')}
                    >
                      <span className="opt-label">{d.optionA}</span>
                      <span className="opt-pct">{pctA}%</span>
                    </button>
                    <button
                      className={`nf-debate-opt ${voted === 'B' ? 'voted' : ''}`}
                      onClick={() => handleVote(d.id, 'B')}
                    >
                      <span className="opt-label">{d.optionB}</span>
                      <span className="opt-pct">{pctB}%</span>
                    </button>
                  </div>

                  <div className="nf-debate-bar">
                    <div className="nf-debate-fill-a" style={{ width: `${pctA}%` }} />
                    <div className="nf-debate-fill-b" style={{ width: `${pctB}%` }} />
                  </div>

                  <div className="nf-debate-footer">
                    <span className="nf-debate-stat"><ThumbsUp size={14} /> {d.upvotes} Votes</span>
                    <span className="nf-debate-stat"><MessageSquare size={14} /> {d.commentsCount} Comments</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Section 3: Automatic Movie Shows & Highlights */}
      {showShows && (
        <section className="nf-section">
          <div className="nf-section-header">
            <h2 className="nf-section-title">
              <Tv size={18} /> Shows, Clips & Trailers
            </h2>
          </div>

          {/* Admin Clips (if any) */}
          {visibleHighlights.length > 0 && (
            <div className="hl-grid" style={{ marginBottom: '1.5rem' }}>
              {visibleHighlights.map((h) => (
                <article key={h.id} className="hl-card">
                  <div className="hl-video-wrap">
                    <iframe
                      src={`https://www.youtube.com/embed/${h.videoId}`}
                      title={h.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                      className="hl-iframe"
                    />
                  </div>
                  <div className="hl-card-body">
                    <h2 className="hl-card-title">{h.title}</h2>
                    {h.description && <p className="hl-card-desc">{h.description}</p>}
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Automatic Shows & Trailers from TMDB */}
          {showsLoading ? (
            <div className="nf-shows-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="nf-show-card nf-skeleton" />
              ))}
            </div>
          ) : autoShows.length > 0 ? (
            <div className="nf-shows-grid">
              {autoShows.map((show) => (
                <NavLink
                  key={show.id}
                  to={moviePath(show.id, show.title)}
                  className="nf-show-card"
                >
                  <div className="nf-show-poster-wrap">
                    <img src={show.poster} alt={show.title} className="nf-show-poster" loading="lazy" />
                    <div className="nf-show-play-overlay">
                      <PlayCircle size={36} className="nf-show-play-icon" />
                    </div>
                  </div>
                  <div className="nf-show-info">
                    <span className="nf-show-type">{show.type === 'series' ? 'TV Series' : 'Movie'}</span>
                    <h4 className="nf-show-title">{show.title}</h4>
                    <span className="nf-show-meta">{show.genre} • {show.year}</span>
                  </div>
                </NavLink>
              ))}
            </div>
          ) : null}
        </section>
      )}

      <Footer />
    </div>
  );
};

export default NewsfeedsPage;
