// functions/api/vip/crypto-webhook.js
// POST /api/vip/crypto-webhook
// Instant Automated Webhook Receiver for NOWPayments (Card-to-Crypto & Direct Crypto)
// SEC: Full HMAC-SHA512 signature validation via x-nowpayments-sig header

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

/**
 * Compute HMAC-SHA512 of a string using the Web Crypto API (available in Cloudflare Workers).
 * NOWPayments signs the *sorted* JSON body using the IPN secret.
 */
async function computeHmacSha512(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * NOWPayments IPN signature: HMAC-SHA512 of the *sorted-keys* JSON body.
 * Reference: https://nowpayments.io/help/what-is-instant-payment-notification
 */
function sortedJson(obj) {
  if (typeof obj !== 'object' || obj === null) return JSON.stringify(obj);
  const sorted = {};
  Object.keys(obj)
    .sort()
    .forEach((k) => {
      sorted[k] = obj[k];
    });
  return JSON.stringify(sorted);
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return jsonError('Database not configured', 503);

  // ── SEC-1: HMAC-SHA512 Webhook Authentication ──────────────────────────────
  const ipnSecret = env.NOWPAYMENTS_IPN_SECRET;
  if (!ipnSecret) {
    console.error('[vip/crypto-webhook] NOWPAYMENTS_IPN_SECRET is not configured');
    return jsonError('Payment gateway not configured', 503);
  }

  const incomingSig = request.headers.get('x-nowpayments-sig');
  if (!incomingSig) {
    console.warn('[vip/crypto-webhook] Missing x-nowpayments-sig header — rejected');
    return jsonError('Missing webhook signature', 401);
  }

  // Buffer the raw body for both HMAC computation and JSON parsing
  let rawBody;
  try {
    rawBody = await request.text();
  } catch {
    return jsonError('Failed to read request body', 400);
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return jsonError('Invalid JSON payload', 400);
  }

  // NOWPayments signs the *sorted-keys* JSON representation of the body
  const expectedSig = await computeHmacSha512(ipnSecret, sortedJson(body));

  if (incomingSig !== expectedSig) {
    console.warn('[vip/crypto-webhook] Signature mismatch — possible spoofed IPN');
    return jsonError('Invalid webhook signature', 401);
  }
  // ── End HMAC Auth ──────────────────────────────────────────────────────────

  // NOWPayments IPN body payload shape:
  // { payment_id, invoice_id, payment_status, pay_address, price_amount, price_currency,
  //   pay_amount, actually_paid, pay_currency, order_id, order_description,
  //   outcome_amount, outcome_currency }
  const orderId       = String(body.order_id || '').trim();
  const paymentStatus = String(body.payment_status || '').toLowerCase();
  const payCurrency   = String(body.pay_currency || '').toUpperCase();
  const actuallyPaid  = Number(body.actually_paid ?? body.outcome_amount ?? body.price_amount ?? 0);
  const priceAmount   = Number(body.price_amount ?? 0); // quoted amount at invoice creation

  if (!orderId) {
    return jsonError('Missing order_id in IPN payload', 400);
  }

  // Only process truly final statuses; acknowledge everything else gracefully
  const isFinished = ['finished', 'confirmed'].includes(paymentStatus);
  if (!isFinished) {
    // Return 200 so NOWPayments stops retrying for non-final statuses
    return jsonOk({
      received: true,
      ignored: true,
      status: paymentStatus,
      reason: `Status '${paymentStatus}' is not a final payment status`,
    });
  }

  try {
    // 1. Locate matching subscription by order_id
    const sub = await env.DB.prepare(
      `SELECT id, user_id, phone, status, amount, admin_notes
       FROM vip_subscriptions
       WHERE momo_tx_id = ?
       ORDER BY id DESC LIMIT 1`
    ).bind(orderId).first();

    // ── SEC-4: Amount Validation (5% fee tolerance) ─────────────────────────
    // Use the quoted price from the IPN body (authoritative from NOWPayments)
    // as a cross-check. The DB `amount` column stores what we originally quoted.
    const expectedAmount = sub ? Number(sub.amount) : priceAmount;
    if (expectedAmount > 0 && actuallyPaid > 0) {
      const minAcceptable = expectedAmount * 0.90; // 10% tolerance covers crypto volatility + fees
      if (actuallyPaid < minAcceptable) {
        console.warn(
          `[vip/crypto-webhook] Under-payment detected: paid=${actuallyPaid} expected=${expectedAmount} orderId=${orderId}`
        );
        return jsonError(
          `Payment amount ${actuallyPaid} is below the required minimum of ${minAcceptable.toFixed(2)}`,
          402
        );
      }
    }
    // ── End Amount Validation ───────────────────────────────────────────────

    // 2. Calculate duration from admin_notes stored at invoice creation time
    //    admin_notes stores: "Plan: monthly | NOWPayments Card/Crypto Invoice: ..."
    let durationDays = 30;
    const notesLower = (sub?.admin_notes || '').toLowerCase();
    if (notesLower.includes('daily') || notesLower.includes('plan: daily')) {
      durationDays = 1;
    } else if (notesLower.includes('yearly') || notesLower.includes('plan: yearly')) {
      durationDays = 365;
    }
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    if (sub) {
      // ── SEC-5: Idempotency — skip if already approved ────────────────────
      if (sub.status === 'approved') {
        return jsonOk({ success: true, message: 'Already approved', subscriptionId: sub.id });
      }

      // Auto-approve existing pending record in D1
      await env.DB.prepare(
        `UPDATE vip_subscriptions
         SET status = 'approved',
             expires_at = ?,
             admin_notes = coalesce(admin_notes, '') || ' | Auto-approved via NOWPayments IPN (' || ? || ') paid=' || ?,
             updated_at = datetime('now')
         WHERE id = ? AND status = 'pending'`
      ).bind(expiresAt, payCurrency || 'CARD/USDT', String(actuallyPaid), sub.id).run();

      // Upgrade linked user account plan to 'vip'
      if (sub.user_id) {
        await env.DB.prepare(
          `UPDATE users SET plan = 'vip', updated_at = datetime('now') WHERE id = ?`
        ).bind(sub.user_id).run();
      }

      console.log(`[vip/crypto-webhook] Approved subscription ${sub.id} for order ${orderId} (${durationDays}d)`);
      return jsonOk({ success: true, approved: true, subscriptionId: sub.id, orderId });

    } else {
      // Fallback: auto-insert a new approved record for direct/unknown checkout flows
      const insertResult = await env.DB.prepare(
        `INSERT INTO vip_subscriptions
         (user_id, phone, momo_tx_id, amount, status, expires_at, admin_notes, created_at, updated_at)
         VALUES (NULL, 'NOWPayments User', ?, ?, 'approved', ?,
                 'Created & Approved via NOWPayments Direct IPN | currency=' || ?,
                 datetime('now'), datetime('now'))`
      ).bind(orderId, actuallyPaid, expiresAt, payCurrency || 'UNKNOWN').run();

      console.log(`[vip/crypto-webhook] Direct IPN insert for unknown order ${orderId}`);
      return jsonOk({ success: true, approved: true, subscriptionId: insertResult.meta?.last_row_id });
    }

  } catch (e) {
    console.error('[vip/crypto-webhook] Error processing IPN:', e);
    return jsonError('Internal IPN processing error: ' + e.message, 500);
  }
}
