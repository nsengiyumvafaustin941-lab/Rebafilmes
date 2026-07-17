// functions/api/admin/users.js
// GET  /api/admin/users          → list all users (admin only)
// PATCH /api/admin/users?id=xxx  → update user plan/status (admin only)

function isAdmin(request, env) {
  const token = request.headers.get('x-admin-token');
  return token && token === env.ADMIN_PASSWORD;
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

export async function onRequest(context) {
  const { request, env } = context;

  if (!env.DB) return jsonError('Database not configured', 503);
  if (!isAdmin(request, env)) return jsonError('Unauthorized', 401);

  const method = request.method;
  const url = new URL(request.url);

  // ── GET: list all users ────────────────────────────────────────────
  if (method === 'GET') {
    try {
      const { results } = await env.DB.prepare(
        `SELECT id, email, name, phone, plan, status, created_at AS joinedAt
         FROM users
         ORDER BY created_at DESC
         LIMIT 500`
      ).all();

      return jsonOk({ users: results || [] });
    } catch (e) {
      console.error('Admin list users error:', e);
      return jsonError('Failed to fetch users: ' + e.message, 500);
    }
  }

  // ── PATCH: update a user's plan or status ──────────────────────────
  if (method === 'PATCH') {
    const id = url.searchParams.get('id');
    if (!id) return jsonError('Missing user id', 400);

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonError('Invalid JSON body', 400);
    }

    const allowed = ['plan', 'status'];
    const updates = Object.entries(body).filter(([k]) => allowed.includes(k));
    if (updates.length === 0) return jsonError('No valid fields to update', 400);

    // Validate values
    const validPlans = ['free', 'vip'];
    const validStatuses = ['active', 'banned'];
    for (const [k, v] of updates) {
      if (k === 'plan' && !validPlans.includes(v)) return jsonError(`Invalid plan: ${v}`, 400);
      if (k === 'status' && !validStatuses.includes(v)) return jsonError(`Invalid status: ${v}`, 400);
    }

    try {
      const setClauses = updates.map(([k]) => `${k} = ?`).join(', ');
      const values = updates.map(([, v]) => v);

      await env.DB.prepare(
        `UPDATE users SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`
      )
        .bind(...values, id)
        .run();

      return jsonOk({ success: true });
    } catch (e) {
      console.error('Admin update user error:', e);
      return jsonError('Failed to update user: ' + e.message, 500);
    }
  }

  return jsonError('Method not allowed', 405);
}
