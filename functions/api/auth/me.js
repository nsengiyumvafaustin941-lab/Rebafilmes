// functions/api/auth/me.js
import { getSessionToken } from '../../_lib/cookies.js';

export async function onRequestGet({ request, env }) {
  try {
    const token = getSessionToken(request);
    if (!token) {
      return new Response(JSON.stringify({ user: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const session = await env.DB.prepare(
      `SELECT u.id, u.email, u.name, u.plan
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > datetime('now')`
    )
      .bind(token)
      .first();

    return new Response(JSON.stringify({ user: session || null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Session check error:', error);
    return new Response(JSON.stringify({ error: 'Failed to check session' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
