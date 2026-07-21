import React, { useState, useEffect } from 'react';
import { Newspaper, PlayCircle, ExternalLink, Calendar, RefreshCw } from 'lucide-react';
import { useHighlights } from '../contexts/HighlightsContext';
import Footer from '../components/Footer';
import './HighlightsPage.css';

/**
 * NewsfeedsPage — Combines admin-uploaded video highlights with
 * live entertainment news pulled from a public RSS feed.
 */
const NewsfeedsPage = () => {
  const { highlights } = useHighlights();
  const visible = highlights.filter((h) => h.active);

  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [tab, setTab] = useState('all'); // 'all' | 'videos' | 'news'

  /* ── Fetch live movie/entertainment news via RSS-to-JSON ── */
  useEffect(() => {
    const RSS_URL = 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml';
    const API = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}&api_key=public&count=18`;

    setNewsLoading(true);
    fetch(API)
      .then((r) => r.json())
      .then((data) => {
        if (data.status === 'ok') {
          setNews(
            (data.items || []).map((item) => ({
              id: item.guid || item.link,
              title: item.title,
              description: item.description?.replace(/<[^>]+>/g, '').slice(0, 140) + '…',
              url: item.link,
              image: item.thumbnail || item.enclosure?.link || '',
              date: item.pubDate ? new Date(item.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
              source: 'BBC Entertainment',
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setNewsLoading(false));
  }, []);

  const showVideos = tab === 'all' || tab === 'videos';
  const showNews   = tab === 'all' || tab === 'news';

  return (
    <div className="nf-page page">
      {/* Header */}
      <div className="nf-header">
        <div className="nf-header-icon"><Newspaper size={26} /></div>
        <div>
          <h1 className="nf-title">Newsfeeds</h1>
          <p className="nf-subtitle">Latest clips, trailers & entertainment news</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="nf-tabs">
        {[
          { key: 'all',    label: 'All' },
          { key: 'videos', label: '🎬 Videos' },
          { key: 'news',   label: '📰 News' },
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

      {/* Video Highlights */}
      {showVideos && visible.length > 0 && (
        <section className="nf-section">
          <h2 className="nf-section-title"><PlayCircle size={18} /> Video Clips</h2>
          <div className="hl-grid">
            {visible.map((h) => (
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
        </section>
      )}

      {showVideos && visible.length === 0 && tab === 'videos' && (
        <div className="hl-empty">
          <PlayCircle size={48} />
          <p>No video clips yet. Check back soon!</p>
        </div>
      )}

      {/* News Feed */}
      {showNews && (
        <section className="nf-section">
          <h2 className="nf-section-title">
            <Newspaper size={18} /> Entertainment News
            {newsLoading && <RefreshCw size={14} className="nf-spinner" />}
          </h2>
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
                    <span className="nf-news-link"><ExternalLink size={12} /> Read more</span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="hl-empty">
              <Newspaper size={48} />
              <p>Could not load news. Check your connection.</p>
            </div>
          )}
        </section>
      )}

      <Footer />
    </div>
  );
};

export default NewsfeedsPage;
