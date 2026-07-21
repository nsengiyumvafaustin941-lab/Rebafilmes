// functions/api/saved.js
import { getSessionToken } from '../_lib/cookies.js';

export async function onRequestGet({ request, env }) {
  if (!env.DB) return new Response(JSON.stringify([]), { status: 503, headers: { 'Content-Type': 'application/json' } });
  const token = getSessionToken(request);
  if (!token) return new Response(JSON.stringify([]), { status: 401 });

  const session = await env.DB.prepare('SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime("now")').bind(token).first();
  if (!session) return new Response(JSON.stringify([]), { status: 401 });

  const { results } = await env.DB.prepare('SELECT movie_id FROM saved_movies WHERE user_id = ?').bind(session.user_id).all();
  return new Response(JSON.stringify(results.map(r => r.movie_id)), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return new Response(JSON.stringify({ error: 'Database not configured' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  const token = getSessionToken(request);
  if (!token) return new Response('Unauthorized', { status: 401 });

  const session = await env.DB.prepare('SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime("now")').bind(token).first();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { movieId } = await request.json();
  if (!movieId) return new Response('Missing movieId', { status: 400 });

  // Toggle logic
  const existing = await env.DB.prepare('SELECT 1 FROM saved_movies WHERE user_id = ? AND movie_id = ?').bind(session.user_id, String(movieId)).first();
  
  if (existing) {
    await env.DB.prepare('DELETE FROM saved_movies WHERE user_id = ? AND movie_id = ?').bind(session.user_id, String(movieId)).run();
  } else {
    await env.DB.prepare('INSERT INTO saved_movies (user_id, movie_id) VALUES (?, ?)').bind(session.user_id, String(movieId)).run();
  }

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' }});
}
