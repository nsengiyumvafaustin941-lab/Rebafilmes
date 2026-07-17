import { getSessionToken } from '../../_lib/cookies.js';
import { hashPassword, verifyPassword } from '../../_lib/crypto.js';

export async function onRequestPut({ request, env }) {
  const token = getSessionToken(request);
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  // Get user session
  const session = await env.DB.prepare(
    'SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime("now")'
  ).bind(token).first();

  if (!session) return new Response(JSON.stringify({ error: 'Session expired' }), { status: 401 });

  try {
    const { currentPassword, newPassword } = await request.json();
    if (!currentPassword || !newPassword) {
      return new Response(JSON.stringify({ error: 'Current password and new password are required' }), { status: 400 });
    }
    if (newPassword.length < 6) {
      return new Response(JSON.stringify({ error: 'New password must be at least 6 characters long' }), { status: 400 });
    }

    // Get current password hash
    const user = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?')
      .bind(session.user_id)
      .first();

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Current password is incorrect' }), { status: 400 });
    }

    // Hash new password and save
    const newHash = await hashPassword(newPassword);
    await env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?')
      .bind(newHash, session.user_id)
      .run();

    return new Response(JSON.stringify({ success: true, message: 'Password changed successfully' }));
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid request data' }), { status: 400 });
  }
}
