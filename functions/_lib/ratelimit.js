// functions/_lib/ratelimit.js
export async function checkRateLimit(request, env, limit = 5, windowSeconds = 300) {
  if (!env.KV) return true; // Fail open if KV not bound
  
  const ip = request.headers.get('cf-connecting-ip') || 'unknown-ip';
  const path = new URL(request.url).pathname;
  const key = `ratelimit:${path}:${ip}`;

  let attempts = 0;
  try {
    const val = await env.KV.get(key);
    if (val) attempts = parseInt(val, 10);
  } catch (e) {
    console.error('Rate limit KV read failed', e);
  }

  if (attempts >= limit) {
    return false;
  }

  try {
    await env.KV.put(key, (attempts + 1).toString(), { expirationTtl: windowSeconds });
  } catch (e) {
    console.error('Rate limit KV write failed', e);
  }

  return true;
}
