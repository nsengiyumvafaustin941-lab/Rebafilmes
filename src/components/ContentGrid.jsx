import React from 'react';
import MovieCard from './MovieCard';
import './ContentGrid.css';

const ContentGrid = ({ title, items }) => (
  <section className="content-grid-section">
    {title && (
      <div className="section-header" style={{ padding: '0 1.5rem', marginBottom: '1rem' }}>
        <h2 className="section-title">{title}</h2>
      </div>
    )}
    <div className="content-grid">
      {items.map(item => (
        <MovieCard key={item.id} item={item} />
      ))}
    </div>
  </section>
);

export default ContentGrid;
