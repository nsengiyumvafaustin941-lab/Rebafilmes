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

  const apiKey = env.TMDB_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'TMDB_API_KEY not configured' }), { status: 500, headers: CORS });
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
      tmdbPath = '/trending/movie/week';
      params.set('page', page);
      break;
    case 'movie':
      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers: CORS });
      }
      tmdbPath = `/movie/${id}`;
      params.set('append_to_response', 'videos,credits');
      break;
    case 'search':
      tmdbPath = '/search/movie';
      params.set('query', query);
      params.set('page', page);
      break;
    case 'multi':
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
