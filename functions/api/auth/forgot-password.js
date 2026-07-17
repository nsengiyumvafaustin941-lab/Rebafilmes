export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const { identifier } = body;
  if (!identifier) {
    return new Response(JSON.stringify({ error: 'Email or Phone is required' }), { status: 400 });
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
    // Return generic success to prevent user enumeration
    return new Response(
      JSON.stringify({ success: true, message: 'If the account exists, a recovery code has been sent.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Generate a random 6-digit code
  const recoveryCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Save code to KV with 10-minute expiry
  if (env.KV) {
    await env.KV.put(`reset:${user.id}`, recoveryCode, { expirationTtl: 600 });
  } else {
    console.warn('KV namespace not bound. Password reset will rely on fallback code or will fail in production.');
  }

  // Send the code via Email or SMS
  try {
    if (user.email && !user.email.endsWith('@phone.rebafilme.local')) {
      await sendRecoveryEmail(user.email, recoveryCode, env);
    } else if (user.phone) {
      await sendRecoverySMS(user.phone, recoveryCode, env);
    }
  } catch (error) {
    console.error('Failed to send recovery code:', error);
    // We still return 200 so we don't leak whether it worked/existed
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'A recovery code has been sent to your email or phone.'
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

async function sendRecoveryEmail(email, code, env) {
  // Using Cloudflare's free MailChannels integration
  // This works automatically in production without API keys!
  const sendRequest = new Request('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: email, name: 'RebaFilme User' }],
        },
      ],
      from: {
        email: 'noreply@rebafilme.com', // MUST be a domain you own and verify with DNS
        name: 'RebaFilme Support',
      },
      subject: 'Password Recovery Code',
      content: [
        {
          type: 'text/html',
          value: `<p>Your password recovery code is: <strong>${code}</strong></p><p>This code will expire in 10 minutes.</p>`,
        },
      ],
    }),
  });

  try {
    const resp = await fetch(sendRequest);
    if (!resp.ok) {
      const text = await resp.text();
      console.error('MailChannels Error:', text);
    } else {
      console.log(`[MAILCHANNELS] Sent recovery code ${code} to email ${email}`);
    }
  } catch (err) {
    console.error('Failed to connect to MailChannels:', err);
  }
}

async function sendRecoverySMS(phone, code, env) {
  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
    const formData = new URLSearchParams();
    formData.append('To', phone);
    formData.append('From', env.TWILIO_PHONE_NUMBER);
    formData.append('Body', `Your RebaFilme recovery code is: ${code}`);

    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });
  } else {
    // Production stub when API key is missing
    console.log(`[STUB] Would send recovery code ${code} to SMS ${phone}`);
  }
}
