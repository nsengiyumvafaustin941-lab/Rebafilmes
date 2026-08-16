import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Star, Clock } from 'lucide-react';
import { moviePath } from '../utils/tmdb';
import './SearchListItem.css';

const SearchListItem = ({ item }) => {
  const ratingDisplay = item.rating > 0 ? Number(item.rating).toFixed(1) : null;

  return (
    <div className="list-item">
      <Link to={moviePath(item.id, item.title)} className="list-item-backdrop-wrap">
        <img
          src={item.backdrop || item.poster}
          alt={item.title}
          className="list-item-backdrop"
          loading="lazy"
        />
        <div className="list-item-play-overlay">
          <Play size={28} fill="#fff" />
        </div>
      </Link>

      <div className="list-item-info">
        <Link to={moviePath(item.id, item.title)} className="list-item-title">
          {item.title}
        </Link>

        <div className="list-item-meta-row">
          {item.year && <span className="list-item-year">{item.year}</span>}
          {item.genre && <span className="list-item-genre">{item.genre}</span>}
          {item.type === 'series' && <span className="list-item-type-badge">TV Series</span>}
          {ratingDisplay && (
            <span className="list-item-rating">
              <Star size={12} fill="#ffb400" stroke="#ffb400" />
              {ratingDisplay}
            </span>
          )}
          {item.runtime && (
            <span className="list-item-runtime">
              <Clock size={11} /> {item.runtime}m
            </span>
          )}
        </div>

        {item.description && (
          <p className="list-item-desc">{item.description}</p>
        )}

        <div className="list-item-actions">
          <Link to={`/cinema?vd=${item.id}`} className="list-item-stream-btn">
            <Play size={14} fill="currentColor" /> Stream Now
          </Link>
          <Link to={moviePath(item.id, item.title)} className="list-item-detail-btn">
            Details
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SearchListItem;
