// functions/api/vip/crypto-initiate.js
// POST /api/vip/crypto-initiate
// Initiates NOWPayments Card-to-Crypto invoice (Credit Cards, Apple Pay, USDT, Crypto)
// SEC: Server-authoritative pricing — client-supplied amountUsd is IGNORED

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

// ── Server-Authoritative USD Price Table ────────────────────────────────────
// These are the canonical prices. Client-supplied amountUsd is NEVER trusted.
const DEFAULT_USD_PRICES = {
  daily:   0.99,
  monthly: 3.99,
  yearly:  34.99,
};

/**
 * Read prices from KV admin settings (same pattern as initiate.js for RWF prices).
 * Falls back to DEFAULT_USD_PRICES if KV is unavailable or value is unset.
 */
async function getUsdPrice(env, planType) {
  const fallback = DEFAULT_USD_PRICES[planType] ?? DEFAULT_USD_PRICES.monthly;
  if (!env.KV) return fallback;

  try {
    const rawSettings = await env.KV.get('rebafilme_settings');
    if (!rawSettings) return fallback;

    const settings = JSON.parse(rawSettings);
    const keyMap = { daily: 'vipPriceUsdDaily', monthly: 'vipPriceUsdMonthly', yearly: 'vipPriceUsdYearly' };
    const rawVal = settings[keyMap[planType]];
    if (!rawVal) return fallback;

    const parsed = parseFloat(String(rawVal).replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  } catch (e) {
    console.warn('[vip/crypto-initiate] KV price read warning:', e);
    return fallback;
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return jsonError('Database not configured', 503);

  // 1. Enforce IP Rate Limiting (max 10 checkout attempts per 15 mins)
  const allowed = await checkRateLimit(request, env, 10, 900);
  if (!allowed) {
    return jsonError('Too many payment attempts. Please wait a few minutes before trying again.', 429);
  }

  // ── SEC-2: Fail hard if API key is missing — no hardcoded fallback ──────
  const apiKey = env.NOWPAYMENTS_API_KEY;
  if (!apiKey) {
    console.error('[vip/crypto-initiate] NOWPAYMENTS_API_KEY environment variable is not set');
    return jsonError('Payment gateway is not configured. Please contact support.', 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const rawPlan  = String(body.planType || 'monthly').toLowerCase();
  const planType = ['daily', 'monthly', 'yearly'].includes(rawPlan) ? rawPlan : 'monthly';

  // ── SEC-4: Server-authoritative price — client value is ignored ──────────
  const amountUsd = await getUsdPrice(env, planType);

  const customerEmail = String(body.email || '').trim();

  // 2. Identify User Session if logged in (optional for crypto — no account required)
  let userId = null;
  const sessionToken = getSessionToken(request);
  if (sessionToken) {
    try {
      const user = await env.DB.prepare(
        `SELECT u.id FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > datetime('now')`
      ).bind(sessionToken).first();
      if (user) userId = user.id;
    } catch (e) {
      console.warn('[vip/crypto-initiate] Session check error:', e);
    }
  }

  // 3. Generate unique IDs with timestamp + entropy
  const orderId = `REBA_CARD_${Date.now()}_${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
  const subId   = crypto.randomUUID();

  // ── DB-FIRST PATTERN ──────────────────────────────────────────────────────
  // Insert the pending record BEFORE calling NOWPayments.
  // This guarantees that any invoice created in NOWPayments has a matching DB
  // row, so the IPN webhook can always find and approve the subscription.
  // If NOWPayments fails we mark the row 'failed' and return an error.
  // If it succeeds we update the row with the real nowpaymentsId.
  // ─────────────────────────────────────────────────────────────────────────

  // 4. Pre-insert pending subscription row
  try {
    await env.DB.prepare(
      `INSERT INTO vip_subscriptions
         (id, user_id, phone, customer_email, payment_method, momo_tx_id, amount, plan, status, admin_notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'nowpayments', ?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))`
    ).bind(
      subId,
      userId,
      customerEmail || 'Card/Crypto User',
      customerEmail || null,
      orderId,                                        // used as order reference before NP ID is known
      amountUsd,
      planType,
      `Plan: ${planType} | NOWPayments Card/Crypto | USD: ${amountUsd} | Awaiting invoice creation`
    ).run();
  } catch (dbErr) {
    console.error('[vip/crypto-initiate] Pre-insert DB error:', dbErr);
    return jsonError('Database error before payment initiation: ' + dbErr.message, 500);
  }

  // 5. Call NOWPayments to create the hosted invoice (10s timeout)
  const originUrl      = new URL(request.url).origin;
  const ipnCallbackUrl = `${originUrl}/api/vip/crypto-webhook`;
  const successUrl     = `${originUrl}/?vip_status=success&ref=${orderId}`;
  const cancelUrl      = `${originUrl}/?vip_status=cancel`;

  let invoiceUrl    = null;
  let nowpaymentsId = null;

  try {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const payload = {
      price_amount:       amountUsd,
      price_currency:     'usd',
      order_id:           orderId,
      order_description:  `RebaFilme VIP ${planType.toUpperCase()} Pass — Cards & Crypto`,
      ipn_callback_url:   ipnCallbackUrl,
      success_url:        successUrl,
      cancel_url:         cancelUrl,
      ...(customerEmail ? { customer_email: customerEmail } : {}),
    };

    const npRes = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-api-key':    apiKey,
        'Content-Type': 'application/json',
        'User-Agent':   'RebaFilme/1.0 (Cloudflare Worker; NOWPayments Client)',
      },
      body: JSON.stringify(payload),
    });

    clearTimeout(timeoutId);

    if (!npRes.ok) {
      const errText = await npRes.text();
      console.error('[vip/crypto-initiate] NOWPayments error response:', errText);

      // Mark the pre-inserted row as failed so it doesn't linger as pending
      await env.DB.prepare(
        `UPDATE vip_subscriptions SET status = 'failed', admin_notes = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(`Invoice creation failed: ${errText.slice(0, 200)}`, subId).run().catch(() => {});

      return jsonError('Failed to generate card/crypto invoice: ' + errText, 502);
    }

    const npData  = await npRes.json();
    invoiceUrl    = npData.invoice_url;
    nowpaymentsId = npData.id;

  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    const msg       = isTimeout ? 'Payment gateway timed out (>10s)' : err.message;
    console.error('[vip/crypto-initiate] NOWPayments fetch error:', err);

    // Mark the pre-inserted row as failed
    await env.DB.prepare(
      `UPDATE vip_subscriptions SET status = 'failed', admin_notes = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(`Network error: ${msg}`, subId).run().catch(() => {});

    return jsonError('Network error connecting to payment gateway: ' + msg, 500);
  }

  if (!invoiceUrl) {
    await env.DB.prepare(
      `UPDATE vip_subscriptions SET status = 'failed', admin_notes = 'No invoice URL returned by NOWPayments', updated_at = datetime('now') WHERE id = ?`
    ).bind(subId).run().catch(() => {});
    return jsonError('NOWPayments did not return an invoice URL', 502);
  }

  // 6. Update the row with the real NOWPayments invoice ID
  try {
    await env.DB.prepare(
      `UPDATE vip_subscriptions
       SET admin_notes = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      `Plan: ${planType} | NOWPayments Card/Crypto Invoice: ${nowpaymentsId} | USD: ${amountUsd}`,
      subId
    ).run();
  } catch (updateErr) {
    // Non-fatal: row exists and is pending; webhook will still find it by orderId
    console.warn('[vip/crypto-initiate] Admin notes update warning:', updateErr);
  }

  return jsonOk({
    success:        true,
    orderId:        orderId,
    invoiceUrl:     invoiceUrl,
    nowpaymentsId:  nowpaymentsId,
    amountUsd:      amountUsd,
    planType:       planType,
    subscriptionId: subId,
    message:        'Card & Crypto invoice generated successfully!',
  });
}
