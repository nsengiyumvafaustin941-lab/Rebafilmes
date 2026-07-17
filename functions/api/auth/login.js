// functions/api/auth/login.js
import { verifyPassword, generateToken } from '../../_lib/crypto.js';
import { setSessionCookie } from '../../_lib/cookies.js';
import { checkRateLimit } from '../../_lib/ratelimit.js';

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

export async function onRequestPost({ request, env }) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonError('Invalid JSON body', 400);
    }

    if (!env.DB) {
      return jsonError('Database not configured. Please contact support.', 503);
    }

    const allowed = await checkRateLimit(request, env, 10, 300); // 10 attempts per 5 mins
    if (!allowed) {
      return jsonError('Too many attempts. Try again later.', 429);
    }

    const { email, password } = body;

    if (!email || !password) {
      return jsonError('Email/Phone and password are required', 400);
    }

    const inputVal = String(email).trim().toLowerCase();
    let searchPhone = inputVal;

    if (!inputVal.includes('@')) {
      let clean = inputVal.replace(/[^\d+]/g, '');
      if (!clean.startsWith('+')) {
        if (clean.startsWith('250')) {
          clean = '+' + clean;
        } else {
          clean = '+250' + clean.replace(/^0+/, '');
        }
      }
      searchPhone = clean;
    }

    const user = await env.DB.prepare(
      'SELECT id, email, name, plan, password_hash, status FROM users WHERE email = ? OR phone = ? OR email = ?'
    )
      .bind(inputVal, searchPhone, `${searchPhone.replace('+', '')}@phone.rebafilme.local`)
      .first();

    let isValid = false;
    if (!user || user.status !== 'active') {
      // Dummy hash verify to prevent timing side-channel attacks
      // This is a valid PBKDF2 hash for the password "dummy"
      const dummyHash = "pbkdf2:10000:00000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000";
      await verifyPassword(password, dummyHash);
      return jsonError('Invalid email or password', 401);
    } else {
      isValid = await verifyPassword(password, user.password_hash);
    }

    if (!isValid) {
      return jsonError('Invalid email or password', 401);
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000).toISOString();

    await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
      .bind(token, user.id, expiresAt)
      .run();

    // Probabilistic cleanup of expired sessions (10% chance on login)
    if (Math.random() < 0.1) {
      try {
        await env.DB.prepare('DELETE FROM sessions WHERE expires_at < datetime("now")').run();
      } catch (e) {
        console.error('Session cleanup failed:', e);
      }
    }

    return new Response(
      JSON.stringify({ user: { id: user.id, email: user.email, name: user.name, plan: user.plan } }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': setSessionCookie(token, SESSION_DURATION_SECONDS),
        },
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    return jsonError('An error occurred during login. Please try again.', 500);
  }
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
