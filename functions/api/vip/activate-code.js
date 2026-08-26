// functions/api/vip/activate-code.js
// POST /api/vip/activate-code
// Validates a VIP passcode and activates a 30-day VIP subscription

import { getSessionToken } from '../../_lib/cookies.js';
import { checkRateLimit } from '../../_lib/ratelimit.js';

function jsonError(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function jsonOk(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function parsePasscodes(env) {
  const envCodes = (env.VIP_PASSCODES || '')
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);

  const kvCodes = [];
  if (env.KV) {
    try {
      const raw = await env.KV.get('rebafilme_settings');
      if (raw) {
        const settings = JSON.parse(raw);
        const kvPasscodes = settings.vipPasscodes || '';
        kvCodes.push(...kvPasscodes.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean));
      }
    } catch (e) {
      console.warn('[vip/activate-code] KV settings read failed:', e);
    }
  }

  return [...new Set([...envCodes, ...kvCodes])];
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return jsonError('Database not configured', 503);

  const allowed = await checkRateLimit(request, env, 5, 900);
  if (!allowed) {
    return jsonError('Too many attempts. Please try again later.', 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON payload', 400);
  }

  const code = String(body.code || '').trim().toUpperCase();
  if (!code) {
    return jsonError('VIP code is required', 400);
  }

  const validCodes = await parsePasscodes(env);
  if (!validCodes.includes(code)) {
    return jsonError('Invalid VIP code', 400);
  }

  try {
    const sessionToken = getSessionToken(request);
    let userId = null;

    if (sessionToken && env.DB) {
      try {
        const session = await env.DB.prepare(
          `SELECT s.user_id FROM sessions s WHERE s.token = ? AND s.expires_at > datetime('now')`
        ).bind(sessionToken).first();

        if (session) {
          userId = session.user_id;
        }
      } catch (e) {
        console.warn('[vip/activate-code] Session lookup error:', e);
      }
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Check if user already has an active or passcode subscription
    let existingSub = null;
    if (userId) {
      existingSub = await env.DB.prepare(
        `SELECT id FROM vip_subscriptions WHERE user_id = ? AND status = 'approved' LIMIT 1`
      ).bind(userId).first();
    }

    if (existingSub) {
      await env.DB.prepare(
        `UPDATE vip_subscriptions
         SET expires_at = ?,
             admin_notes = coalesce(admin_notes, '') || ' | Renewed via VIP Passcode: ' || ?,
             updated_at = datetime('now')
         WHERE id = ?`
      ).bind(expiresAt, code, existingSub.id).run();
    } else {
      const subId = crypto.randomUUID();
      try {
        await env.DB.prepare(
          `INSERT INTO vip_subscriptions (id, user_id, phone, payment_method, momo_tx_id, amount, plan, status, expires_at, admin_notes, created_at, updated_at)
           VALUES (?, ?, ?, 'passcode', ?, 0, 'monthly', 'approved', ?, 'Activated via VIP Passcode', datetime('now'), datetime('now'))`
        ).bind(subId, userId, 'PASSCODE-' + code, 'PASS-' + Date.now() + '-' + code, expiresAt).run();
      } catch {
        // Fallback for pre-migration schema
        await env.DB.prepare(
          `INSERT INTO vip_subscriptions (id, user_id, phone, momo_tx_id, amount, plan, status, expires_at, admin_notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, 0, 'monthly', 'approved', ?, 'Activated via VIP Passcode', datetime('now'), datetime('now'))`
        ).bind(subId, userId, 'PASSCODE-' + code, 'PASS-' + Date.now() + '-' + code, expiresAt).run();
      }
    }

    if (userId) {
      await env.DB.prepare(
        `UPDATE users SET plan = 'vip', updated_at = datetime('now') WHERE id = ?`
      ).bind(userId).run();
    }

    return jsonOk({ success: true, message: 'VIP Pass activated!' });
  } catch (e) {
    console.error('[vip/activate-code] Error activating passcode:', e);
    return jsonError('Failed to activate VIP pass: ' + e.message, 500);
  }
}