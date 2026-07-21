const GENRE_MAP = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
};

import { buildDownloadUrl, getSettings } from './settings';

export const DOWNLOAD_BASE = 'https://videodownloader.site';

export function getDownloadUrl(title) {
  if (!title?.trim()) return DOWNLOAD_BASE;
  return buildDownloadUrl(title);
}

export function slugify(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function movieSlug(id, title) {
  return `${slugify(title)}-${id}`;
}

export function moviePath(id, title) {
  return `/movie/${movieSlug(id, title)}`;
}

export function parseMovieId(slug) {
  if (!slug) return null;
  const match = String(slug).match(/(?:^|-)(\d+)$/);
  return match ? Number(match[1]) : Number(slug);
}

export function mapGenreIds(ids = []) {
  return ids.map((id) => GENRE_MAP[id] || 'Action').filter(Boolean);
}

export function getTrailerKey(movie) {
  if (!movie) return null;
  const videos = movie?.videos?.results?.filter((v) => v.site === 'YouTube') || [];
  const trailer = videos.find((v) => v.type === 'Trailer');
  return trailer?.key || videos[0]?.key || movie?.trailer_youtube_key || movie?.trailerKey || null;
}

export function mapTmdbMovie(m) {
  const year = m.release_date
    ? parseInt(m.release_date.substring(0, 4), 10)
    : m.first_air_date
      ? parseInt(m.first_air_date.substring(0, 4), 10)
      : null;

  const genre = m.genres?.[0]?.name || mapGenreIds(m.genre_ids)[0] || 'Action';

  return {
    id: m.id,
    tmdbId: m.id,
    type: m.media_type === 'tv' ? 'series' : 'movie',
    title: m.title || m.name || 'Untitled',
    description: m.overview || '',
    poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : '',
    backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : '',
    genre,
    country: m.origin_country?.[0] || 'USA',
    year: year || new Date().getFullYear(),
    badge: m.vote_average >= 7.5 ? 'Top' : 'HD',
    featured: (m.popularity || 0) > 50,
    popular: (m.vote_average || 0) >= 7,
    rating: m.vote_average || 0,
    runtime: m.runtime || null,
    trailerKey: getTrailerKey(m),
    videos: m.videos,
    credits: m.credits,
    videoUrl: '',
  };
}

function getClientApiKey() {
  return getSettings().tmdbApiKey || '';
}

async function fetchTmdbDirect(type, params = {}) {
  const apiKey = getClientApiKey();
  if (!apiKey) {
    throw new Error('TMDB API key missing. Add it in Admin → Settings or .dev.vars as TMDB_API_KEY.');
  }

  const tmdbParams = new URLSearchParams({ api_key: apiKey, language: 'en-US' });
  let path = '';

  if (type === 'trending') {
    path = '/trending/movie/week';
    tmdbParams.set('page', params.page || '1');
  } else if (type === 'movie') {
    path = `/movie/${params.id}`;
    tmdbParams.set('append_to_response', 'videos,credits');
  } else if (type === 'search') {
    path = '/search/movie';
    tmdbParams.set('query', params.query || '');
    tmdbParams.set('page', params.page || '1');
  } else {
    throw new Error('Invalid TMDB type');
  }

  const res = await fetch(`https://api.themoviedb.org/3${path}?${tmdbParams}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.status_message || `TMDB fetch failed (${res.status})`);
  }
  return res.json();
}

async function tmdbFetch(type, params = {}) {
  const qs = new URLSearchParams({ type, ...params });

  try {
    const res = await fetch(`/api/tmdb?${qs}`);
    if (res.ok) return res.json();
  } catch {
    // Proxy unavailable (502) — use direct TMDB below
  }

  return fetchTmdbDirect(type, params);
}

export async function getTrending(page = 1) {
  const data = await tmdbFetch('trending', { page: String(page) });
  return (data.results || []).map(mapTmdbMovie);
}

export async function getMovie(id) {
  const data = await tmdbFetch('movie', { id: String(id) });
  return mapTmdbMovie(data);
}

export async function searchMovies(query, page = 1) {
  if (!query?.trim()) return [];
  const data = await tmdbFetch('search', { query: query.trim(), page: String(page) });
  return (data.results || []).map(mapTmdbMovie);
}

/** Search TV series only */
export async function searchTv(query, page = 1) {
  if (!query?.trim()) return [];
  const apiKey = getSettings().tmdbApiKey || '';
  if (!apiKey) return [];
  try {
    const params = new URLSearchParams({ api_key: apiKey, language: 'en-US', query: query.trim(), page: String(page) });
    const res = await fetch(`https://api.themoviedb.org/3/search/tv?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((m) => mapTmdbMovie({ ...m, media_type: 'tv' }));
  } catch {
    return [];
  }
}

/**
 * Search both movies AND TV — uses /search/multi through the proxy.
 * Falls back to direct TMDB call using client-side key if proxy unavailable.
 */
export async function searchAny(query, page = 1) {
  if (!query?.trim()) return [];
  try {
    const data = await tmdbFetch('multi', { query: query.trim(), page: String(page) });
    return (data.results || [])
      .filter((m) => m.media_type === 'movie' || m.media_type === 'tv')
      .map(mapTmdbMovie);
  } catch {
    return [];
  }
}

