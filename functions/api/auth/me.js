// functions/api/auth/me.js
import { getSessionToken } from '../../_lib/cookies.js';

export async function onRequestGet({ request, env }) {
  try {
    if (!env.DB) {
      return new Response(JSON.stringify({ user: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = getSessionToken(request);
    if (!token) {
      return new Response(JSON.stringify({ user: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = await env.DB.prepare(
      `SELECT u.id, u.email, u.name, u.phone, u.plan
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > datetime('now')`
    )
      .bind(token)
      .first();

    if (user) {
      // Quick active VIP check to ensure user plan is in sync
      try {
        const activeSub = await env.DB.prepare(
          `SELECT id FROM vip_subscriptions
           WHERE (user_id = ? OR (phone IS NOT NULL AND phone != '' AND phone = ?))
             AND status = 'approved'
             AND (expires_at IS NULL OR expires_at > datetime('now'))
           LIMIT 1`
        ).bind(user.id, user.phone || 'none').first();

        if (activeSub && user.plan !== 'vip') {
          user.plan = 'vip';
          await env.DB.prepare(`UPDATE users SET plan = 'vip' WHERE id = ?`).bind(user.id).run();
        }
      } catch (e) {
        console.warn('[auth/me] VIP check warning:', e);
      }
    }

    return new Response(JSON.stringify({ user: user || null }), {
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
