import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getUpcoming } from '../utils/tmdb';
import { moviePath } from '../utils/tmdb';
import './UpcomingRow.css';

/**
 * UpcomingRow — Fetches TMDB's real /movie/upcoming endpoint.
 * Shows actual upcoming movies with their real release dates.
 * No hardcoded titles or stale dates.
 */
const UpcomingRow = ({ title = 'Upcoming Calendar' }) => {
  const rowRef = useRef(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  /* ── Fetch live upcoming movies from TMDB ── */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([getUpcoming(1), getUpcoming(2)])
      .then(([page1, page2]) => {
        if (cancelled) return;
        // Deduplicate and sort by release date ascending
        const seen = new Set();
        const all = [...page1, ...page2].filter((m) => {
          if (seen.has(m.id) || !m.poster) return false;
          seen.add(m.id);
          return true;
        });
        all.sort((a, b) => (a.releaseDate || '').localeCompare(b.releaseDate || ''));
        setItems(all.slice(0, 16)); // show up to 16 upcoming movies
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  /* ── Scroll state ── */
  const checkScroll = () => {
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [items]);

  const scroll = (dir) => {
    rowRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  /* ── Format release date → "Jul 23" style ── */
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatMonth = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  };

  const formatDay = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    return d.getDate();
  };

  if (loading) {
    return (
      <section className="upcoming-section">
        <div className="upcoming-header">
          <h2 className="upcoming-title">{title}</h2>
        </div>
        <div className="upcoming-row" style={{ padding: '0 1.5rem', gap: '0.75rem', display: 'flex' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="upcoming-card" style={{ opacity: 0.4 }}>
              <div className="upcoming-poster-placeholder">
                <span>…</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!items.length) return null;

  return (
    <section className="upcoming-section">
      <div className="upcoming-header">
        <h2 className="upcoming-title">{title}</h2>
      </div>
      <div className="upcoming-wrapper">
        {canScrollLeft && (
          <button className="upcoming-arrow left" onClick={() => scroll(-1)} aria-label="Scroll left">
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="upcoming-row" ref={rowRef} onScroll={checkScroll}>
          {items.map((item) => (
            <Link
              key={item.id}
              to={moviePath(item.id, item.title)}
              className="upcoming-card"
              style={{ textDecoration: 'none' }}
            >
              <div className="upcoming-poster-wrapper">
                {item.poster ? (
                  <img
                    src={item.poster}
                    alt={item.title}
                    className="upcoming-poster"
                    loading="lazy"
                  />
                ) : (
                  <div className="upcoming-poster-placeholder">
                    <span>{item.title?.charAt(0) || '?'}</span>
                  </div>
                )}

                {/* Top-left cyan date badge */}
                {item.releaseDate && (
                  <div className="upcoming-date-badge">
                    <span className="upcoming-date-month">{formatMonth(item.releaseDate)}</span>
                    <span className="upcoming-date-day">{formatDay(item.releaseDate)}</span>
                  </div>
                )}

                {/* Bottom-left popularity badge (replaces fake "booked" count) */}
                {item.rating > 0 && (
                  <div className="upcoming-booked-badge">
                    <span className="upcoming-flame">⭐</span>
                    <span className="upcoming-booked-text">
                      {item.rating.toFixed(1)} / 10
                    </span>
                  </div>
                )}
              </div>

              <h3 className="upcoming-card-title">{item.title}</h3>
            </Link>
          ))}
        </div>
        {canScrollRight && (
          <button className="upcoming-arrow right" onClick={() => scroll(1)} aria-label="Scroll right">
            <ChevronRight size={20} />
          </button>
        )}
      </div>
    </section>
  );
};

export default UpcomingRow;
