import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { moviePath } from '../utils/tmdb';
import { useMovies } from '../contexts/MoviesContext';
import './Top10Row.css';

const Top10Row = ({ title = 'Top 10 in RebaFilme Today' }) => {
  const rowRef = useRef(null);
  const { allMovies } = useMovies();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const top10 = useMemo(() => {
    return [...allMovies]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .filter((m) => m.poster && m.rating >= 6)
      .slice(0, 10);
  }, [allMovies]);

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
  }, [top10]);

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

  if (top10.length < 5) return null;

  return (
    <section className="top10-section">
      <div className="section-header" style={{ padding: '0 1.5rem' }}>
        <h2 className="section-title top10-title">
          <Flame size={22} color="var(--accent, #e50914)" />
          <span>{title}</span>
        </h2>
      </div>
      <div className="top10-wrapper">
        {canScrollLeft && (
          <button className="top10-arrow left" onClick={() => scroll(-1)} aria-label="Scroll left">
            <ChevronLeft size={22} />
          </button>
        )}
        <div className="top10-row" ref={rowRef} onScroll={checkScroll}>
          {top10.map((item, idx) => (
            <Link
              key={item.id}
              to={moviePath(item.id, item.title)}
              className="top10-item"
            >
              <span className="top10-number" data-num={idx + 1}>
                {idx + 1}
              </span>
              <div className="top10-poster">
                <img src={item.poster} alt={item.title} loading="lazy" />
                {item.type === 'series' && <span className="top10-type-badge">TV</span>}
              </div>
            </Link>
          ))}
        </div>
        {canScrollRight && (
          <button className="top10-arrow right" onClick={() => scroll(1)} aria-label="Scroll right">
            <ChevronRight size={22} />
          </button>
        )}
      </div>
    </section>
  );
};

export default Top10Row;
