import { hashPassword } from '../../_lib/crypto.js';

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const { identifier, code, newPassword } = body;
  if (!identifier || !code || !newPassword) {
    return new Response(JSON.stringify({ error: 'Identifier, code, and new password are required' }), { status: 400 });
  }
  if (newPassword.length < 6) {
    return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), { status: 400 });
  }

  const inputVal = String(identifier).trim().toLowerCase();
  let searchPhone = inputVal;

  if (!inputVal.includes('@')) {
    let clean = inputVal.replace(/[^\d+]/g, '');
    if (!clean.startsWith('+')) {
      if (clean.startsWith('250')) {
        clean = '+' + clean;
      } else {
        clean = '+250' + clean.replace(/^0+/, '');
      }
    }
    searchPhone = clean;
  }

  const user = await env.DB.prepare(
    'SELECT id, email, phone FROM users WHERE email = ? OR phone = ? OR email = ?'
  )
    .bind(inputVal, searchPhone, `${searchPhone.replace('+', '')}@phone.rebafilme.local`)
    .first();

  if (!user) {
    return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
  }

  // Verify code from KV
  let isValidCode = false;
  if (env.KV) {
    const savedCode = await env.KV.get(`reset:${user.id}`);
    if (savedCode && savedCode === code) {
      isValidCode = true;
      await env.KV.delete(`reset:${user.id}`);
    }
  } else {
    // If KV is not bound, reset password won't work securely.
    console.warn('KV namespace not bound. Cannot verify reset code securely.');
  }

  if (!isValidCode) {
    return new Response(JSON.stringify({ error: 'Invalid or expired recovery code' }), { status: 400 });
  }

  // Update password in DB
  const hashed = await hashPassword(newPassword);
  await env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?')
    .bind(hashed, user.id)
    .run();

  return new Response(JSON.stringify({ success: true, message: 'Password reset successfully!' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
