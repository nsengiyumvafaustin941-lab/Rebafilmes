import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Info } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { moviePath } from '../utils/tmdb';
import './HeroBanner.css';

const HeroBanner = ({ items }) => {
  const { t } = useLanguage();
  const [idx, setIdx] = useState(0);
  const featured = items.filter(i => i.featured);
  const item = featured[idx] || items[0];

  useEffect(() => {
    if (featured.length < 2) return;
    const intervalId = setInterval(() => setIdx(i => (i + 1) % featured.length), 7000);
    return () => clearInterval(intervalId);
  }, [featured.length]);

  if (!item) return null;

  return (
    <div className="hero" style={{ '--bg': `url(${item.backdrop})` }}>
      <div className="hero-bg" />
      <div className="hero-overlay" />
      <div className="hero-content">
        <div className="hero-badges">
          <span className="badge badge-accent">{item.badge}</span>
          <span className="badge badge-dark">{item.genre}</span>
          <span className="badge badge-dark">{item.year}</span>
          {item.type === 'series' && <span className="badge badge-dark">Serie</span>}
        </div>
        <h1 className="hero-title">{item.title}</h1>
        <p className="hero-desc">{item.description}</p>
        <div className="hero-actions">
          <Link to={`/cinema?vd=${item.id}`} className="btn btn-primary">
            <Play size={17} fill="currentColor" /> {t('movie_watch')}
          </Link>
          <Link to={moviePath(item.id, item.title)} className="btn btn-ghost">
            <Info size={17} /> {t('movie_description')}
          </Link>
        </div>
      </div>
      {featured.length > 1 && (
        <div className="hero-dots">
          {featured.map((_, i) => (
            <button key={i} className={`dot${i === idx ? ' active' : ''}`} onClick={() => setIdx(i)} />
          ))}
        </div>
      )}
    </div>
  );
};

export default HeroBanner;
