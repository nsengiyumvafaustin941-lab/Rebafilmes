export const GENRE_MAP = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
  10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics'
};

export const TMDB_GENRES = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 36, name: 'History' },
  { id: 27, name: 'Horror' },
  { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 10770, name: 'TV Movie' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
  { id: 37, name: 'Western' },
];

import { buildDownloadUrl, getSettings } from './settings';

export const DOWNLOAD_BASE = 'https://videodownloader.site';
export const DEFAULT_TMDB_KEY = '3fd2be6f0c70a2a598f084dd1fb0648c';

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
  if (!m) return null;
  const year = m.release_date
    ? parseInt(m.release_date.substring(0, 4), 10)
    : m.first_air_date
      ? parseInt(m.first_air_date.substring(0, 4), 10)
      : null;

  const isTv = m.media_type === 'tv' || Boolean(m.first_air_date && !m.release_date) || Boolean(m.number_of_seasons);
  const genre = m.genres?.[0]?.name || mapGenreIds(m.genre_ids)[0] || 'Action';

  return {
    id: m.id,
    tmdbId: m.id,
    type: isTv ? 'series' : 'movie',
    title: m.title || m.name || 'Untitled',
    description: m.overview || '',
    poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : '',
    backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : (m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : ''),
    genre,
    country: m.origin_country?.[0] || 'USA',
    year: year || new Date().getFullYear(),
    badge: m.vote_average >= 7.5 ? 'Top' : 'HD',
    featured: (m.popularity || 0) > 50,
    popular: (m.vote_average || 0) >= 7,
    rating: m.vote_average || 0,
    runtime: m.runtime || (m.episode_run_time?.[0]) || null,
    trailerKey: getTrailerKey(m),
    videos: m.videos,
    credits: m.credits,
    videoUrl: '',
  };
}

function getClientApiKey() {
  return getSettings().tmdbApiKey || DEFAULT_TMDB_KEY;
}

async function fetchTmdbDirect(type, params = {}) {
  const apiKey = getClientApiKey();
  const tmdbParams = new URLSearchParams({ api_key: apiKey, language: 'en-US' });
  let path = '';

  switch (type) {
    case 'trending':
      path = '/trending/all/week';
      tmdbParams.set('page', params.page || '1');
      break;
    case 'top_rated':
      path = '/movie/top_rated';
      tmdbParams.set('page', params.page || '1');
      break;
    case 'popular':
      path = '/movie/popular';
      tmdbParams.set('page', params.page || '1');
      break;
    case 'popular_tv':
      path = '/tv/popular';
      tmdbParams.set('page', params.page || '1');
      break;
    case 'top_rated_tv':
      path = '/tv/top_rated';
      tmdbParams.set('page', params.page || '1');
      break;
    case 'upcoming':
      path = '/movie/upcoming';
      tmdbParams.set('page', params.page || '1');
      break;
    case 'movie':
      path = `/movie/${params.id}`;
      tmdbParams.set('append_to_response', 'videos,credits');
      break;
    case 'tv_detail':
    case 'tv_show':
      path = `/tv/${params.id}`;
      tmdbParams.set('append_to_response', 'videos,credits,external_ids');
      break;
    case 'tv_season':
      path = `/tv/${params.id}/season/${params.season || 1}`;
      break;
    case 'search':
      path = '/search/movie';
      tmdbParams.set('query', params.query || '');
      tmdbParams.set('page', params.page || '1');
      break;
    case 'tv':
      path = '/search/tv';
      tmdbParams.set('query', params.query || '');
      tmdbParams.set('page', params.page || '1');
      break;
    case 'multi':
    case 'suggest':
      path = '/search/multi';
      tmdbParams.set('query', params.query || '');
      tmdbParams.set('page', params.page || '1');
      break;
    case 'discover':
    case 'discover_movie':
      path = '/discover/movie';
      tmdbParams.set('page', params.page || '1');
      if (params.genre) tmdbParams.set('with_genres', params.genre);
      if (params.year) tmdbParams.set('primary_release_year', params.year);
      if (params.sort) {
        tmdbParams.set('sort_by', params.sort);
        if (params.sort.startsWith('vote_average')) {
          tmdbParams.set('vote_count.gte', '50');
        }
      } else {
        tmdbParams.set('sort_by', 'popularity.desc');
      }
      break;
    case 'discover_tv':
      path = '/discover/tv';
      tmdbParams.set('page', params.page || '1');
      if (params.genre) tmdbParams.set('with_genres', params.genre);
      if (params.year) tmdbParams.set('first_air_date_year', params.year);
      if (params.sort) {
        tmdbParams.set('sort_by', params.sort);
        if (params.sort.startsWith('vote_average')) {
          tmdbParams.set('vote_count.gte', '20');
        }
      } else {
        tmdbParams.set('sort_by', 'popularity.desc');
      }
      break;
    default:
      path = '/trending/all/week';
      tmdbParams.set('page', params.page || '1');
  }

  const res = await fetch(`https://api.themoviedb.org/3${path}?${tmdbParams}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.status_message || `TMDB fetch failed (${res.status})`);
  }
  return res.json();
}

export async function tmdbFetch(type, params = {}) {
  const qs = new URLSearchParams({ type, ...params });

  try {
    const res = await fetch(`/api/tmdb?${qs}`);
    if (res.ok) return await res.json();
  } catch {
    // Proxy unavailable (502) — use direct TMDB fallback below
  }

  return fetchTmdbDirect(type, params);
}

export async function getTrending(page = 1) {
  const data = await tmdbFetch('trending', { page: String(page) });
  return (data.results || []).map(mapTmdbMovie).filter(Boolean);
}

export async function getTopRated(page = 1) {
  const data = await tmdbFetch('top_rated', { page: String(page) });
  return (data.results || []).map((m) => mapTmdbMovie({ ...m, media_type: 'movie' })).filter(Boolean);
}

export async function getPopular(page = 1) {
  const data = await tmdbFetch('popular', { page: String(page) });
  return (data.results || []).map((m) => mapTmdbMovie({ ...m, media_type: 'movie' })).filter(Boolean);
}

export async function getPopularTv(page = 1) {
  const data = await tmdbFetch('popular_tv', { page: String(page) });
  return (data.results || []).map((m) => mapTmdbMovie({ ...m, media_type: 'tv' })).filter(Boolean);
}

export async function getTopRatedTv(page = 1) {
  const data = await tmdbFetch('top_rated_tv', { page: String(page) });
  return (data.results || []).map((m) => mapTmdbMovie({ ...m, media_type: 'tv' })).filter(Boolean);
}

export async function getUpcoming(page = 1) {
  const data = await tmdbFetch('upcoming', { page: String(page) });
  return (data.results || []).map((m) => ({
    ...mapTmdbMovie({ ...m, media_type: 'movie' }),
    releaseDate: m.release_date || '',
  })).filter(Boolean);
}

export async function getMovie(id) {
  const data = await tmdbFetch('movie', { id: String(id) });
  return mapTmdbMovie(data);
}

export async function getTvShow(id) {
  const cleanId = parseMovieId(id);
  const data = await tmdbFetch('tv_detail', { id: String(cleanId) });
  const mapped = mapTmdbMovie({ ...data, media_type: 'tv' });
  const cleanSeasons = (data.seasons || [])
    .filter((s) => s.season_number > 0)
    .map((s) => ({
      id: s.id,
      seasonNumber: s.season_number,
      season_number: s.season_number,
      name: s.name || `Season ${s.season_number}`,
      episodeCount: s.episode_count || 1,
      episode_count: s.episode_count || 1,
      airDate: s.air_date || '',
      poster: s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : mapped?.poster || '',
      overview: s.overview || '',
    }));

  return {
    ...mapped,
    seasons: cleanSeasons,
    numberOfSeasons: data.number_of_seasons || cleanSeasons.length || 1,
    numberOfEpisodes: data.number_of_episodes || 1,
  };
}

export async function getTvSeason(id, seasonNumber = 1) {
  const cleanId = parseMovieId(id);
  try {
    const data = await tmdbFetch('tv_season', { id: String(cleanId), season: String(seasonNumber) });
    return (data.episodes || []).map((ep) => ({
      id: ep.id,
      episodeNumber: ep.episode_number,
      seasonNumber: ep.season_number,
      title: ep.name || `Episode ${ep.episode_number}`,
      overview: ep.overview || '',
      airDate: ep.air_date || '',
      still: ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : '',
      voteAverage: ep.vote_average || 0,
      runtime: ep.runtime || null,
    }));
  } catch (err) {
    console.warn(`Failed to fetch season ${seasonNumber} for show ${id}`, err);
    return [];
  }
}

export async function getMovieOrTv(id, hintedType = null) {
  const cleanId = parseMovieId(id);
  if (!cleanId) return null;

  if (hintedType === 'series' || hintedType === 'tv') {
    try {
      return await getTvShow(cleanId);
    } catch {
      return await getMovie(cleanId);
    }
  }

  try {
    const movie = await getMovie(cleanId);
    if (movie?.title) return movie;
  } catch {
    // Try TV fallback
  }

  try {
    return await getTvShow(cleanId);
  } catch {
    return null;
  }
}

/**
 * Universal search with full pagination & filters across all TMDB titles
 */
export async function searchWithPagination({
  query = '',
  page = 1,
  type = 'all',
  genre = '',
  year = '',
  sort = 'popularity.desc'
}) {
  const cleanQ = (query || '').trim();

  // 1. Text Query Search Mode
  if (cleanQ) {
    const searchEndpoint = type === 'movie' ? 'search' : type === 'series' || type === 'tv' ? 'tv' : 'multi';
    const data = await tmdbFetch(searchEndpoint, { query: cleanQ, page: String(page) });

    const results = (data.results || [])
      .filter((m) => m.media_type !== 'person')
      .map(mapTmdbMovie)
      .filter(Boolean);

    return {
      results,
      page: data.page || page,
      totalPages: data.total_pages || 1,
      totalResults: data.total_results || results.length,
    };
  }

  // 2. Discover Mode (by Genre / Year / Sort)
  const discoverEndpoint = type === 'series' || type === 'tv' ? 'discover_tv' : 'discover_movie';
  const data = await tmdbFetch(discoverEndpoint, {
    page: String(page),
    genre: genre || '',
    year: year || '',
    sort: sort || 'popularity.desc',
  });

  const results = (data.results || [])
    .map((m) => mapTmdbMovie({ ...m, media_type: type === 'series' || type === 'tv' ? 'tv' : 'movie' }))
    .filter(Boolean);

  return {
    results,
    page: data.page || page,
    totalPages: data.total_pages || 1,
    totalResults: data.total_results || results.length,
  };
}

export async function searchMovies(query, page = 1) {
  if (!query?.trim()) return [];
  const data = await tmdbFetch('search', { query: query.trim(), page: String(page) });
  return (data.results || []).map(mapTmdbMovie).filter(Boolean);
}

export async function searchTv(query, page = 1) {
  if (!query?.trim()) return [];
  const data = await tmdbFetch('tv', { query: query.trim(), page: String(page) });
  return (data.results || []).map((m) => mapTmdbMovie({ ...m, media_type: 'tv' })).filter(Boolean);
}

export async function searchAny(query, page = 1) {
  if (!query?.trim()) return [];
  try {
    const data = await tmdbFetch('multi', { query: query.trim(), page: String(page) });
    return (data.results || [])
      .filter((m) => m.media_type !== 'person')
      .map(mapTmdbMovie)
      .filter(Boolean);
  } catch {
    return [];
  }
}

// In-Memory Search Suggestion Cache
const suggestCache = new Map();

/**
 * High-speed autocomplete suggestions (<10ms cached)
 */
export async function getSearchSuggest(query) {
  const q = (query || '').trim().toLowerCase();
  if (q.length < 2) return [];

  if (suggestCache.has(q)) {
    return suggestCache.get(q);
  }

  try {
    const results = await searchAny(q, 1);
    const suggestions = results.slice(0, 8).map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      year: item.year,
      rating: item.rating,
      poster: item.poster,
      genre: item.genre,
      url: moviePath(item.id, item.title),
    }));

    suggestCache.set(q, suggestions);
    if (suggestCache.size > 200) {
      const firstKey = suggestCache.keys().next().value;
      suggestCache.delete(firstKey);
    }

    return suggestions;
  } catch {
    return [];
  }
}
