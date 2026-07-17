import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getTrending, getMovie } from '../utils/tmdb';
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

        const pages = await Promise.all([
          getTrending(1),
          getTrending(2),
          getTrending(3),
        ]);
        const merged = [];
        const seen = new Set();
        for (const page of pages) {
          for (const m of page) {
            if (!seen.has(m.id)) {
              seen.add(m.id);
              merged.push({ ...m, source: 'tmdb' });
            }
          }
        }

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
