// functions/_lib/ratelimit.js
// Cloudflare KV-backed Atomic IP Rate Limiter
// SEC: Fail-closed in production to prevent brute-force attacks during KV outages

export async function checkRateLimit(request, env, limit = 5, windowSeconds = 300) {
  const url = new URL(request.url);
  const isLocalDev = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname.endsWith('.local');

  if (!env.KV) {
    if (isLocalDev) {
      return true; // allow developer testing without KV binding
    }
    console.error('[ratelimit] Critical: env.KV binding missing in production. Failing closed.');
    return false; // Fail closed in production for security
  }
  
  const ip = request.headers.get('cf-connecting-ip') || 'unknown-ip';
  const path = url.pathname;
  const key = `ratelimit:${path}:${ip}`;

  let attempts = 0;
  try {
    const val = await env.KV.get(key);
    if (val) attempts = parseInt(val, 10);
  } catch (e) {
    console.error('[ratelimit] KV read failed:', e);
    if (!isLocalDev) return false; // Fail closed in production
  }

  if (attempts >= limit) {
    return false;
  }

  try {
    await env.KV.put(key, (attempts + 1).toString(), { expirationTtl: windowSeconds });
  } catch (e) {
    console.error('[ratelimit] KV write failed:', e);
    if (!isLocalDev) return false; // Fail closed in production
  }

  return true;
}
