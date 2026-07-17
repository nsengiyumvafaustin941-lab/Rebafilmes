// functions/api/auth/register.js
import { hashPassword, generateId, generateToken } from '../../_lib/crypto.js';
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

    const allowed = await checkRateLimit(request, env, 5, 3600); // 5 attempts per hour
    if (!allowed) {
      return jsonError('Too many registrations. Try again later.', 429);
    }

    const { email, password, name, phone } = body;

    if (!password || !name) {
      return jsonError('Password and name are required', 400);
    }
    if (!email && !phone) {
      return jsonError('Email or Phone number is required', 400);
    }
    if (email && phone) {
      return jsonError('Please provide either Email or Phone number, not both', 400);
    }
    if (password.length < 6) {
      return jsonError('Password must be at least 6 characters', 400);
    }

    let normalizedEmail = '';
    let formattedPhone = null;

    if (email) {
      normalizedEmail = String(email).trim().toLowerCase();
      const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
        .bind(normalizedEmail)
        .first();
      if (existing) {
        return jsonError('An account with this email already exists', 409);
      }
    } else if (phone) {
      let cleanPhone = String(phone).trim().replace(/[^\d+]/g, '');
      if (!cleanPhone.startsWith('+')) {
        if (cleanPhone.startsWith('250')) {
          cleanPhone = '+' + cleanPhone;
        } else {
          cleanPhone = '+250' + cleanPhone.replace(/^0+/, '');
        }
      }
      formattedPhone = cleanPhone;

      const existing = await env.DB.prepare('SELECT id FROM users WHERE phone = ?')
        .bind(formattedPhone)
        .first();
      if (existing) {
        return jsonError('An account with this phone number already exists', 409);
      }
      normalizedEmail = `${formattedPhone.replace('+', '')}@phone.rebafilme.local`;
    }

    const id = generateId();
    const passwordHash = await hashPassword(password);

    await env.DB.prepare(
      `INSERT INTO users (id, email, name, phone, password_hash, plan, status)
       VALUES (?, ?, ?, ?, ?, 'free', 'active')`
    )
      .bind(id, normalizedEmail, name, formattedPhone, passwordHash)
      .run();

    const token = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000).toISOString();

    await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
      .bind(token, id, expiresAt)
      .run();

    // Probabilistic cleanup of expired sessions (10% chance on register)
    if (Math.random() < 0.1) {
      try {
        await env.DB.prepare('DELETE FROM sessions WHERE expires_at < datetime("now")').run();
      } catch (e) {
        console.error('Session cleanup failed:', e);
      }
    }

    return new Response(
      JSON.stringify({ user: { id, email: normalizedEmail, name, plan: 'free' } }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': setSessionCookie(token, SESSION_DURATION_SECONDS),
        },
      }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return jsonError('An error occurred during registration. Please try again.', 500);
  }
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
