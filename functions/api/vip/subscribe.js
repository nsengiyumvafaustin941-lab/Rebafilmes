// functions/api/vip/subscribe.js
// POST /api/vip/subscribe → Submit MoMo transaction ID for VIP activation with Paypack verification

import { checkRateLimit } from '../../_lib/ratelimit.js';
import { getSessionToken } from '../../_lib/cookies.js';
import { getTransactionStatus } from '../../_lib/paypack.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return jsonError('Database not configured. Please contact support.', 503);
  }

  // 1. Rate limiting (max 5 submissions per 15 mins per IP)
  const allowed = await checkRateLimit(request, env, 5, 900);
  if (!allowed) {
    return jsonError('Too many submissions. Please wait a few minutes before trying again.', 429);
  }

  // 2. Parse body
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON payload', 400);
  }

  const { phone, momoTxId, amount: rawAmount = 1000, planType: rawPlan = 'monthly' } = body || {};

  if (!phone || !momoTxId) {
    return jsonError('Both Phone Number and MoMo Transaction ID are required', 400);
  }

  const cleanPhone = String(phone).trim();
  const cleanTxId = String(momoTxId).trim().toUpperCase();

  if (cleanTxId.length < 3) {
    return jsonError('Invalid MoMo Transaction ID format', 400);
  }

  const planType = ['daily', 'monthly', 'yearly'].includes(String(rawPlan).toLowerCase())
    ? String(rawPlan).toLowerCase()
    : 'monthly';

  let amount = parseInt(rawAmount, 10) || 1000;
  if (amount < 0 || amount > 500000) {
    amount = 1000;
  }

  // 3. Resolve logged-in user if available via session cookie
  let userId = null;
  const sessionToken = getSessionToken(request);
  if (sessionToken) {
    try {
      const session = await env.DB.prepare(
        'SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime("now")'
      ).bind(sessionToken).first();
      if (session && session.user_id) {
        userId = session.user_id;
      }
    } catch (e) {
      console.warn('Session check warning in subscribe:', e);
    }
  }

  // 4. Ensure vip_subscriptions table exists (safety fallback)
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS vip_subscriptions (
        id          TEXT PRIMARY KEY,
        user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
        phone       TEXT NOT NULL,
        momo_tx_id  TEXT NOT NULL UNIQUE COLLATE NOCASE,
        amount      INTEGER NOT NULL DEFAULT 1000,
        plan        TEXT NOT NULL DEFAULT 'monthly',
        status      TEXT NOT NULL DEFAULT 'pending',
        expires_at  TEXT,
        admin_notes TEXT,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).run().catch(() => {});
  } catch {}

  // 5. Check if Transaction ID already exists in DB
  try {
    const existing = await env.DB.prepare(
      'SELECT id, status, created_at, expires_at FROM vip_subscriptions WHERE momo_tx_id = ?'
    ).bind(cleanTxId).first();

    if (existing) {
      if (existing.status === 'approved') {
        return jsonError('This MoMo Transaction ID has already been approved and activated.', 400);
      }
      if (existing.status === 'pending') {
        return jsonOk({
          success: true,
          subscription: existing,
          message: 'Your payment submission is already under review. It will be verified shortly.',
        });
      }
      if (existing.status === 'rejected') {
        return jsonError('This Transaction ID was previously marked invalid. Please contact WhatsApp support.', 400);
      }
    }
  } catch (err) {
    console.error('Check existing tx error:', err);
  }

  // 6. Verify Transaction with Paypack Gateway API
  let verificationStatus = 'pending';
  let verifiedAmount = amount;
  let adminNotes = `Plan: ${planType} | Manual TxID Submission`;

  try {
    const paypackData = await getTransactionStatus({ env, ref: cleanTxId });
    if (paypackData) {
      const remoteStatus = String(paypackData.status || '').toLowerCase();
      if (remoteStatus === 'successful') {
        verificationStatus = 'approved';
        verifiedAmount = paypackData.amount || amount;
        adminNotes += ' | Verified & Auto-approved via Paypack Gateway';
      } else if (['failed', 'cancelled', 'rejected', 'expired'].includes(remoteStatus)) {
        return jsonError(`Transaction ${cleanTxId} was marked as '${remoteStatus}' on payment gateway.`, 400);
      }
    }
  } catch (paypackErr) {
    console.warn('[vip/subscribe] Paypack lookup warning:', paypackErr);
  }

  // Calculate duration based on planType
  let durationDays = 30;
  if (planType === 'daily') durationDays = 1;
  else if (planType === 'yearly') durationDays = 365;

  const expiresAt = verificationStatus === 'approved'
    ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // 7. Insert subscription
  const subId = crypto.randomUUID();
  try {
    await env.DB.prepare(`
      INSERT INTO vip_subscriptions (id, user_id, phone, momo_tx_id, amount, plan, status, expires_at, admin_notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(subId, userId, cleanPhone, cleanTxId, verifiedAmount, planType, verificationStatus, expiresAt, adminNotes).run();

    if (verificationStatus === 'approved' && userId) {
      await env.DB.prepare(
        `UPDATE users SET plan = 'vip', updated_at = datetime('now') WHERE id = ?`
      ).bind(userId).run().catch(() => {});
    }

    return jsonOk({
      success: true,
      subscription: {
        id: subId,
        phone: cleanPhone,
        momoTxId: cleanTxId,
        amount: verifiedAmount,
        plan: planType,
        status: verificationStatus,
        expiresAt: expiresAt,
        createdAt: new Date().toISOString(),
      },
      message: verificationStatus === 'approved'
        ? 'Payment verified successfully! Your VIP Pass is now active.'
        : 'Payment received! Your transaction is under verification.',
    });
  } catch (err) {
    console.error('Insert subscription error:', err);
    return jsonError('Failed to record subscription: ' + err.message, 500);
  }
}

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
