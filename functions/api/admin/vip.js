// functions/api/admin/vip.js
// Admin VIP Management & Revenue Analytics Endpoint
// Supports Multi-Currency (RWF + USD), Method Filtering, and Granular Actions

import { requireAdmin } from '../../_lib/adminAuth.js';

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

// GET /api/admin/vip - List subscriptions & multi-currency stats
export async function onRequestGet(context) {
  const { request, env } = context;
  const admin = await requireAdmin(context);
  if (!admin) return jsonError('Unauthorized admin access', 401);
  if (!env.DB) return jsonError('Database not configured', 503);

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get('status') || 'all';
  const methodFilter = url.searchParams.get('method') || 'all'; // 'all' | 'momo' | 'crypto' | 'voucher'
  const search = (url.searchParams.get('search') || '').trim().toLowerCase();
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(5, parseInt(url.searchParams.get('limit') || '50', 10)));
  const offset = (page - 1) * limit;

  try {
    // 1. Fetch Summary Stats
    const statsQuery = await env.DB.prepare(`
      SELECT
        COUNT(*) as totalRequests,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingCount,
        SUM(CASE WHEN status = 'approved' AND (expires_at IS NULL OR expires_at > datetime('now')) THEN 1 ELSE 0 END) as activeVipCount,
        SUM(CASE WHEN status = 'approved' AND payment_method = 'paypack'      THEN CAST(amount AS REAL) ELSE 0 END) as totalRevenueRwf,
        SUM(CASE WHEN status = 'approved' AND payment_method = 'nowpayments'  THEN CAST(amount AS REAL) ELSE 0 END) as totalRevenueUsd
      FROM vip_subscriptions
    `).first();

    // 2. Build Filtered Query
    let whereClauses = [];
    let bindParams = [];

    if (statusFilter === 'pending') {
      whereClauses.push("v.status = 'pending'");
    } else if (statusFilter === 'approved') {
      whereClauses.push("v.status = 'approved' AND (v.expires_at IS NULL OR v.expires_at > datetime('now'))");
    } else if (statusFilter === 'expired') {
      whereClauses.push("v.status = 'approved' AND v.expires_at <= datetime('now')");
    } else if (statusFilter === 'rejected') {
      whereClauses.push("v.status = 'rejected'");
    } else if (statusFilter === 'refunded') {
      whereClauses.push("v.status = 'refunded'");
    }

    if (methodFilter === 'crypto') {
      whereClauses.push("v.payment_method = 'nowpayments'");
    } else if (methodFilter === 'momo') {
      whereClauses.push("v.payment_method = 'paypack'");
    } else if (methodFilter === 'voucher') {
      whereClauses.push("v.payment_method = 'passcode'");
    }

    if (search) {
      whereClauses.push("(lower(v.phone) LIKE ? OR lower(v.momo_tx_id) LIKE ? OR lower(coalesce(u.email, '')) LIKE ? OR lower(coalesce(u.name, '')) LIKE ?)");
      const term = `%${search}%`;
      bindParams.push(term, term, term, term);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const listQuery = `
      SELECT
        v.id,
        v.user_id,
        v.phone,
        v.momo_tx_id,
        v.amount,
        v.plan,
        v.status,
        v.admin_notes,
        v.expires_at,
        v.created_at,
        v.updated_at,
        u.email as user_email,
        u.name as user_name
      FROM vip_subscriptions v
      LEFT JOIN users u ON u.id = v.user_id
      ${whereSql}
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
    `;

    bindParams.push(limit, offset);

    const subscriptions = await env.DB.prepare(listQuery).bind(...bindParams).all();

    return jsonOk({
      stats: {
        totalRequests: statsQuery?.totalRequests || 0,
        pendingCount: statsQuery?.pendingCount || 0,
        activeVipCount: statsQuery?.activeVipCount || 0,
        totalRevenueRwf: statsQuery?.totalRevenueRwf || 0,
        totalRevenueUsd: statsQuery?.totalRevenueUsd || 0,
      },
      subscriptions: subscriptions.results || [],
      page,
      limit,
    });
  } catch (err) {
    console.error('[admin/vip] Error fetching subscriptions:', err);
    return jsonError('Failed to fetch subscriptions: ' + err.message, 500);
  }
}

// POST /api/admin/vip - Manual Approve, Reject, Revoke, Extend, or Refund VIP
export async function onRequestPost(context) {
  const { request, env } = context;
  const admin = await requireAdmin(context);
  if (!admin) return jsonError('Unauthorized admin access', 401);
  if (!env.DB) return jsonError('Database not configured', 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const { subscriptionId, action, days = 30, adminNotes } = body;
  if (!subscriptionId || !action) {
    return jsonError('Missing subscriptionId or action', 400);
  }

  try {
    const sub = await env.DB.prepare(
      `SELECT id, user_id, phone, status, expires_at, admin_notes FROM vip_subscriptions WHERE id = ?`
    ).bind(subscriptionId).first();

    if (!sub) return jsonError('Subscription not found', 404);

    if (action === 'approve') {
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      await env.DB.prepare(`
        UPDATE vip_subscriptions
        SET status = 'approved', expires_at = ?, admin_notes = coalesce(?, admin_notes), updated_at = datetime('now')
        WHERE id = ?
      `).bind(expiresAt, adminNotes || `Manually approved (${days} days) by ${admin.username || 'Admin'}`, subscriptionId).run();

      if (sub.user_id) {
        await env.DB.prepare(`UPDATE users SET plan = 'vip', updated_at = datetime('now') WHERE id = ?`).bind(sub.user_id).run();
      }

      return jsonOk({ success: true, message: `Approved for ${days} days`, expiresAt });
    }

    if (action === 'extend') {
      const currentExpiry = sub.expires_at ? new Date(sub.expires_at).getTime() : Date.now();
      const baseTime = Math.max(Date.now(), currentExpiry);
      const newExpiry = new Date(baseTime + days * 24 * 60 * 60 * 1000).toISOString();

      await env.DB.prepare(`
        UPDATE vip_subscriptions
        SET status = 'approved', expires_at = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(newExpiry, subscriptionId).run();

      if (sub.user_id) {
        await env.DB.prepare(`UPDATE users SET plan = 'vip', updated_at = datetime('now') WHERE id = ?`).bind(sub.user_id).run();
      }

      return jsonOk({ success: true, message: `Extended by ${days} days`, expiresAt: newExpiry });
    }

    if (action === 'revoke' || action === 'reject' || action === 'refund') {
      const newStatus = action === 'reject' ? 'rejected' : action === 'refund' ? 'refunded' : 'expired';
      await env.DB.prepare(`
        UPDATE vip_subscriptions
        SET status = ?, expires_at = datetime('now'), admin_notes = coalesce(admin_notes, '') || ' | ' || ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(newStatus, `Subscription ${action}ed by ${admin.username || 'Admin'}`, subscriptionId).run();

      if (sub.user_id) {
        await env.DB.prepare(`UPDATE users SET plan = 'free', updated_at = datetime('now') WHERE id = ?`).bind(sub.user_id).run();
      }

      const response = { success: true, message: `Subscription ${action}ed successfully` };

      // ⚠️ IMPORTANT: DB status is marked 'refunded' but no payment reversal API
      // was called. You must manually issue the refund via the Paypack or
      // NOWPayments dashboard to actually return funds to the customer.
      if (action === 'refund') {
        response.refund_note = 'MANUAL ACTION REQUIRED: The subscription is marked refunded in the database, but no funds have been returned to the customer. Please complete the refund manually via the Paypack or NOWPayments merchant dashboard.';
      }

      return jsonOk(response);
    }

    return jsonError(`Unknown action '${action}'`, 400);
  } catch (err) {
    console.error('[admin/vip] Action error:', err);
    return jsonError('Failed to execute action: ' + err.message, 500);
  }
}
