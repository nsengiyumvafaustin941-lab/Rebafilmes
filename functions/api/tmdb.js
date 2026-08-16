const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const TMDB_BASE = 'https://api.themoviedb.org/3';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS });
  }

  let apiKey = env.TMDB_API_KEY;

  if (apiKey === 'your_tmdb_api_key_here' || apiKey === 'YOUR_TMDB_API_KEY') {
    apiKey = null;
  }

  // Fallback 1: Try reading from Cloudflare KV if admin set it in UI
  if (!apiKey && env.KV) {
    try {
      const settingsRaw = await env.KV.get('rebafilme_settings');
      if (settingsRaw) {
        const settings = JSON.parse(settingsRaw);
        if (settings && settings.tmdbApiKey && settings.tmdbApiKey !== 'your_tmdb_api_key_here') {
          apiKey = settings.tmdbApiKey;
        }
      }
    } catch (e) {
      console.warn("Could not read KV settings", e);
    }
  }

  // Fallback 2: Default public TMDB key to prevent 401/500 errors on fresh deployments
  if (!apiKey || apiKey === 'your_tmdb_api_key_here') {
    apiKey = '3fd2be6f0c70a2a598f084dd1fb0648c';
  }

  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'trending';
  const page = url.searchParams.get('page') || '1';
  const id = url.searchParams.get('id');
  const query = url.searchParams.get('query') || '';

  let tmdbPath = '';
  const params = new URLSearchParams({ api_key: apiKey, language: 'en-US' });

  switch (type) {
    case 'trending':
      tmdbPath = '/trending/all/week';
      params.set('page', page);
      break;
    case 'top_rated':
      tmdbPath = '/movie/top_rated';
      params.set('page', page);
      break;
    case 'popular':
      tmdbPath = '/movie/popular';
      params.set('page', page);
      break;
    case 'popular_tv':
      tmdbPath = '/tv/popular';
      params.set('page', page);
      break;
    case 'top_rated_tv':
      tmdbPath = '/tv/top_rated';
      params.set('page', page);
      break;
    case 'upcoming':
      tmdbPath = '/movie/upcoming';
      params.set('page', page);
      break;
    case 'discover':
    case 'discover_movie':
      tmdbPath = '/discover/movie';
      params.set('page', page);
      if (id) params.set('with_genres', id);
      if (url.searchParams.get('genre')) params.set('with_genres', url.searchParams.get('genre'));
      if (url.searchParams.get('year')) params.set('primary_release_year', url.searchParams.get('year'));
      if (url.searchParams.get('sort')) {
        params.set('sort_by', url.searchParams.get('sort'));
        if (url.searchParams.get('sort').startsWith('vote_average')) {
          params.set('vote_count.gte', '50');
        }
      } else {
        params.set('sort_by', 'popularity.desc');
      }
      break;
    case 'discover_tv':
      tmdbPath = '/discover/tv';
      params.set('page', page);
      if (id) params.set('with_genres', id);
      if (url.searchParams.get('genre')) params.set('with_genres', url.searchParams.get('genre'));
      if (url.searchParams.get('year')) params.set('first_air_date_year', url.searchParams.get('year'));
      if (url.searchParams.get('sort')) {
        params.set('sort_by', url.searchParams.get('sort'));
        if (url.searchParams.get('sort').startsWith('vote_average')) {
          params.set('vote_count.gte', '20');
        }
      } else {
        params.set('sort_by', 'popularity.desc');
      }
      break;
    case 'movie':
      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers: CORS });
      }
      tmdbPath = `/movie/${id}`;
      params.set('append_to_response', 'videos,credits');
      break;
    case 'tv_detail':
    case 'tv_show':
      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers: CORS });
      }
      tmdbPath = `/tv/${id}`;
      params.set('append_to_response', 'videos,credits,external_ids');
      break;
    case 'tv_season':
      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers: CORS });
      }
      const seasonNum = url.searchParams.get('season') || '1';
      tmdbPath = `/tv/${id}/season/${seasonNum}`;
      break;
    case 'search':
      tmdbPath = '/search/movie';
      params.set('query', query);
      params.set('page', page);
      break;
    case 'multi':
    case 'suggest':
      tmdbPath = '/search/multi';
      params.set('query', query);
      params.set('page', page);
      break;
    case 'tv':
      tmdbPath = '/search/tv';
      params.set('query', query);
      params.set('page', page);
      break;
    default:
      return new Response(JSON.stringify({ error: 'Invalid type' }), { status: 400, headers: CORS });
  }

  try {
    const res = await fetch(`${TMDB_BASE}${tmdbPath}?${params}`);
    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: data.status_message || 'TMDB request failed' }), {
        status: res.status,
        headers: CORS,
      });
    }

    return new Response(JSON.stringify(data), { status: 200, headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}
