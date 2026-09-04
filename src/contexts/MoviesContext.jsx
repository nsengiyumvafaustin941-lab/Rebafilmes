import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getTrending, getTopRated, getPopular, getPopularTv, getTopRatedTv, getMovieOrTv, parseMovieId } from '../utils/tmdb';
import { api } from '../utils/api';
import { ALL_CONTENT } from '../data/mockData';

const MoviesContext = createContext();

const ADMIN_MOVIES_KEY = 'rebafilme_admin_movies';
const CURATED_KEY = 'rebafilme_curated';
const CATALOG_SNAPSHOT_KEY = 'rebafilme_catalog_snapshot_v1';

function saveCatalogSnapshot(movies) {
  if (!Array.isArray(movies) || movies.length === 0) return;
  try {
    // Only cache essential fields to prevent localStorage overflow
    const compact = movies.slice(0, 80).map((m) => ({
      id: m.id,
      tmdbId: m.tmdbId || m.id,
      title: m.title,
      type: m.type || 'movie',
      genre: m.genre || 'Action',
      year: m.year,
      rating: m.rating,
      poster: m.poster,
      backdrop: m.backdrop,
      description: m.description,
      badge: m.badge,
      featured: m.featured,
      popular: m.popular,
      source: m.source || 'snapshot',
      seasons: m.seasons,
      episodes: m.episodes,
      videoUrl: m.videoUrl,
      trailerKey: m.trailerKey,
    }));
    localStorage.setItem(CATALOG_SNAPSHOT_KEY, JSON.stringify(compact));
  } catch (e) {
    console.warn('[MoviesContext] Snapshot write error:', e);
  }
}

function loadCatalogSnapshot() {
  try {
    const raw = localStorage.getItem(CATALOG_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function getAutonomousSeedCatalog() {
  if (Array.isArray(ALL_CONTENT) && ALL_CONTENT.length > 0) {
    return ALL_CONTENT.map((m) => ({
      ...m,
      source: 'seed',
    }));
  }
  return [];
}

function applyCurated(movies, curated) {
  if (!Array.isArray(movies)) return [];
  if (!curated || !Object.keys(curated).length) return movies;
  return movies.map((m) => {
    const patch = curated[m?.id];
    return patch ? { ...m, ...patch, curated: true } : m;
  });
}

export const MoviesProvider = ({ children }) => {
  const [allMovies, setAllMovies] = useState([]);
  const [curatedMap, setCuratedMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const moviesRef = useRef([]);

  useEffect(() => {
    moviesRef.current = allMovies;
  }, [allMovies]);

  const fetchData = useCallback(async (isSilentRevalidate = false) => {
    if (!isSilentRevalidate) {
      setLoading(true);
    }
    setError(null);
    try {
      const curated = await api.get(CURATED_KEY, {});
      const safeCurated = curated && typeof curated === 'object' && !Array.isArray(curated) ? curated : {};
      setCuratedMap(safeCurated);

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

      // Collect successful results and ensure only valid arrays
      const sources = [trend1, trend2, topRated1, topRated2, popular1, popularTv1, topRatedTv1]
        .filter((r) => r.status === 'fulfilled' && Array.isArray(r.value))
        .map((r) => r.value);

      // Interleave sources so home page shows variety (not all trending first)
      const merged = [];
      const seen = new Set();
      const maxLen = sources.length > 0 ? Math.max(...sources.map((s) => s.length)) : 0;
      for (let i = 0; i < maxLen; i++) {
        for (const src of sources) {
          if (i < src.length) {
            const m = src[i];
            if (m && m.id && !seen.has(m.id)) {
              seen.add(m.id);
              merged.push({ ...m, source: 'tmdb' });
            }
          }
        }
      }

      // Add admin-uploaded movies (always included, not deduplicated away)
      const customMovies = await api.get(ADMIN_MOVIES_KEY, []);
      if (Array.isArray(customMovies)) {
        for (const m of customMovies) {
          if (m && m.id && !seen.has(m.id)) {
            seen.add(m.id);
            merged.push({ ...m, source: 'admin' });
          }
        }
      }

      // If we got valid merged results, apply curated and save snapshot
      if (merged.length > 0) {
        const finalMovies = applyCurated(merged, safeCurated);
        setAllMovies(finalMovies);
        saveCatalogSnapshot(finalMovies);
        setIsOfflineFallback(false);
        setLastSyncedAt(new Date().toISOString());
        return;
      }

      // If online fetch produced 0 items, engage autonomous fallback
      throw new Error('Online catalog returned 0 items');
    } catch (err) {
      console.warn('[MoviesContext] Online fetch failed, engaging autonomous fallback:', err);
      setError(err.message);

      // 1. Try admin movies from KV
      const fetchedMovies = await api.get(ADMIN_MOVIES_KEY, []).catch(() => []);
      const curated = await api.get(CURATED_KEY, {}).catch(() => ({}));
      const safeCurated = curated && typeof curated === 'object' && !Array.isArray(curated) ? curated : {};
      setCuratedMap(safeCurated);

      if (Array.isArray(fetchedMovies) && fetchedMovies.length > 0) {
        setAllMovies(applyCurated(fetchedMovies.map((m) => ({ ...m, source: 'admin' })), safeCurated));
        setIsOfflineFallback(true);
        return;
      }

      // 2. Try persistent localStorage snapshot
      const cachedSnapshot = loadCatalogSnapshot();
      if (cachedSnapshot && cachedSnapshot.length > 0) {
        setAllMovies(applyCurated(cachedSnapshot, safeCurated));
        setIsOfflineFallback(true);
        return;
      }

      // 3. Guaranteed zero-empty autonomous seed fallback
      const seedData = getAutonomousSeedCatalog();
      setAllMovies(applyCurated(seedData, safeCurated));
      setIsOfflineFallback(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-revalidate when browser comes back online
    const handleOnline = () => {
      fetchData(true);
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [fetchData]);

  const fetchMovieById = useCallback(async (id, hintedType = null) => {
    const numericId = parseMovieId(id) || Number(id);
    const cached = moviesRef.current.find((m) => {
      if (m.id !== numericId) return false;
      if (!hintedType) return true;
      const isTv = m.type === 'series' || m.type === 'tv';
      const targetIsTv = hintedType === 'series' || hintedType === 'tv';
      return isTv === targetIsTv;
    });

    if (cached) {
      const isTv = cached.type === 'series' || cached.type === 'tv';
      if (!isTv && (cached.trailerKey || cached.videos)) return cached;
      if (isTv && cached.seasons && cached.seasons.length > 0) return cached;
    }

    try {
      const movie = await getMovieOrTv(id, hintedType || cached?.type);
      if (!movie) return cached || null;
      const withSource = { ...movie, source: 'tmdb', ...curatedMap[numericId] };
      setAllMovies((prev) => {
        const exists = prev.some((m) => m.id === movie.id && (m.type || 'movie') === (movie.type || 'movie'));
        return exists
          ? prev.map((m) => (m.id === movie.id && (m.type || 'movie') === (movie.type || 'movie') ? { ...m, ...withSource } : m))
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
      const { featured: _featured, popular: _popular, badge: _badge, curated: _curated, ...rest } = m;
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
        isOfflineFallback,
        lastSyncedAt,
        refetchCatalog: fetchData,
        fetchMovieById,
      }}
    >
      {children}
    </MoviesContext.Provider>
  );
};

export const useMovies = () => useContext(MoviesContext);
