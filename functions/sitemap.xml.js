/**
 * Cloudflare Pages Dynamic Sitemap Generator for RebaFilmes
 * Endpoint: /sitemap.xml
 *
 * Automatically aggregates top routes, genre hubs, and trending TMDB titles
 * with edge caching and XML schema compliance.
 */

const SITE_URL = 'https://www.rebafilmes.com';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const DEFAULT_TMDB_KEY = '3fd2be6f0c70a2a598f084dd1fb0648c';

function slugify(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function escapeXml(unsafe) {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const STATIC_URLS = [
  { loc: `${SITE_URL}/`, changefreq: 'daily', priority: '1.0' },
  { loc: `${SITE_URL}/movies`, changefreq: 'daily', priority: '0.9' },
  { loc: `${SITE_URL}/newsfeeds`, changefreq: 'daily', priority: '0.8' },
  { loc: `${SITE_URL}/search`, changefreq: 'daily', priority: '0.7' },
  { loc: `${SITE_URL}/terms`, changefreq: 'monthly', priority: '0.3' },
  { loc: `${SITE_URL}/search?type=movie`, changefreq: 'daily', priority: '0.8' },
  { loc: `${SITE_URL}/search?type=series`, changefreq: 'daily', priority: '0.8' },
  { loc: `${SITE_URL}/search?genre=28`, changefreq: 'weekly', priority: '0.7' },
  { loc: `${SITE_URL}/search?genre=12`, changefreq: 'weekly', priority: '0.7' },
  { loc: `${SITE_URL}/search?genre=16`, changefreq: 'weekly', priority: '0.7' },
  { loc: `${SITE_URL}/search?genre=35`, changefreq: 'weekly', priority: '0.7' },
  { loc: `${SITE_URL}/search?genre=80`, changefreq: 'weekly', priority: '0.7' },
  { loc: `${SITE_URL}/search?genre=99`, changefreq: 'weekly', priority: '0.7' },
  { loc: `${SITE_URL}/search?genre=18`, changefreq: 'weekly', priority: '0.7' },
  { loc: `${SITE_URL}/search?genre=10751`, changefreq: 'weekly', priority: '0.7' },
  { loc: `${SITE_URL}/search?genre=14`, changefreq: 'weekly', priority: '0.7' },
  { loc: `${SITE_URL}/search?genre=36`, changefreq: 'weekly', priority: '0.7' },
  { loc: `${SITE_URL}/search?genre=27`, changefreq: 'weekly', priority: '0.7' },
  { loc: `${SITE_URL}/search?genre=10402`, changefreq: 'weekly', priority: '0.7' },
  { loc: `${SITE_URL}/search?genre=9648`, changefreq: 'weekly', priority: '0.7' },
  { loc: `${SITE_URL}/search?genre=10749`, changefreq: 'weekly', priority: '0.7' },
  { loc: `${SITE_URL}/search?genre=878`, changefreq: 'weekly', priority: '0.7' },
  { loc: `${SITE_URL}/search?genre=53`, changefreq: 'weekly', priority: '0.7' },
  { loc: `${SITE_URL}/search?genre=10752`, changefreq: 'weekly', priority: '0.7' },
  { loc: `${SITE_URL}/search?genre=37`, changefreq: 'weekly', priority: '0.7' },
];

export async function onRequest(context) {
  const { request, env } = context;

  // Check Edge Cache
  let cache;
  try {
    cache = caches.default;
  } catch {
    cache = null;
  }

  const cacheKey = new Request(request.url, { method: 'GET' });
  if (cache) {
    try {
      const cached = await cache.match(cacheKey);
      if (cached) {
        return cached;
      }
    } catch {}
  }

  // Determine TMDB API Key
  let apiKey = env.TMDB_API_KEY;
  if (!apiKey || apiKey === 'your_tmdb_api_key_here') {
    if (env.KV) {
      try {
        const raw = await env.KV.get('rebafilme_settings');
        if (raw) {
          const s = JSON.parse(raw);
          if (s && s.tmdbApiKey && s.tmdbApiKey !== 'your_tmdb_api_key_here') {
            apiKey = s.tmdbApiKey;
          }
        }
      } catch {}
    }
  }
  if (!apiKey || apiKey === 'your_tmdb_api_key_here') {
    apiKey = DEFAULT_TMDB_KEY;
  }

  const dynamicUrls = [];
  const today = new Date().toISOString().split('T')[0];

  try {
    // Fetch Trending Titles (mixed Movies & TV)
    const res = await fetch(
      `${TMDB_BASE}/trending/all/week?api_key=${apiKey}&language=en-US&page=1`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (res.ok) {
      const data = await res.json();
      const results = data.results || [];

      for (const item of results) {
        if (item.media_type === 'person') continue;
        const title = item.title || item.name;
        if (!title || !item.id) continue;

        const isTv = item.media_type === 'tv' || Boolean(item.first_air_date);
        const slug = `${slugify(title)}-${item.id}`;
        const loc = `${SITE_URL}/movie/${slug}${isTv ? '?type=series' : ''}`;

        dynamicUrls.push({
          loc,
          lastmod: item.release_date || item.first_air_date || today,
          changefreq: 'weekly',
          priority: '0.8',
        });
      }
    }
  } catch (err) {
    console.warn('[Sitemap] Failed to fetch dynamic TMDB titles:', err);
  }

  const allUrls = [...STATIC_URLS, ...dynamicUrls];

  const xmlEntries = allUrls.map((u) => {
    return `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`;
  }).join('\n');

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</urlset>`;

  const response = new Response(xmlContent, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=14400',
      'X-Content-Type-Options': 'nosniff',
    },
  });

  if (cache) {
    try {
      context.waitUntil(cache.put(cacheKey, response.clone()));
    } catch {}
  }

  return response;
}
