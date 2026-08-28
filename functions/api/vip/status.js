// functions/api/vip/status.js
// GET /api/vip/status
// Real-time VIP verification & polling endpoint with automated Paypack fallback lookup

import { getSessionToken } from '../../_lib/cookies.js';
import { getTransactionStatus } from '../../_lib/paypack.js';

function jsonOk(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function jsonError(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return jsonError('Database not configured', 503);

  const url = new URL(request.url);
  const queryPhone = (url.searchParams.get('phone') || '').trim();
  const queryRef = (url.searchParams.get('ref') || '').trim();

  let userId = null;
  let userPlan = 'free';

  const sessionToken = getSessionToken(request);
  if (sessionToken) {
    try {
      const user = await env.DB.prepare(
        `SELECT u.id, u.plan, u.phone
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token = ? AND s.expires_at > datetime('now')`
      ).bind(sessionToken).first();

      if (user) {
        userId = user.id;
        userPlan = user.plan || 'free';
      }
    } catch (e) {
      console.warn('[vip/status] Session lookup error:', e);
    }
  }

  let activeSub = null;
  let pendingSub = null;

  try {
    if (queryRef) {
      activeSub = await env.DB.prepare(
        `SELECT id, user_id, phone, momo_tx_id, amount, plan, status, expires_at
         FROM vip_subscriptions
         WHERE momo_tx_id = ? AND status = 'approved' AND (expires_at IS NULL OR expires_at > datetime('now'))
         LIMIT 1`
      ).bind(queryRef).first();

      if (!activeSub) {
        pendingSub = await env.DB.prepare(
          `SELECT id, user_id, phone, momo_tx_id, amount, plan, status, created_at
           FROM vip_subscriptions
           WHERE momo_tx_id = ? AND status = 'pending'
           LIMIT 1`
        ).bind(queryRef).first();

        // Only attempt Paypack status lookup for Paypack refs — exclude NOWPayments (REBA_CARD_) orders
        if (pendingSub && queryRef && !queryRef.startsWith('REBA_CARD_') && !queryRef.startsWith('NOWPAY_')) {
          try {
            const paypackData = await getTransactionStatus({ env, ref: queryRef });
            const remoteStatus = String(paypackData?.status || '').toLowerCase();

            if (remoteStatus === 'successful') {
              let durationDays = 30;
              const plan = String(pendingSub.plan || '').toLowerCase();
              if (plan === 'daily') durationDays = 1;
              else if (plan === 'yearly') durationDays = 365;

              const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

              await env.DB.prepare(
                `UPDATE vip_subscriptions
                 SET status = 'approved',
                     expires_at = ?,
                     admin_notes = coalesce(admin_notes, '') || ' | Auto-approved via Polling Fallback',
                     updated_at = datetime('now')
                 WHERE id = ? AND status = 'pending'`
              ).bind(expiresAt, pendingSub.id).run();

              if (pendingSub.user_id) {
                await env.DB.prepare(
                  `UPDATE users SET plan = 'vip', updated_at = datetime('now') WHERE id = ?`
                ).bind(pendingSub.user_id).run();
              }

              activeSub = {
                ...pendingSub,
                status: 'approved',
                expires_at: expiresAt,
              };
              pendingSub = null;
            } else if (['failed', 'expired', 'cancelled', 'rejected'].includes(remoteStatus)) {
              await env.DB.prepare(
                `UPDATE vip_subscriptions
                 SET status = 'rejected',
                     admin_notes = coalesce(admin_notes, '') || ' | Paypack polling reported failed',
                     updated_at = datetime('now')
                 WHERE id = ?`
              ).bind(pendingSub.id).run();
              pendingSub = null;
            }
          } catch (pollingErr) {
            console.warn('[vip/status] Fallback polling check warning:', pollingErr);
          }
        }
      }
    }

    if (!activeSub && (userId || queryPhone)) {
      activeSub = await env.DB.prepare(
        `SELECT id, user_id, phone, momo_tx_id, amount, plan, status, expires_at
         FROM vip_subscriptions
         WHERE (user_id = ? OR (phone = ? AND ? != ''))
           AND status = 'approved'
           AND (expires_at IS NULL OR expires_at > datetime('now'))
         ORDER BY id DESC
         LIMIT 1`
      ).bind(userId || 'none', queryPhone, queryPhone).first();

      if (!activeSub && !pendingSub) {
        pendingSub = await env.DB.prepare(
          `SELECT id, user_id, phone, momo_tx_id, amount, plan, status, created_at
           FROM vip_subscriptions
           WHERE (user_id = ? OR (phone = ? AND ? != ''))
             AND status = 'pending'
           ORDER BY id DESC
           LIMIT 1`
        ).bind(userId || 'none', queryPhone, queryPhone).first();
      }
    }
  } catch (e) {
    console.error('[vip/status] DB lookup error:', e);
  }

  const isVip = Boolean(userPlan === 'vip' || activeSub);
  let daysRemaining = 0;
  let expiresAt = null;

  if (activeSub && activeSub.expires_at) {
    expiresAt = activeSub.expires_at;
    const diffMs = new Date(activeSub.expires_at).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  } else if (isVip) {
    daysRemaining = 30;
  }

  return jsonOk({
    isVip,
    plan: isVip ? (activeSub?.plan || 'monthly') : 'free',
    status: isVip ? 'approved' : (pendingSub ? 'pending' : 'none'),
    expiresAt: expiresAt,
    daysRemaining,
    hasPending: Boolean(pendingSub),
    pendingSubscription: pendingSub || null,
    subscription: activeSub || null,
  });
}