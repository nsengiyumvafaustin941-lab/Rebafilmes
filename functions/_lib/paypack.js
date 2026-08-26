// functions/_lib/paypack.js
// Paypack Rwanda API Helper (MTN MoMo & Airtel Money Integration)

const PAYPACK_BASE_URL = 'https://payment.paypack.rw/api';

// ── Resilient Fetch Helper ───────────────────────────────────────────────────
// Retries on 5xx/network errors with exponential backoff.
// Never retries on 4xx (client errors / auth failures).
// Each attempt has its own 10s AbortController timeout.
async function fetchWithRetry(url, options = {}, retries = 3) {
  const delays = [500, 1000, 2000]; // ms between retries

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 10000); // 10s per attempt

    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      // Don't retry 4xx — these are definitive failures
      if (res.status >= 400 && res.status < 500) return res;

      // Retry 5xx if we have attempts left
      if (!res.ok && attempt < retries) {
        console.warn(`[paypack] Attempt ${attempt + 1} returned ${res.status} — retrying in ${delays[attempt]}ms`);
        await new Promise(r => setTimeout(r, delays[attempt]));
        continue;
      }

      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';

      if (attempt < retries) {
        console.warn(`[paypack] Attempt ${attempt + 1} failed (${isTimeout ? 'timeout' : err.message}) — retrying in ${delays[attempt]}ms`);
        await new Promise(r => setTimeout(r, delays[attempt]));
      } else {
        throw isTimeout ? new Error('Paypack API timed out after 10s') : err;
      }
    }
  }
}

/**
 * Normalizes Rwandan phone numbers into standardized format (e.g. 0788821628)
 * Accepts: 078xxxxxxx, 079xxxxxxx, 072xxxxxxx, 073xxxxxxx, +25078xxxxxxx, 25078xxxxxxx, 78xxxxxxx
 */
export function normalizeRwandanPhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '');

  if (digits.startsWith('250')) {
    digits = digits.slice(3);
  }

  if (digits.length === 9 && (digits.startsWith('78') || digits.startsWith('79') || digits.startsWith('72') || digits.startsWith('73'))) {
    digits = '0' + digits;
  }

  const isValid = /^07[2389]\d{7}$/.test(digits);
  return { phone: digits, isValid };
}

/**
 * Retrieves a valid Paypack JWT OAuth token.
 * Caches in Cloudflare KV if available with 15-minute TTL.
 */
export async function getPaypackToken(env) {
  const clientId = env.PAYPACK_CLIENT_ID;
  const clientSecret = env.PAYPACK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('[paypack] Missing PAYPACK_CLIENT_ID or PAYPACK_CLIENT_SECRET in environment');
    return null;
  }

  const cacheKey = `paypack_jwt_${clientId.slice(0, 8)}`;

  // 1. Check KV cache
  if (env.KV) {
    try {
      const cached = await env.KV.get(cacheKey);
      if (cached) return cached;
    } catch (e) {
      console.warn('[paypack] KV token cache read error:', e);
    }
  }

  // 2. Fetch fresh token from Paypack OAuth (with retry + timeout)
  try {
    const res = await fetchWithRetry(`${PAYPACK_BASE_URL}/auth/agents/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[paypack] Authorize failed:', res.status, errText);
      return null;
    }

    const data = await res.json();
    const token = data.access_token;

    // Cache in KV for 15 minutes (token usually expires in 30-60 mins)
    if (token && env.KV) {
      try {
        await env.KV.put(cacheKey, token, { expirationTtl: 900 });
      } catch (e) {
        console.warn('[paypack] KV token cache write error:', e);
      }
    }

    return token;
  } catch (err) {
    console.error('[paypack] Authorize request error:', err);
    return null;
  }
}

/**
 * Triggers a 1-Click USSD Cash-In prompt on the customer's mobile device
 */
export async function initiateCashIn({ env, phone, amount }) {
  const token = await getPaypackToken(env);
  if (!token) {
    return { success: false, error: 'Paypack gateway authentication failed' };
  }

  try {
    const res = await fetchWithRetry(`${PAYPACK_BASE_URL}/transactions/cashin`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount),
        number: phone,
        environment: 'production',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.warn('[paypack] Cash-in rejected by gateway:', data);
      return {
        success: false,
        error: data.message || 'Payment initiation rejected by telecom network',
      };
    }

    return {
      success: true,
      ref: data.ref,
      status: data.status || 'pending',
      raw: data,
    };
  } catch (err) {
    console.error('[paypack] Cash-in exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Queries transaction status from Paypack API
 */
export async function getTransactionStatus({ env, ref }) {
  if (!ref) return null;

  const token = await getPaypackToken(env);
  if (!token) return null;

  try {
    const res = await fetchWithRetry(`${PAYPACK_BASE_URL}/transactions/find/${encodeURIComponent(ref)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('[paypack] Find transaction error:', err);
    return null;
  }
}

/**
 * Verifies webhook request authenticity using secret token / header
 */
export function verifyWebhookAuth({ request, env }) {
  const secret = env.MOMO_WEBHOOK_SECRET || env.PAYPACK_CLIENT_SECRET;
  if (!secret) return false; // if secret is not configured, deny (fail-closed)

  const url = new URL(request.url);
  const querySecret = url.searchParams.get('secret') || url.searchParams.get('token');
  const headerSecret = request.headers.get('x-paypack-secret') ||
                       request.headers.get('x-webhook-secret') ||
                       request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (querySecret && querySecret === secret) return true;
  if (headerSecret && headerSecret === secret) return true;

  if (headerSecret && (headerSecret === env.PAYPACK_CLIENT_ID || headerSecret === env.PAYPACK_CLIENT_SECRET)) {
    return true;
  }

  return false;
}
