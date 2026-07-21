import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { searchAny } from '../utils/tmdb';
import './UpcomingRow.css';

/**
 * UpcomingRow — Upcoming Calendar section.
 * Resolves each item's poster via TMDB search at runtime (no hardcoded URLs).
 */
const UpcomingRow = ({ title = 'Upcoming Calendar', items = [] }) => {
  const rowRef = useRef(null);
  const [resolved, setResolved] = useState([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  /* ── Resolve real TMDB posters ── */
  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      const results = await Promise.allSettled(
        items.map((item) => searchAny(item.query || item.title, 1))
      );
      if (cancelled) return;

      const withPosters = items.map((item, i) => {
        const r = results[i];
        if (r.status === 'fulfilled' && r.value?.length > 0) {
          const match = r.value.find((m) => m.poster) || r.value[0];
          return { ...item, poster: match.poster || '', tmdbId: match.id };
        }
        return { ...item, poster: '' };
      });

      setResolved(withPosters);
    };

    resolve();
    return () => { cancelled = true; };
  }, [items]);

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
  }, [resolved]);

  const scroll = (dir) => {
    rowRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  const displayItems = resolved.length > 0 ? resolved : items;

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
          {displayItems.map((item) => {
            const dateParts = item.date ? item.date.split(' ') : ['Jul', '21'];
            const month = dateParts[0];
            const day = dateParts[1] || '';

            return (
              <div key={item.id} className="upcoming-card">
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
                  <div className="upcoming-date-badge">
                    <span className="upcoming-date-month">{month}</span>
                    <span className="upcoming-date-day">{day}</span>
                  </div>

                  {/* Bottom-left booked counter */}
                  <div className="upcoming-booked-badge">
                    <span className="upcoming-flame">🔥</span>
                    <span className="upcoming-booked-text">
                      {item.booked?.toLocaleString()} booked
                    </span>
                  </div>
                </div>

                <h3 className="upcoming-card-title">{item.title}</h3>
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
