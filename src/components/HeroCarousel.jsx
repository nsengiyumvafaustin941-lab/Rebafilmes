import React, { useState, useEffect } from 'react';
import { PlayCircle, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import './HeroCarousel.css';
import { useMovies } from '../contexts/MoviesContext';

const HeroCarousel = () => {
  const { allMovies } = useMovies();
  const [currentIndex, setCurrentIndex] = useState(0);
  const featuredMovies = allMovies.filter(m => m.featured).slice(0, 4);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === featuredMovies.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);
    return () => clearInterval(timer);
  }, [featuredMovies.length]);

  const nextSlide = () => {
    setCurrentIndex(currentIndex === featuredMovies.length - 1 ? 0 : currentIndex + 1);
  };

  const prevSlide = () => {
    setCurrentIndex(currentIndex === 0 ? featuredMovies.length - 1 : currentIndex - 1);
  };

  if (!featuredMovies || featuredMovies.length === 0) return null;

  return (
    <div className="hero-carousel">
      {featuredMovies.map((movie, index) => (
        <div 
          key={movie.id}
          className={`carousel-slide ${index === currentIndex ? 'active' : ''}`}
          style={{ backgroundImage: `url(${movie.backdrop})` }}
        >
          <div className="carousel-overlay"></div>
          <div className="container carousel-content">
            <div className="badge-container">
              {movie.tags.map(tag => (
                <span key={tag} className="badge">{tag}</span>
              ))}
              <span className="badge genre-badge">{movie.genre}</span>
              <span className="badge year-badge">{movie.year}</span>
            </div>
            
            <h1 className="movie-title">{movie.title}</h1>
            <p className="movie-description">{movie.description}</p>
            
            <div className="action-buttons">
              <button className="btn btn-primary">
                <PlayCircle size={20} /> Watch Now
              </button>
              <button className="btn btn-secondary">
                <Info size={20} /> Details
              </button>
            </div>
          </div>
        </div>
      ))}

      <div className="carousel-controls">
        <button className="control-btn" onClick={prevSlide}>
          <ChevronLeft size={24} />
        </button>
        <button className="control-btn" onClick={nextSlide}>
          <ChevronRight size={24} />
        </button>
      </div>

      <div className="carousel-indicators">
        {featuredMovies.map((_, index) => (
          <button 
            key={index}
            className={`indicator ${index === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(index)}
          ></button>
        ))}
      </div>
    </div>
  );
};

export default HeroCarousel;
