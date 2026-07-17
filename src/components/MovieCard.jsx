import React from 'react';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { moviePath } from '../utils/tmdb';
import './MovieCard.css';

const MovieCard = ({ item, progress }) => {
  const displayProgress = progress !== undefined ? progress : item._progress;
  return (
  <Link to={moviePath(item.id, item.title)} className="card">
    <div className="card-poster">
      <img src={item.poster} alt={item.title} loading="lazy" />
      <div className="card-overlay">
        <Play size={32} fill="white" className="card-play" />
      </div>
      {item.badge && <span className="card-badge badge badge-accent">{item.badge}</span>}
      {item.type === 'series' && <span className="card-type">Serie</span>}
      {displayProgress !== undefined && (
        <div className="card-progress">
          <div className="card-progress-fill" style={{ width: `${displayProgress}%` }} />
        </div>
      )}
    </div>
    <div className="card-info">
      <p className="card-title">{item.title}</p>
      <p className="card-meta">
        {item.year && <span className="card-year">{item.year}</span>}
      </p>
    </div>
  </Link>
  );
};

export default MovieCard;
