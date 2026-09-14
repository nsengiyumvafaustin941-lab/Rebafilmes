// functions/api/admin/google.js
// POST /api/admin/google → Google Identity OAuth2 verification for Admin Panel

import { setAdminCookie, GOOGLE_CLIENT_ID, DEFAULT_ADMIN_EMAILS } from '../../_lib/adminAuth.js';

const SESSION_DAYS = 7;
const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60; // 7 days

export async function onRequestPost({ request, env }) {
  // KV is the primary session store; D1 is optional extra persistence.
  if (!env.KV) return jsonError('KV storage not configured', 503);

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
  // Check environment variables, fallback default list, and KV settings
  const envEmails = [
    env.ADMIN_EMAILS,
    env.ADMIN_EMAIL,
    ...(DEFAULT_ADMIN_EMAILS || []),
  ]
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

  // 3. Create Admin Session — stored in KV (primary) and D1 (optional)
  try {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
    const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
    const sessionData = JSON.stringify({ email, expiresAt, createdAt: new Date().toISOString() });

    // Primary: store in KV with native TTL (auto-expires)
    await env.KV.put(`admin_token_${token}`, sessionData, { expirationTtl: SESSION_SECONDS });

    // Optional: also store in D1 if available
    if (env.DB) {
      try {
        await env.DB.prepare(
          `CREATE TABLE IF NOT EXISTS admin_sessions (
            token TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            expires_at TEXT NOT NULL
          )`
        ).run().catch(() => {});

        await env.DB.prepare(
          `INSERT INTO admin_sessions (token, username, expires_at) VALUES (?, ?, ?)`
        ).bind(token, email, expiresAt).run();

        if (Math.random() < 0.1) {
          env.DB.prepare(`DELETE FROM admin_sessions WHERE expires_at < datetime('now')`).run().catch(() => {});
        }
      } catch (d1Err) {
        console.warn('D1 session store skipped (non-fatal):', d1Err.message);
      }
    }

    return new Response(
      JSON.stringify({ success: true, user: email, token }),
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
