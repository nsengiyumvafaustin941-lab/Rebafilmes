// functions/api/ads/track.js
// POST /api/ads/track — Atomic telemetry for ad impressions, clicks & SmartLink triggers
// GET /api/ads/track — Query stats for ad ID or SmartLinks

import { checkRateLimit } from '../../_lib/ratelimit.js';

const AD_COUNTER_PREFIX = 'ad_counter:';
const SL_STATS_PREFIX = 'rebafilme_sl_stats_';

export async function onRequestPost({ request, env }) {
  if (!env.KV) {
    return new Response(JSON.stringify({ error: 'KV storage not configured' }), { 
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Rate limit: 120 events per minute per IP
  const allowed = await checkRateLimit(request, env, 120, 60);
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { 
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { id, type, targetDomain } = body || {};

  try {
    if (type === 'impression' && id) {
      const key = `${AD_COUNTER_PREFIX}${id}:impression`;
      const current = parseInt(await env.KV.get(key) || '0', 10) || 0;
      await env.KV.put(key, String(current + 1));
      return new Response(JSON.stringify({ success: true, count: current + 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (type === 'click' && id) {
      const key = `${AD_COUNTER_PREFIX}${id}:click`;
      const current = parseInt(await env.KV.get(key) || '0', 10) || 0;
      await env.KV.put(key, String(current + 1));
      return new Response(JSON.stringify({ success: true, count: current + 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (type === 'smartlink_trigger') {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const key = `${SL_STATS_PREFIX}${today}`;
      let stats = {};
      try {
        const raw = await env.KV.get(key);
        if (raw) stats = JSON.parse(raw);
      } catch {}

      stats.totalTriggers = (stats.totalTriggers || 0) + 1;
      stats.domains = stats.domains || {};
      if (targetDomain) {
        const domainKey = String(targetDomain).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 64);
        stats.domains[domainKey] = (stats.domains[domainKey] || 0) + 1;
      }

      await env.KV.put(key, JSON.stringify(stats), { expirationTtl: 7776000 }); // 90 days
      return new Response(JSON.stringify({ success: true, stats }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Unsupported event type' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('[ads/track] Error recording telemetry:', err);
    return new Response(JSON.stringify({ error: 'Telemetry recording failed' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestGet({ request, env }) {
  if (!env.KV) {
    return new Response(JSON.stringify({ error: 'KV not configured' }), { status: 503 });
  }

  const url = new URL(request.url);
  const adId = url.searchParams.get('id');
  const date = url.searchParams.get('date');

  try {
    if (adId) {
      const impKey = `${AD_COUNTER_PREFIX}${adId}:impression`;
      const clickKey = `${AD_COUNTER_PREFIX}${adId}:click`;
      const [impressions, clicks] = await Promise.all([
        env.KV.get(impKey).then((v) => parseInt(v || '0', 10) || 0),
        env.KV.get(clickKey).then((v) => parseInt(v || '0', 10) || 0),
      ]);
      return new Response(JSON.stringify({ adId, impressions, clicks }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (date) {
      const key = `${SL_STATS_PREFIX}${date}`;
      const raw = await env.KV.get(key);
      const stats = raw ? JSON.parse(raw) : { totalTriggers: 0, domains: {} };
      return new Response(JSON.stringify({ date, ...stats }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Missing id or date parameter' }), { status: 400 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
