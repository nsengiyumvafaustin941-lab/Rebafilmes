import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { searchMovies } from '../utils/tmdb';
import MovieCard from './MovieCard';
import './ScrollRow.css';

/**
 * CuratedRow — a ScrollRow that resolves TMDB posters at runtime.
 *
 * Props:
 *   title   — section heading
 *   queries — string[] of movie/series titles to search
 */
const CuratedRow = ({ title, queries = [], viewAllTo = '/movies' }) => {
  const rowRef = useRef(null);
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  /* ── Resolve titles via TMDB search (first result for each) ── */
  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      const results = await Promise.allSettled(
        queries.map((q) => searchMovies(q, 1))
      );
      if (cancelled) return;

      const resolved = [];
      const seen = new Set();

      results.forEach((r) => {
        if (r.status === 'fulfilled' && r.value?.length > 0) {
          // Pick the first result that has a poster and isn't a duplicate
          const match = r.value.find((m) => m.poster && !seen.has(m.id));
          if (match) {
            seen.add(match.id);
            resolved.push(match);
          }
        }
      });

      setItems(resolved);
    };

    resolve();
    return () => { cancelled = true; };
  }, [queries]);

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

  if (items.length === 0) return null;

  return (
    <section className="scroll-section">
      <div className="section-header" style={{ padding: '0 1.5rem' }}>
        <h2 className="section-title">{title}</h2>
        <Link to={viewAllTo} className="view-all">{t('see_all')}</Link>
      </div>
      <div className="scroll-wrapper">
        {canScrollLeft && (
          <button className="scroll-arrow left" onClick={() => scroll(-1)}>
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="scroll-row" ref={rowRef} onScroll={checkScroll}>
          {items.map((item) => (
            <div key={item.id} className="scroll-item">
              <MovieCard item={item} />
            </div>
          ))}
        </div>
        {canScrollRight && (
          <button className="scroll-arrow right" onClick={() => scroll(1)}>
            <ChevronRight size={20} />
          </button>
        )}
      </div>
    </section>
  );
};

export default CuratedRow;
