
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

  const KV = env.KV;

  if (method === 'GET') {
    const key = url.searchParams.get('key');
    if (!key) return new Response('Missing key', { status: 400 });

    if (!KV) {
      return new Response('null', {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const data = await KV.get(key);
      return new Response(data || 'null', {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }

  const ADMIN_PASSWORD = env.ADMIN_PASSWORD;
  if (!ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: 'ADMIN_PASSWORD not configured' }), { status: 500 });
  }

  if (!KV) {
    return new Response(JSON.stringify({ error: 'KV namespace not found' }), { status: 500 });
  }

  if (method === 'POST') {
    try {
      const { key, value } = await request.json();
      if (!key) return new Response('Missing key', { status: 400 });

      const adminKeys = [
        'rebafilme_admin_movies',
        'rebafilme_movie_edits',
        'rebafilme_ads',
        'rebafilme_announcement',
        'rebafilme_settings',
        'rebafilme_highlights',
        'rebafilme_curated',
      ];

      const publicKeys = [
        'rebafilme_analytics',
      ];

      if (adminKeys.includes(key)) {
        const token = request.headers.get('x-admin-token');
        if (!token) return new Response('Unauthorized', { status: 401 });

        if (token !== env.ADMIN_PASSWORD) {
          return new Response('Unauthorized: Admins only', { status: 403 });
        }
      } else if (!publicKeys.includes(key)) {
        return new Response('Forbidden key', { status: 403 });
      }

      const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
      await KV.put(key, valueStr);

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
}
