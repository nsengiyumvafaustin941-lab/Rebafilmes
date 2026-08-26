// functions/api/auth/google.js
// POST /api/auth/google → Google Identity OAuth2 verification for User Accounts

import { generateId, generateToken } from '../../_lib/crypto.js';
import { setSessionCookie } from '../../_lib/cookies.js';
import { checkRateLimit } from '../../_lib/ratelimit.js';
import { validateOrigin } from '../../_lib/csrf.js';

const GOOGLE_CLIENT_ID = '212693926603-492fgvn9fa0sqe1769pivtio7hnvgvqt.apps.googleusercontent.com';
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

export async function onRequestPost({ request, env }) {
  try {
    if (!validateOrigin(request)) {
      return jsonError('Cross-origin request blocked (CSRF protection)', 403);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonError('Invalid JSON body', 400);
    }

    if (!env.DB) {
      return jsonError('Database not configured. Please contact support.', 503);
    }

    const allowed = await checkRateLimit(request, env, 15, 300); // 15 attempts per 5 mins
    if (!allowed) {
      return jsonError('Too many attempts. Try again later.', 429);
    }

    const { credential } = body || {};
    if (!credential) {
      return jsonError('No Google credential provided', 400);
    }

    // 1. Verify ID token with Google's OAuth2 endpoint
    let payload;
    try {
      const verifyRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
      );
      if (!verifyRes.ok) {
        return jsonError('Invalid Google credential', 401);
      }
      payload = await verifyRes.json();
    } catch (err) {
      console.error('Google token verification failed:', err);
      return jsonError('Google verification service unavailable', 502);
    }

    const targetClientId = env.GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID;
    if (payload.aud !== targetClientId) {
      return jsonError('Invalid token audience', 401);
    }

    const email = payload.email?.toLowerCase().trim();
    const isEmailVerified = payload.email_verified === 'true' || payload.email_verified === true;
    if (!email || !isEmailVerified) {
      return jsonError('Unverified Google email address', 400);
    }

    const name = payload.name || payload.given_name || email.split('@')[0];
    const googleSub = payload.sub || '';

    // 2. Find or Create User in D1 Database
    let user = await env.DB.prepare(
      'SELECT id, email, name, phone, plan, status FROM users WHERE email = ?'
    )
      .bind(email)
      .first();

    let userId;
    let userPlan = 'free';

    if (!user) {
      userId = generateId();
      await env.DB.prepare(
        `INSERT INTO users (id, email, name, phone, password_hash, plan, status, created_at, updated_at)
         VALUES (?, ?, ?, NULL, ?, 'free', 'active', datetime('now'), datetime('now'))`
      )
        .bind(userId, email, name, `GOOGLE_AUTH_${googleSub}`)
        .run();
    } else {
      userId = user.id;
      userPlan = user.plan || 'free';
    }

    // 3. Auto-sync active VIP subscription if exists
    try {
      const activeSub = await env.DB.prepare(
        `SELECT id, plan FROM vip_subscriptions
         WHERE (user_id = ? OR phone = ?)
           AND status = 'approved'
           AND (expires_at IS NULL OR expires_at > datetime('now'))
         ORDER BY id DESC LIMIT 1`
      ).bind(userId, user?.phone || 'none').first();

      if (activeSub) {
        userPlan = 'vip';
        if (user?.plan !== 'vip') {
          await env.DB.prepare(
            `UPDATE users SET plan = 'vip', updated_at = datetime('now') WHERE id = ?`
          ).bind(userId).run();
        }
        if (activeSub.id && !activeSub.user_id) {
          await env.DB.prepare(
            `UPDATE vip_subscriptions SET user_id = ?, updated_at = datetime('now') WHERE id = ?`
          ).bind(userId, activeSub.id).run();
        }
      }
    } catch (e) {
      console.warn('[auth/google] VIP sync warning:', e);
    }

    // 4. Create Session in D1
    const token = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000).toISOString();

    await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
      .bind(token, userId, expiresAt)
      .run();

    // Probabilistic cleanup of expired sessions
    if (Math.random() < 0.1) {
      try {
        await env.DB.prepare('DELETE FROM sessions WHERE expires_at < datetime("now")').run();
      } catch (e) {
        console.error('Session cleanup failed:', e);
      }
    }

    return new Response(
      JSON.stringify({
        user: {
          id: userId,
          email,
          name,
          phone: user?.phone || null,
          plan: userPlan,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': setSessionCookie(token, SESSION_DURATION_SECONDS),
        },
      }
    );
  } catch (error) {
    console.error('Google Auth Error:', error);
    return jsonError('An error occurred during Google sign-in. Please try again.', 500);
  }
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
