// functions/_lib/adminAuth.js
// Shared constants and cookie helpers for Admin Authentication

export const GOOGLE_CLIENT_ID = '212693926603-492fgvn9fa0sqe1769pivtio7hnvgvqt.apps.googleusercontent.com';
export const ADMIN_COOKIE_NAME = 'admin_session';
export const DEFAULT_ADMIN_EMAILS = ['nsengiyumvafaustin941@gmail.com'];

export function setAdminCookie(token, maxAgeSeconds) {
  return `${ADMIN_COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}

export function clearAdminCookie() {
  return `${ADMIN_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function getAdminSessionToken(request) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

export async function verifyAdminRequest(request, env) {
  const headerToken = request.headers.get('x-admin-token');
  const cookieToken = getAdminSessionToken(request);
  const activeToken = cookieToken || headerToken;

  // 1. KV token lookup (primary) — fastest and most reliable path.
  //    Token is stored as admin_token_{64-char-hex} during Google login.
  //    Rolling session: every successful verification extends the TTL by 7 days,
  //    so an active admin is never logged out due to expiry.
  const ROLLING_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
  if (activeToken && env.KV) {
    try {
      const raw = await env.KV.get(`admin_token_${activeToken}`);
      if (raw) {
        const session = JSON.parse(raw);
        if (session?.email && new Date(session.expiresAt) > new Date()) {
          // Rolling renewal: extend expiry non-blockingly
          const newExpiry = new Date(Date.now() + ROLLING_TTL_SECONDS * 1000).toISOString();
          const renewed = JSON.stringify({ ...session, expiresAt: newExpiry });
          env.KV.put(`admin_token_${activeToken}`, renewed, { expirationTtl: ROLLING_TTL_SECONDS })
            .catch(() => {}); // fire-and-forget, never blocks the response
          return { authorized: true, user: session.email };
        }
      }
    } catch (e) {
      console.warn('KV token verification error:', e);
    }
  }

  // 2. D1 session lookup (secondary) — for backwards compatibility.
  if (activeToken && env.DB) {
    try {
      const session = await env.DB.prepare(
        'SELECT username FROM admin_sessions WHERE token = ? AND expires_at > datetime("now")'
      ).bind(activeToken).first();

      if (session) {
        return { authorized: true, user: session.username };
      }
    } catch (e) {
      console.warn('Admin session verification error:', e);
    }
  }

  // 3. Static ADMIN_PASSWORD fallback (legacy / CLI usage).
  if (headerToken && env.ADMIN_PASSWORD && headerToken === env.ADMIN_PASSWORD) {
    return { authorized: true, user: 'admin' };
  }

  // 4. Fallback: check regular user session cookie / header against admin whitelist
  const userSessionToken = request.headers.get('x-user-session') ||
    (request.headers.get('Cookie') || '').match(/(?:^|;\s*)session=([^;]+)/)?.[1];

  if (userSessionToken && env.DB) {
    try {
      const user = await env.DB.prepare(
        `SELECT u.email FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime('now')`
      ).bind(userSessionToken).first();

      if (user && user.email) {
        const email = user.email.toLowerCase().trim();
        const adminEmails = [
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

        if (adminEmails.includes(email)) {
          return { authorized: true, user: email };
        }
      }
    } catch (e) {
      console.warn('Fallback admin session error:', e);
    }
  }

  return { authorized: false, user: null };
}


/**
 * Pages Function middleware helper.
 * Call with the full Cloudflare Pages context object.
 * Returns { authorized, user, username } on success, or null when unauthorized.
 *
 * Usage:
 *   const admin = await requireAdmin(context);
 *   if (!admin) return jsonError('Unauthorized', 401);
 */
export async function requireAdmin(context) {
  const { request, env } = context;
  const result = await verifyAdminRequest(request, env);
  if (!result.authorized) return null;
  return { ...result, username: result.user };
}
