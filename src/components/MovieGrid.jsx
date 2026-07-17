import React from 'react';
import MovieCard from './MovieCard';
import './MovieGrid.css';

const MovieGrid = ({ title, items, viewAllLink = '#' }) => {
  return (
    <section className="movie-section container">
      <div className="section-header">
        <h2 className="section-title">
          <span className="accent-line"></span>
          {title}
        </h2>
        <a href={viewAllLink} className="view-all">View All</a>
      </div>
      
      <div className="movie-grid">
        {items.map(item => (
          <MovieCard key={item.id} movie={item} />
        ))}
      </div>
    </section>
  );
};

export default MovieGrid;
