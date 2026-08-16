import React, { useMemo, useState } from 'react';
import HeroBanner from '../components/HeroBanner';
import ScrollRow from '../components/ScrollRow';
import CuratedRow from '../components/CuratedRow';
import ContentGrid from '../components/ContentGrid';
import AdBanner from '../components/AdBanner';
import Footer from '../components/Footer';
import { useMovies } from '../contexts/MoviesContext';
import { useLanguage } from '../contexts/LanguageContext';
import { TMDB_GENRES } from '../utils/tmdb';

/* ─── Curated Movie Collections ─── */
const MOVIE_COLLECTIONS = [
  {
    title: 'Adrenaline Rush',
    queries: [
      'Extraction',
      'John Wick',
      'Top Gun Maverick',
      'Fast X',
      'Mad Max Fury Road',
      'The Gray Man',
      'Nobody',
      'Bullet Train',
      'Mission Impossible Dead Reckoning',
      'The Beekeeper',
      'Atomic Blonde',
      'The Equalizer 3',
      'Baby Driver',
      'Speed',
      'Gladiator',
      'The Raid',
      'Twisters',
      'Bad Boys Ride or Die',
      'Monkey Man',
      'Kill',
    ],
  },
  {
    title: 'Mind-Bending Sci-Fi',
    queries: [
      'Inception',
      'Interstellar',
      'Dune Part Two',
      'The Matrix',
      'Arrival',
      'Ex Machina',
      'Annihilation',
      'Tenet',
      'Blade Runner 2049',
      'Edge of Tomorrow',
      'Coherence',
      'Source Code',
      'Minority Report',
      'Looper',
      'Predestination',
      'The Prestige',
      'Everything Everywhere All at Once',
      'District 9',
      'Contact',
      'The Creator',
    ],
  },
  {
    title: 'Date Night & Rom-Coms',
    queries: [
      'Anyone But You',
      'The Idea of You',
      'Crazy Rich Asians',
      'To All the Boys Ive Loved Before',
      'Set It Up',
      'Always Be My Maybe',
      'La La Land',
      'About Time',
      'The Proposal',
      'Palm Springs',
      'Crazy Stupid Love',
      'How to Lose a Guy in 10 Days',
      '10 Things I Hate About You',
      'Notting Hill',
      '500 Days of Summer',
      'The Notebook',
      'The Fault in Our Stars',
      'Love Actually',
      'Fly Me to the Moon',
      'No Hard Feelings',
    ],
  },
  {
    title: 'Critically Acclaimed',
    queries: [
      'Oppenheimer',
      'Parasite',
      'Everything Everywhere All At Once',
      'The Shawshank Redemption',
      'Schindlers List',
      'Whiplash',
      'Moonlight',
      'The Godfather',
      'Pulp Fiction',
      'Fight Club',
      'Forrest Gump',
      'The Dark Knight',
      'GoodFellas',
      'Spirited Away',
      'No Country for Old Men',
      'There Will Be Blood',
      '12 Angry Men',
      'Taxi Driver',
      'Poor Things',
      'Killers of the Flower Moon',
    ],
  },
];

const MoviesPage = () => {
  const { t } = useLanguage();
  const { allMovies } = useMovies();
  const [activeGenre, setActiveGenre] = useState(null);

  const movies = useMemo(() => allMovies.filter(m => m.type === 'movie'), [allMovies]);

  // Apply genre filter if active
  const displayMovies = useMemo(() => {
    if (!activeGenre) return movies;
    const genreName = TMDB_GENRES.find(g => g.id === activeGenre)?.name?.toLowerCase();
    if (!genreName) return movies;
    return movies.filter(m => (m.genre || '').toLowerCase().includes(genreName));
  }, [movies, activeGenre]);

  // Derive rows
  const latest = useMemo(() => [...displayMovies].sort((a, b) => b.year - a.year).slice(0, 24), [displayMovies]);
  const recentlyAdded = useMemo(() => [...displayMovies].sort((a, b) => b.id - a.id).slice(0, 24), [displayMovies]);
  const popularF = useMemo(() => displayMovies.filter(m => m.popular).slice(0, 24), [displayMovies]);
  const featured = useMemo(() => movies.filter(m => m.featured || m.popular), [movies]);
  const topRated = useMemo(() => [...displayMovies].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 24), [displayMovies]);

  return (
    <div className="movies-page page">
      <div className="bg-logo-pattern" />
      <HeroBanner items={featured.length ? featured : movies} />
      <AdBanner position="home_top" />

      {/* ── Sticky Genre Filter Bar ── */}
      <div className="genre-sticky-bar">
        <button
          className={`genre-sticky-chip ${!activeGenre ? 'active' : ''}`}
          onClick={() => setActiveGenre(null)}
        >
          All
        </button>
        {TMDB_GENRES.filter(g => g.id < 10700).map((g) => (
          <button
            key={g.id}
            className={`genre-sticky-chip ${activeGenre === g.id ? 'active' : ''}`}
            onClick={() => setActiveGenre(activeGenre === g.id ? null : g.id)}
          >
            {g.name}
          </button>
        ))}
      </div>

      {recentlyAdded.length > 0 && (
        <ScrollRow title={t('btn_recently_added')} items={recentlyAdded} />
      )}

      {topRated.length > 0 && (
        <ScrollRow title="Top Rated Movies" items={topRated} />
      )}

      {latest.length > 0 && (
        <ScrollRow title={t('btn_latest')} items={latest} />
      )}

      {/* Curated Mood/Collection Rows (only when no genre filter) */}
      {!activeGenre && (
        <>
          {MOVIE_COLLECTIONS.map((col) => (
            <CuratedRow
              key={col.title}
              title={col.title}
              queries={col.queries}
              viewAllTo="/search"
            />
          ))}
        </>
      )}

      <AdBanner position="home_mid" />

      {popularF.length > 0 && (
        <ScrollRow title={t('btn_popular')} items={popularF} />
      )}

      {displayMovies.length > 0 && (
        <ContentGrid title={activeGenre ? `${TMDB_GENRES.find(g => g.id === activeGenre)?.name || ''} Movies` : 'All Movies'} items={displayMovies} />
      )}

      <Footer />
    </div>
  );
};

export default MoviesPage;
