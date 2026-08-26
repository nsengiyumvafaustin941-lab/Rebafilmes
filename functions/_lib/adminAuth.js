// functions/_lib/adminAuth.js
// Shared constants and cookie helpers for Admin Authentication

export const GOOGLE_CLIENT_ID = '212693926603-492fgvn9fa0sqe1769pivtio7hnvgvqt.apps.googleusercontent.com';
export const ADMIN_COOKIE_NAME = 'admin_session';

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
  // 1. Header token check (e.g. x-admin-token)
  const headerToken = request.headers.get('x-admin-token');
  if (headerToken && env.ADMIN_PASSWORD && headerToken === env.ADMIN_PASSWORD) {
    return { authorized: true, user: 'admin' };
  }

  // 2. Cookie session check (admin_session HttpOnly cookie in D1)
  const cookieToken = getAdminSessionToken(request);
  if (cookieToken && env.DB) {
    try {
      const session = await env.DB.prepare(
        'SELECT username FROM admin_sessions WHERE token = ? AND expires_at > datetime("now")'
      ).bind(cookieToken).first();

      if (session) {
        return { authorized: true, user: session.username };
      }
    } catch (e) {
      console.warn('Admin session verification error:', e);
    }
  }

  return { authorized: false, user: null };
}
