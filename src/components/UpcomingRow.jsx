import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, Star, Calendar } from 'lucide-react';
import { getUpcoming, moviePath } from '../utils/tmdb';
import './UpcomingRow.css';

/**
 * UpcomingRow — Fetches live upcoming movies from TMDB with standardized card structure
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
        const seen = new Set();
        const all = [...page1, ...page2].filter((m) => {
          if (seen.has(m.id) || !m.poster) return false;
          seen.add(m.id);
          return true;
        });
        all.sort((a, b) => (a.releaseDate || '').localeCompare(b.releaseDate || ''));
        setItems(all.slice(0, 18));
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Scroll state & handlers ── */
  const checkScroll = () => {
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [items]);

  const scroll = (dir) => {
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    const step = Math.max(clientWidth * 0.82, 300);

    if (dir === 1 && Math.ceil(scrollLeft + clientWidth) >= scrollWidth - 10) {
      rowRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    } else if (dir === -1 && scrollLeft <= 10) {
      rowRef.current.scrollTo({ left: scrollWidth, behavior: 'smooth' });
    } else {
      rowRef.current.scrollBy({ left: dir * step, behavior: 'smooth' });
    }
  };

  const formatMonth = (dateStr) => {
    if (!dateStr) return 'UP';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'UP';
    return d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  };

  const formatDay = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.getDate();
  };

  if (loading) {
    return (
      <section className="upcoming-section">
        <div className="section-header" style={{ padding: '0 1.5rem' }}>
          <h2 className="section-title">
            <Calendar size={18} color="var(--accent, #e50914)" />
            <span>{title}</span>
          </h2>
        </div>
        <div className="upcoming-row">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="scroll-item" style={{ opacity: 0.35 }}>
              <div className="card-poster" style={{ background: '#151620' }} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!items.length) return null;

  return (
    <section className="upcoming-section">
      <div className="section-header" style={{ padding: '0 1.5rem' }}>
        <h2 className="section-title">
          <Calendar size={18} color="var(--accent, #e50914)" />
          <span>{title}</span>
        </h2>
      </div>

      <div className="upcoming-wrapper">
        {canScrollLeft && (
          <button className="upcoming-arrow left" onClick={() => scroll(-1)} aria-label="Scroll left">
            <ChevronLeft size={20} />
          </button>
        )}

        <div className="upcoming-row" ref={rowRef} onScroll={checkScroll}>
          {items.map((item) => {
            const ratingDisplay = item.rating > 0 ? Number(item.rating).toFixed(1) : null;

            return (
              <div key={item.id} className="scroll-item upcoming-item">
                <Link to={moviePath(item.id, item.title)} className="card upcoming-card">
                  <div className="card-poster">
                    <img src={item.poster} alt={item.title} loading="lazy" />
                    <div className="card-overlay">
                      <Play size={32} fill="white" className="card-play" />
                    </div>

                    {/* Top-left Calendar Date Badge */}
                    {item.releaseDate && (
                      <div className="upcoming-date-badge">
                        <span className="upcoming-date-month">{formatMonth(item.releaseDate)}</span>
                        <span className="upcoming-date-day">{formatDay(item.releaseDate)}</span>
                      </div>
                    )}

                    {/* Rating badge on hover */}
                    {ratingDisplay && (
                      <span className="card-rating">
                        <Star size={10} fill="#ffb400" stroke="#ffb400" />
                        {ratingDisplay}
                      </span>
                    )}

                    <span className="card-badge badge badge-accent">Upcoming</span>
                  </div>

                  <div className="card-info">
                    <p className="card-title">{item.title}</p>
                    <p className="card-meta">
                      <span className="card-year">
                        {item.releaseDate ? item.releaseDate.substring(0, 4) : item.year}
                      </span>
                      {item.genre && <span className="card-genre"> • {item.genre}</span>}
                    </p>
                  </div>
                </Link>
              </div>
            );
          })}
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
