// functions/api/admin/google.js
// POST /api/admin/google → Google Identity OAuth2 verification for Admin Panel

import { setAdminCookie, GOOGLE_CLIENT_ID } from '../../_lib/adminAuth.js';

const SESSION_HOURS = 8;
const SESSION_SECONDS = SESSION_HOURS * 60 * 60;

export async function onRequestPost({ request, env }) {
  if (!env.DB) return jsonError('Database not configured', 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
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

  // 2. Resolve Admin Whitelist
  // Check environment variables first (ADMIN_EMAILS or ADMIN_EMAIL)
  const envEmails = [env.ADMIN_EMAILS, env.ADMIN_EMAIL]
    .filter(Boolean)
    .join(',')
    .toLowerCase()
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  let isAuthorized = envEmails.includes(email);

  // Fallback to Admin Settings stored in Cloudflare KV
  if (!isAuthorized && env.KV) {
    try {
      const rawSettings = await env.KV.get('rebafilme_settings');
      if (rawSettings) {
        const settings = JSON.parse(rawSettings);
        const kvAdminEmail = settings?.adminEmail?.toLowerCase().trim();
        if (kvAdminEmail && kvAdminEmail === email) {
          isAuthorized = true;
        }
      }
    } catch (e) {
      console.warn('Failed to read settings from KV:', e);
    }
  }

  if (!isAuthorized) {
    return jsonError(`Access Denied: ${email} is not an authorized administrator.`, 403);
  }

  // 3. Create Admin Session in D1
  try {
    // Ensure table exists
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS admin_sessions (
        token TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL
      )`
    ).run().catch(() => {});

    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
    const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();

    await env.DB.prepare(
      `INSERT INTO admin_sessions (token, username, expires_at) VALUES (?, ?, ?)`
    ).bind(token, email, expiresAt).run();

    // Probabilistic cleanup of expired sessions
    if (Math.random() < 0.1) {
      env.DB.prepare(`DELETE FROM admin_sessions WHERE expires_at < datetime('now')`).run().catch(() => {});
    }

    return new Response(
      JSON.stringify({ success: true, user: email }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': setAdminCookie(token, SESSION_SECONDS),
        },
      }
    );
  } catch (err) {
    console.error('Failed to create admin session:', err);
    return jsonError('Failed to establish admin session: ' + err.message, 500);
  }
}

function jsonError(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
