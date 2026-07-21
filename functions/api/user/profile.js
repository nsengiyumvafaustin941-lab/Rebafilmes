import { getSessionToken } from '../../_lib/cookies.js';

export async function onRequestPut({ request, env }) {
  if (!env.DB) return new Response(JSON.stringify({ error: 'Database not configured' }), { status: 503, headers: { 'Content-Type': 'application/json' } });

  const token = getSessionToken(request);
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  // Get user session
  const session = await env.DB.prepare(
    'SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime("now")'
  ).bind(token).first();

  if (!session) return new Response(JSON.stringify({ error: 'Session expired' }), { status: 401 });

  try {
    const { name, phone } = await request.json();
    if (!name || name.trim() === '') {
      return new Response(JSON.stringify({ error: 'Name is required' }), { status: 400 });
    }

    // Update user record
    await env.DB.prepare(
      'UPDATE users SET name = ?, phone = ?, updated_at = datetime("now") WHERE id = ?'
    ).bind(name.trim(), phone || null, session.user_id).run();

    // Fetch updated user to return
    const updatedUser = await env.DB.prepare(
      'SELECT id, email, name, phone, plan, status FROM users WHERE id = ?'
    ).bind(session.user_id).first();

    return new Response(JSON.stringify({ success: true, user: updatedUser }));
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request data' }), { status: 400 });
  }
}
