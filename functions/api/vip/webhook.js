// functions/api/vip/webhook.js
// POST /api/vip/webhook
// Instant Automated Webhook Receiver for Paypack & MoMo Callbacks

import { verifyWebhookAuth } from '../../_lib/paypack.js';

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

export async function onRequestPost({ request, env }) {
  if (!env.DB) return jsonError('Database not configured', 503);

  if (!env.MOMO_WEBHOOK_SECRET) {
    return jsonError('Webhook secret not configured', 500);
  }

  if (!verifyWebhookAuth({ request, env })) {
    return jsonError('Unauthorized webhook signature or token', 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON payload', 400);
  }

  const dataObj = body.data || body;
  const rawTx = dataObj.ref || dataObj.momoTxId || dataObj.txId || dataObj.reference || dataObj.transaction_id || '';
  const momoTxId = String(rawTx).trim();
  const rawStatus = String(dataObj.status || body.status || '').toUpperCase();
  const clientPhone = String(dataObj.client || dataObj.phone || dataObj.number || '').trim();
  const rawAmount = dataObj.amount || body.amount || 0;

  if (!momoTxId && !clientPhone) {
    return jsonError('Missing transaction reference or phone in webhook payload', 400);
  }

  const amount = parseInt(rawAmount, 10);
  if (isNaN(amount) || amount <= 0) {
    return jsonError(`Invalid payment amount ${rawAmount}`, 400);
  }

  const isSuccess = ['SUCCESS', 'SUCCESSFUL', 'APPROVED', 'COMPLETED'].includes(rawStatus);
  const isFailed = ['FAILED', 'EXPIRED', 'CANCELLED', 'REJECTED'].includes(rawStatus);

  try {
    let sub = null;
    if (momoTxId) {
      sub = await env.DB.prepare(
        `SELECT id, user_id, phone, status, amount, plan, admin_notes
         FROM vip_subscriptions
         WHERE momo_tx_id = ?
         ORDER BY id DESC LIMIT 1`
      ).bind(momoTxId).first();
    }

    if (!sub && clientPhone) {
      sub = await env.DB.prepare(
        `SELECT id, user_id, phone, status, amount, plan, admin_notes
         FROM vip_subscriptions
         WHERE phone = ? AND status = 'pending'
         ORDER BY id DESC LIMIT 1`
      ).bind(clientPhone).first();
    }

    if (isFailed && sub && sub.status === 'pending') {
      await env.DB.prepare(
        `UPDATE vip_subscriptions
         SET status = 'rejected',
             admin_notes = coalesce(admin_notes, '') || ' | Webhook reported failed: ' || ?,
             updated_at = datetime('now')
         WHERE id = ?`
      ).bind(rawStatus, sub.id).run();

      return jsonOk({ received: true, status: 'rejected', subscriptionId: sub.id });
    }

    if (!isSuccess) {
      return jsonOk({ received: true, ignored: true, reason: `Status '${rawStatus}' is not successful` });
    }

    if (sub) {
      if (sub.status === 'rejected' || sub.status === 'expired') {
        return jsonOk({ success: false, message: 'Subscription previously rejected or expired. Requires admin review.', subscriptionId: sub.id });
      }

      if (sub.status === 'approved') {
        return jsonOk({ success: true, message: 'Already approved', subscriptionId: sub.id });
      }

      let durationDays = 30;
      const plan = String(sub?.plan || '').toLowerCase();
      if (plan === 'daily' || (sub?.admin_notes && sub.admin_notes.includes('daily'))) {
        durationDays = 1;
      } else if (plan === 'yearly' || (sub?.admin_notes && sub.admin_notes.includes('yearly'))) {
        durationDays = 365;
      }

      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

      await env.DB.prepare(
        `UPDATE vip_subscriptions
         SET status = 'approved',
             expires_at = ?,
             momo_tx_id = coalesce(?, momo_tx_id),
             admin_notes = coalesce(admin_notes, '') || ' | Auto-approved via Paypack Webhook',
             updated_at = datetime('now')
         WHERE id = ? AND status = 'pending'`
      ).bind(expiresAt, momoTxId || null, sub.id).run();

      let targetUserId = sub.user_id;
      if (!targetUserId && (clientPhone || sub.phone)) {
        const matchingUser = await env.DB.prepare(
          `SELECT id FROM users WHERE phone = ? OR phone = ? LIMIT 1`
        ).bind(clientPhone || 'none', sub.phone || 'none').first();
        if (matchingUser) {
          targetUserId = matchingUser.id;
          await env.DB.prepare(
            `UPDATE vip_subscriptions SET user_id = ? WHERE id = ?`
          ).bind(targetUserId, sub.id).run();
        }
      }

      if (targetUserId) {
        await env.DB.prepare(
          `UPDATE users SET plan = 'vip', updated_at = datetime('now') WHERE id = ?`
        ).bind(targetUserId).run();
      }

      return jsonOk({ success: true, approved: true, subscriptionId: sub.id });
    } else {
      const newSubId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      let fallbackUserId = null;
      if (clientPhone) {
        const matchingUser = await env.DB.prepare(
          `SELECT id FROM users WHERE phone = ? LIMIT 1`
        ).bind(clientPhone).first();
        if (matchingUser) fallbackUserId = matchingUser.id;
      }

      await env.DB.prepare(
        `INSERT INTO vip_subscriptions (id, user_id, phone, momo_tx_id, amount, plan, status, expires_at, admin_notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'monthly', 'approved', ?, 'Created & Approved via Direct Webhook', datetime('now'), datetime('now'))`
      ).bind(
        newSubId,
        fallbackUserId,
        clientPhone || 'Unknown',
        momoTxId || 'PAYPACK_' + Date.now(),
        amount,
        expiresAt
      ).run();

      if (fallbackUserId) {
        await env.DB.prepare(
          `UPDATE users SET plan = 'vip', updated_at = datetime('now') WHERE id = ?`
        ).bind(fallbackUserId).run();
      }

      return jsonOk({ success: true, approved: true, subscriptionId: newSubId });
    }
  } catch (e) {
    console.error('[vip/webhook] Error processing webhook:', e);
    return jsonError('Internal webhook processing error: ' + e.message, 500);
  }
}