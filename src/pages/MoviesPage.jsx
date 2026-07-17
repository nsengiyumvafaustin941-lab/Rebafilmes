import React, { useMemo } from 'react';
import HeroBanner from '../components/HeroBanner';
import ScrollRow from '../components/ScrollRow';
import ContentGrid from '../components/ContentGrid';
import AdBanner from '../components/AdBanner';
import Footer from '../components/Footer';
import { useMovies } from '../contexts/MoviesContext';
import { useLanguage } from '../contexts/LanguageContext';

const MoviesPage = () => {
  const { t } = useLanguage();
  const { allMovies } = useMovies();

  // Filter only items that are of type 'movie'
  const movies = useMemo(() => allMovies.filter(m => m.type === 'movie'), [allMovies]);

  // Derive rows and sections
  const latest = useMemo(() => [...movies].sort((a, b) => b.year - a.year).slice(0, 10), [movies]);
  const recentlyAdded = useMemo(() => [...movies].sort((a, b) => b.id - a.id).slice(0, 10), [movies]);
  const popularF = useMemo(() => movies.filter(m => m.popular), [movies]);
  const featured = useMemo(() => movies.filter(m => m.featured || m.popular), [movies]);
  
  // Categorize by genre for a better exploratory experience
  const actionMovies = useMemo(() => movies.filter(m => (m.genre || '').toLowerCase().includes('action')), [movies]);
  const romanceMovies = useMemo(() => movies.filter(m => (m.genre || '').toLowerCase().includes('romance')), [movies]);
  const dramaMovies = useMemo(() => movies.filter(m => (m.genre || '').toLowerCase().includes('drama')), [movies]);

  return (
    <div className="movies-page page">
      <div className="bg-logo-pattern" />
      <HeroBanner items={featured.length ? featured : movies} />
      <AdBanner position="home_top" />
      
      {recentlyAdded.length > 0 && (
        <ScrollRow title={t('btn_recently_added')} items={recentlyAdded} />
      )}
      
      {latest.length > 0 && (
        <ScrollRow title={t('btn_latest')} items={latest} />
      )}

      {actionMovies.length > 0 && (
        <ScrollRow title="Action Movies" items={actionMovies} />
      )}

      {romanceMovies.length > 0 && (
        <ScrollRow title="Romance Movies" items={romanceMovies} />
      )}
      
      {dramaMovies.length > 0 && (
        <ScrollRow title="Drama Movies" items={dramaMovies} />
      )}
      
      <AdBanner position="home_mid" />
      
      {popularF.length > 0 && (
        <ScrollRow title={t('btn_popular')} items={popularF} />
      )}
      
      {movies.length > 0 && (
        <ContentGrid title="All Movies" items={movies} />
      )}
      
      <Footer />
    </div>
  );
};

export default MoviesPage;
