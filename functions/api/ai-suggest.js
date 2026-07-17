/**
 * /api/ai-suggest — Groq-powered movie recommendation Worker
 * Reads movies from Cloudflare KV (rebafilme_admin_movies) and
 * asks Groq (Llama) to pick the best matches for the user's query.
 */

const MOVIES_KEY = 'rebafilme_admin_movies';
const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant'; // Fast & capable model on Groq

// Simple in-memory rate limit: 1 request per 3 s per IP
const recentRequests = new Map();
function isRateLimited(ip) {
  const now  = Date.now();
  const last = recentRequests.get(ip) || 0;
  if (now - last < 3000) return true;
  recentRequests.set(ip, now);
  // Prevent memory growth
  if (recentRequests.size > 500) {
    const oldest = [...recentRequests.entries()].sort((a, b) => a[1] - b[1])[0];
    recentRequests.delete(oldest[0]);
  }
  return false;
}

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export async function onRequest(context) {
  const { request, env } = context;

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS });
  }

  // Rate limit
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please wait a moment.' }), { status: 429, headers: CORS });
  }

  // Validate API key
  const GROQ_API_KEY = env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return new Response(JSON.stringify({ error: 'AI service not configured.' }), { status: 503, headers: CORS });
  }

  // Parse request body
  let query = '';
  try {
    const body = await request.json();
    query = (body.query || '').trim().slice(0, 300);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body.' }), { status: 400, headers: CORS });
  }

  if (!query) {
    return new Response(JSON.stringify({ error: 'Query is required.' }), { status: 400, headers: CORS });
  }

  // Fetch movies from KV
  let movies = [];
  if (env.KV) {
    try {
      const raw = await env.KV.get(MOVIES_KEY);
      if (raw) movies = JSON.parse(raw);
    } catch {
      // KV read failed — continue with empty list
    }
  }

  if (!movies || movies.length === 0) {
    return new Response(JSON.stringify({
      suggestions: [],
      message: 'No movies in the library yet.',
    }), { status: 200, headers: CORS });
  }

  // Build compact catalog (only fields needed for matching)
  const catalog = movies.map(m => ({
    id:          m.id,
    title:       m.title,
    type:        m.type        || 'movie',
    genre:       m.genre       || '',
    country:     m.country     || '',
    year:        m.year        || '',
    description: (m.description || '').slice(0, 200),
  }));

  const systemPrompt = `You are a bilingual movie assistant for RebaFilme — a streaming platform with African and Asian original, non-translated movies.
Your job is to recommend movies from the provided library that best match the user's request.

RULES:
1. Select the 3 best matching movies or series from the library ONLY. Never invent titles.
2. Detect whether the user wrote in English or Kinyarwanda, and respond in THAT language.
3. If the user wrote in Kinyarwanda, write the "reason" field in Kinyarwanda.
4. If the user wrote in English, write the "reason" field in English.
5. "reason" must be 1 short sentence explaining why it matches.
6. Return ONLY valid JSON — no markdown, no extra text outside the JSON.
7. Format: { "suggestions": [ { "id": ..., "title": "...", "reason": "..." } ] }
8. If nothing matches, return: { "suggestions": [], "message": "No matching movies found." }`;

  const userMessage = `MOVIE LIBRARY:\n${JSON.stringify(catalog)}\n\nUSER REQUEST: "${query}"`;

  // Call Groq
  let groqResponse;
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userMessage  },
        ],
        temperature:  0.3,
        max_tokens:   512,
        // Ask Groq to return JSON directly
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Groq error:', errText);
      return new Response(JSON.stringify({ error: 'AI service error. Please try again.' }), { status: 502, headers: CORS });
    }

    groqResponse = await res.json();
  } catch (e) {
    console.error('Groq fetch failed:', e);
    return new Response(JSON.stringify({ error: 'Could not reach AI service.' }), { status: 502, headers: CORS });
  }

  // Parse Groq output
  let parsed;
  try {
    const text    = groqResponse?.choices?.[0]?.message?.content || '';
    const cleaned = text.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return new Response(JSON.stringify({ error: 'AI returned an unexpected response. Try again.' }), { status: 500, headers: CORS });
  }

  // Enrich suggestions with poster + movie metadata from KV
  const suggestions = (parsed.suggestions || []).map(s => {
    const movie = movies.find(m => String(m.id) === String(s.id));
    return {
      id:     s.id,
      title:  s.title,
      reason: s.reason,
      poster: movie?.poster || '',
      genre:  movie?.genre  || '',
      type:   movie?.type   || 'movie',
      year:   movie?.year   || '',
    };
  });

  return new Response(JSON.stringify({
    suggestions,
    message: parsed.message || null,
  }), { status: 200, headers: CORS });
}
