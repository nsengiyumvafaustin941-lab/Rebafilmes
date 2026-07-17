import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import MovieCard from './MovieCard';
import './ScrollRow.css';

const ScrollRow = ({ title, items, viewAllTo = '/movies' }) => {
  const rowRef = useRef(null);
  const { t } = useLanguage();
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);

  const checkScroll = () => {
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
  };

  React.useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [items]);

  const scroll = (dir) => {
    rowRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  return (
    <section className="scroll-section">
      <div className="section-header" style={{ padding: '0 1.5rem' }}>
        <h2 className="section-title">{title}</h2>
        <Link to={viewAllTo} className="view-all">{t('see_all')}</Link>
      </div>
      <div className="scroll-wrapper">
        {canScrollLeft && (
          <button className="scroll-arrow left" onClick={() => scroll(-1)}><ChevronLeft size={20}/></button>
        )}
        <div className="scroll-row" ref={rowRef} onScroll={checkScroll}>
          {items.map(item => (
            <div key={item.id} className="scroll-item">
              <MovieCard item={item} />
            </div>
          ))}
        </div>
        {canScrollRight && (
          <button className="scroll-arrow right" onClick={() => scroll(1)}><ChevronRight size={20}/></button>
        )}
      </div>
    </section>
  );
};

export default ScrollRow;
