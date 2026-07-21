import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getTrending, getTopRated, getPopular, getPopularTv, getTopRatedTv, getMovie } from '../utils/tmdb';
import { api } from '../utils/api';

const MoviesContext = createContext();

const ADMIN_MOVIES_KEY = 'rebafilme_admin_movies';
const CURATED_KEY = 'rebafilme_curated';

function applyCurated(movies, curated) {
  if (!curated || !Object.keys(curated).length) return movies;
  return movies.map((m) => {
    const patch = curated[m.id];
    return patch ? { ...m, ...patch, curated: true } : m;
  });
}

export const MoviesProvider = ({ children }) => {
  const [allMovies, setAllMovies] = useState([]);
  const [curatedMap, setCuratedMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const moviesRef = useRef([]);

  useEffect(() => {
    moviesRef.current = allMovies;
  }, [allMovies]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const curated = await api.get(CURATED_KEY, {});
        setCuratedMap(curated);

        // Fetch from 5 diverse TMDB sources in parallel for a mixed catalogue
        const [
          trend1, trend2,       // This week's trending (movies + TV mixed)
          topRated1, topRated2, // All-time top rated movies (classics + modern)
          popular1,             // Popular movies of all time
          popularTv1,           // Popular TV shows
          topRatedTv1,          // Top-rated TV shows
        ] = await Promise.allSettled([
          getTrending(1),
          getTrending(2),
          getTopRated(1),
          getTopRated(2),
          getPopular(1),
          getPopularTv(1),
          getTopRatedTv(1),
        ]);

        // Collect successful results
        const sources = [trend1, trend2, topRated1, topRated2, popular1, popularTv1, topRatedTv1]
          .filter((r) => r.status === 'fulfilled')
          .map((r) => r.value);

        // Interleave sources so home page shows variety (not all trending first)
        const merged = [];
        const seen = new Set();
        const maxLen = Math.max(...sources.map((s) => s.length));
        for (let i = 0; i < maxLen; i++) {
          for (const src of sources) {
            if (i < src.length) {
              const m = src[i];
              if (!seen.has(m.id)) {
                seen.add(m.id);
                merged.push({ ...m, source: 'tmdb' });
              }
            }
          }
        }

        // Add admin-uploaded movies (always included, not deduplicated away)
        const customMovies = await api.get(ADMIN_MOVIES_KEY, []);
        for (const m of customMovies) {
          if (!seen.has(m.id)) {
            seen.add(m.id);
            merged.push({ ...m, source: 'admin' });
          }
        }

        setAllMovies(applyCurated(merged, curated));
      } catch (err) {
        console.warn('TMDB fetch failed, falling back to admin movies', err);
        setError(err.message);
        const fetchedMovies = await api.get(ADMIN_MOVIES_KEY, []);
        const curated = await api.get(CURATED_KEY, {});
        setCuratedMap(curated);
        setAllMovies(applyCurated(fetchedMovies.map((m) => ({ ...m, source: 'admin' })), curated));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchMovieById = useCallback(async (id) => {
    const numericId = Number(id);
    const cached = moviesRef.current.find((m) => m.id === numericId);
    if (cached?.trailerKey || cached?.videos) return cached;

    try {
      const movie = await getMovie(numericId);
      const withSource = { ...movie, source: 'tmdb', ...curatedMap[numericId] };
      setAllMovies((prev) => {
        const exists = prev.some((m) => m.id === movie.id);
        return exists
          ? prev.map((m) => (m.id === movie.id ? { ...m, ...withSource } : m))
          : [...prev, withSource];
      });
      return withSource;
    } catch (err) {
      console.error('Failed to fetch movie detail', err);
      return cached || null;
    }
  }, [curatedMap]);

  const updateCurated = useCallback(async (id, data) => {
    const nextCurated = { ...curatedMap, [id]: { ...(curatedMap[id] || {}), ...data } };
    setCuratedMap(nextCurated);
    setAllMovies((prev) => prev.map((m) => (m.id === id ? { ...m, ...data, curated: true } : m)));
    await api.set(CURATED_KEY, nextCurated, true);
  }, [curatedMap]);

  const removeCurated = useCallback(async (id) => {
    const nextCurated = { ...curatedMap };
    delete nextCurated[id];
    setCuratedMap(nextCurated);
    setAllMovies((prev) => prev.map((m) => {
      if (m.id !== id) return m;
      const { featured, popular, badge, curated, ...rest } = m;
      return { ...rest, featured: false, popular: false, badge: 'HD' };
    }));
    await api.set(CURATED_KEY, nextCurated, true);
  }, [curatedMap]);

  const isMock = useCallback(() => false, []);

  const addMovie = useCallback((movie) => {
    const newMovie = {
      ...movie,
      id: movie.id || Date.now(),
      source: 'admin',
      createdAt: new Date().toISOString(),
    };
    setAllMovies((prev) => {
      const next = [...prev, newMovie];
      api.set(ADMIN_MOVIES_KEY, next.filter((m) => m.source !== 'tmdb'), true);
      return next;
    });
    return newMovie;
  }, []);

  const updateMovie = useCallback((id, data) => {
    setAllMovies((prev) => {
      const target = prev.find((m) => m.id === id);
      if (target?.source === 'tmdb') return prev;
      const next = prev.map((m) => (m.id === id ? { ...m, ...data } : m));
      api.set(ADMIN_MOVIES_KEY, next.filter((m) => m.source !== 'tmdb'), true);
      return next;
    });
  }, []);

  const deleteMovie = useCallback((id) => {
    setAllMovies((prev) => {
      const target = prev.find((m) => m.id === id);
      if (target?.source === 'tmdb') return prev;
      const next = prev.filter((m) => m.id !== id);
      api.set(ADMIN_MOVIES_KEY, next.filter((m) => m.source !== 'tmdb'), true);
      return next;
    });
  }, []);

  return (
    <MoviesContext.Provider
      value={{
        allMovies,
        adminMovies: allMovies.filter((m) => m.source === 'admin'),
        addMovie,
        updateMovie,
        deleteMovie,
        updateCurated,
        removeCurated,
        curatedMap,
        isMock,
        loading,
        error,
        fetchMovieById,
      }}
    >
      {children}
    </MoviesContext.Provider>
  );
};

export const useMovies = () => useContext(MoviesContext);
