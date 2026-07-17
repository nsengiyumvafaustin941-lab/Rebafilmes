// functions/api/auth/logout.js
import { getSessionToken, clearSessionCookie } from '../../_lib/cookies.js';

export async function onRequestPost({ request, env }) {
  try {
    const token = getSessionToken(request);
    if (token) {
      await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': clearSessionCookie(),
      },
    });
  } catch (error) {
    console.error('Logout error:', error);
    return new Response(JSON.stringify({ error: 'Failed to logout' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': clearSessionCookie(),
      },
    });
  }
}
