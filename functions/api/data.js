import { verifyAdminRequest } from '../_lib/adminAuth.js';

export async function onRequest(context) {
  const { request, env } = context;
  const KV = env.KV;

  if (!KV) {
    return new Response('KV not bound', { status: 500 });
  }

  const url = new URL(request.url);

  // ── GET: Read a KV key ──────────────────────────────────────────────
  if (request.method === 'GET') {
    const key = url.searchParams.get('key');
    if (!key) return new Response('Missing key param', { status: 400 });

    try {
      const data = await KV.get(key);
      if (data === null) {
        return new Response(JSON.stringify({ found: false, data: null }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(data, {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }

  // ── POST: Write a KV key ─────────────────────────────────────────────
  if (request.method === 'POST') {
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
        const auth = await verifyAdminRequest(request, env);
        if (!auth.authorized) {
          return new Response(JSON.stringify({ error: 'Unauthorized: Admins only' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } else if (!publicKeys.includes(key)) {
        return new Response(JSON.stringify({ error: 'Forbidden key' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
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
