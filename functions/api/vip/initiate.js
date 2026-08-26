// functions/api/vip/initiate.js
// POST /api/vip/initiate
// Automated 1-Click USSD Cash-In trigger via Paypack (MTN MoMo & Airtel Rwanda)
// SEC: Server-authoritative pricing + DB-First Pattern (prevents orphaned USSD prompts)

import { getSessionToken } from '../../_lib/cookies.js';
import { checkRateLimit } from '../../_lib/ratelimit.js';
import { normalizeRwandanPhone, initiateCashIn } from '../../_lib/paypack.js';

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

const DEFAULT_TIER_PRICES = {
  daily: 1000,
  monthly: 5000,
  yearly: 45000,
};

function parsePrice(val, fallback) {
  if (typeof val === 'number' && Number.isFinite(val) && val > 0) return Math.round(val);
  if (!val) return fallback;
  const num = parseInt(String(val).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return jsonError('Database not configured', 503);

  // 1. Enforce IP Rate Limiting (max 10 checkout attempts per 15 mins)
  const allowed = await checkRateLimit(request, env, 10, 900);
  if (!allowed) {
    return jsonError('Too many payment attempts. Please wait a few minutes before trying again.', 429);
  }

  // 2. Parse request payload
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const { phone: rawPhone, planType: rawPlan = 'monthly' } = body || {};

  // 3. Normalize & validate Rwandan phone number (MTN / Airtel)
  const { phone: cleanPhone, isValid } = normalizeRwandanPhone(rawPhone);
  if (!isValid) {
    return jsonError('Please enter a valid Rwandan phone number (e.g. 078xxxxxxx, 079xxxxxxx, 072xxxxxxx, 073xxxxxxx)', 400);
  }

  const planType = ['daily', 'monthly', 'yearly'].includes(String(rawPlan).toLowerCase())
    ? String(rawPlan).toLowerCase()
    : 'monthly';

  // 4. Determine Dynamic Pricing Server-Side (prevent client price manipulation)
  let amount = DEFAULT_TIER_PRICES[planType] || 5000;
  if (env.KV) {
    try {
      const rawSettings = await env.KV.get('rebafilme_settings');
      if (rawSettings) {
        const settings = JSON.parse(rawSettings);
        if (planType === 'daily') {
          amount = parsePrice(settings.vipPriceDaily, amount);
        } else if (planType === 'monthly') {
          amount = parsePrice(settings.vipPriceMonthly, amount);
        } else if (planType === 'yearly') {
          amount = parsePrice(settings.vipPriceYearly, amount);
        }
      }
    } catch (e) {
      console.warn('[vip/initiate] KV settings read warning:', e);
    }
  }

  // 5. Identify User Session - Require Account for Multi-Device VIP Sync
  let userId = null;
  const sessionToken = getSessionToken(request);
  if (sessionToken) {
    try {
      const user = await env.DB.prepare(
        `SELECT u.id, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > datetime('now')`
      ).bind(sessionToken).first();
      if (user) {
        userId = user.id;
      }
    } catch (e) {
      console.warn('[vip/initiate] Session check error:', e);
    }
  }

  if (!userId) {
    return jsonError('Kugira ngo ugure VIP kandi uyikoreshe ku bikoresho byawe byose (Telefone, Laptop, TV), banza winjire muri konti yawe cyangwa ufungure nshya.', 401);
  }

  // 6. Generate unique IDs with timestamp + entropy
  const subId = crypto.randomUUID();
  const initialRef = `REBA_MOMO_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  // ── DB-FIRST PATTERN ──────────────────────────────────────────────────────
  // Pre-insert pending subscription record in D1 BEFORE calling Paypack Cash-In.
  // This guarantees that any USSD prompt dispatched to a user's phone has a
  // corresponding database record ready to be approved when webhook arrives.
  // ─────────────────────────────────────────────────────────────────────────
  try {
    await env.DB.prepare(
      `INSERT INTO vip_subscriptions
         (id, user_id, phone, payment_method, momo_tx_id, amount, plan, status, admin_notes, created_at, updated_at)
       VALUES (?, ?, ?, 'paypack', ?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))`
    ).bind(
      subId,
      userId,
      cleanPhone,
      initialRef,
      amount,
      planType,
      `Plan: ${planType} | Paypack MoMo | Initializing USSD Cash-In`
    ).run();
  } catch {
    // Graceful fallback for pre-migration schema
    try {
      await env.DB.prepare(
        `INSERT INTO vip_subscriptions
           (id, user_id, phone, momo_tx_id, amount, plan, status, admin_notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))`
      ).bind(
        subId,
        userId,
        cleanPhone,
        initialRef,
        amount,
        planType,
        `Plan: ${planType} | Paypack MoMo | Initializing USSD Cash-In`
      ).run();
    } catch (fallbackErr) {
      console.error('[vip/initiate] DB pre-insert failed:', fallbackErr);
      return jsonError('Database error before payment dispatch: ' + fallbackErr.message, 500);
    }
  }

  // 7. Dispatch Cash-In Request to Paypack Gateway
  let cashinRes;
  try {
    cashinRes = await initiateCashIn({
      env,
      phone: cleanPhone,
      amount,
    });
  } catch (err) {
    console.error('[vip/initiate] Paypack dispatch exception:', err);
    await env.DB.prepare(
      `UPDATE vip_subscriptions SET status = 'failed', admin_notes = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(`Paypack Cash-In exception: ${String(err.message).slice(0, 200)}`, subId).run().catch(() => {});
    return jsonError('Payment gateway communication error: ' + (err.message || 'Please try again'), 502);
  }

  if (!cashinRes || !cashinRes.success) {
    const errorMsg = cashinRes?.error || 'Failed to dispatch MoMo PIN prompt. Please verify phone number and try again.';
    console.warn('[vip/initiate] Paypack initiation failed:', errorMsg);

    // Update the pre-inserted record to failed
    await env.DB.prepare(
      `UPDATE vip_subscriptions
       SET status = 'failed',
           admin_notes = ?,
           updated_at = datetime('now')
       WHERE id = ?`
    ).bind(`Paypack Cash-In dispatch failed: ${String(errorMsg).slice(0, 200)}`, subId).run().catch(() => {});

    return jsonError(errorMsg, 502);
  }

  const finalRef = cashinRes.ref || initialRef;
  const ussdSent = Boolean(cashinRes.ref);

  // 8. Update the pending record with the final gateway reference
  try {
    await env.DB.prepare(
      `UPDATE vip_subscriptions
       SET momo_tx_id = ?,
           admin_notes = ?,
           updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      finalRef,
      `Plan: ${planType} | Automated Paypack USSD | ${ussdSent ? 'Prompt Dispatched' : 'Offline/Fallback'} | Gateway Ref: ${finalRef}`,
      subId
    ).run();
  } catch (updateErr) {
    console.warn('[vip/initiate] Gateway ref update warning:', updateErr);
  }

  return jsonOk({
    success: true,
    ref: finalRef,
    phone: cleanPhone,
    amount: amount,
    planType: planType,
    ussdSent: ussdSent,
    subscriptionId: subId,
    message: ussdSent
      ? `MoMo PIN prompt sent to ${cleanPhone}! Please enter your PIN on your phone.`
      : `Order created for ${cleanPhone}. Please approve prompt or check MoMo on your phone.`
  });
}
