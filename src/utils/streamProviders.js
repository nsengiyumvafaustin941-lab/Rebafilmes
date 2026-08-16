/**
 * MovieJoy-grade 14-Provider Streaming Infrastructure & Embed Aggregation Engine
 * Optimized for RebaFilme
 *
 * Supports both Movie endpoints (TMDB ID / IMDb ID) and TV Series endpoints (TMDB ID + Season + Episode).
 */

export const STREAM_PROVIDERS = [
  {
    id: 'vidlink',
    name: 'VidLink Pro',
    domain: 'vidlink.pro',
    badge: '1080p Ultra',
    tier: 1,
    description: 'High-speed Next.js player with custom subtitles & playback persistence',
    buildUrl: (tmdbId, type = 'movie', season = 1, episode = 1) => {
      const id = String(tmdbId).trim();
      return type === 'series' || type === 'tv'
        ? `https://vidlink.pro/tv/${id}/${season}/${episode}?autoplay=true`
        : `https://vidlink.pro/movie/${id}?autoplay=true&title=true`;
    },
  },
  {
    id: 'vidnest',
    name: 'VidNest',
    domain: 'vidnest.fun',
    badge: 'Multi-Audio',
    tier: 1,
    description: 'Turbopack HLS player with multi-track audio and adaptive bitrate',
    buildUrl: (tmdbId, type = 'movie', season = 1, episode = 1) => {
      const id = String(tmdbId).trim();
      return type === 'series' || type === 'tv'
        ? `https://vidnest.fun/tv/${id}/${season}/${episode}`
        : `https://vidnest.fun/movie/${id}`;
    },
  },
  {
    id: 'vidsrc-mov',
    name: 'VidSrc Primary',
    domain: 'vidsrc.mov',
    badge: 'High Uptime',
    tier: 1,
    description: 'Primary high-availability stream node with global edge delivery',
    buildUrl: (tmdbId, type = 'movie', season = 1, episode = 1) => {
      const id = String(tmdbId).trim();
      return type === 'series' || type === 'tv'
        ? `https://vidsrc.mov/embed/tv/${id}/${season}/${episode}`
        : `https://vidsrc.mov/embed/movie/${id}`;
    },
  },
  {
    id: 'vidsrc-fyi',
    name: 'VidSrc Backup',
    domain: 'vidsrc.fyi',
    badge: 'Mirror',
    tier: 2,
    description: 'Direct fallback cluster for VidSrc resolution pipeline',
    buildUrl: (tmdbId, type = 'movie', season = 1, episode = 1) => {
      const id = String(tmdbId).trim();
      return type === 'series' || type === 'tv'
        ? `https://vidsrc.fyi/embed/tv/${id}/${season}/${episode}`
        : `https://vidsrc.fyi/embed/movie/${id}`;
    },
  },
  {
    id: 'vidfast',
    name: 'VidFast Pro',
    domain: 'vidfast.pro',
    badge: 'Low Latency',
    tier: 1,
    description: 'Low-latency chunk delivery optimized for instant start',
    buildUrl: (tmdbId, type = 'movie', season = 1, episode = 1) => {
      const id = String(tmdbId).trim();
      return type === 'series' || type === 'tv'
        ? `https://vidfast.pro/tv/${id}/${season}/${episode}?autoPlay=true`
        : `https://vidfast.pro/movie/${id}?autoPlay=true`;
    },
  },
  {
    id: 'vidup',
    name: 'VidUp Node',
    domain: 'vidup.to',
    badge: 'Fast',
    tier: 2,
    description: 'Load-balanced sister mirror of VidFast infrastructure',
    buildUrl: (tmdbId, type = 'movie', season = 1, episode = 1) => {
      const id = String(tmdbId).trim();
      return type === 'series' || type === 'tv'
        ? `https://vidup.to/tv/${id}/${season}/${episode}?autoPlay=true`
        : `https://vidup.to/movie/${id}?autoPlay=true`;
    },
  },
  {
    id: 'vidking',
    name: 'VidKing Direct',
    domain: 'vidking.net',
    badge: 'Bulletproof',
    tier: 2,
    description: 'DDoS-Guard protected offshore server node with Videasy backend',
    buildUrl: (tmdbId, type = 'movie', season = 1, episode = 1) => {
      const id = String(tmdbId).trim();
      return type === 'series' || type === 'tv'
        ? `https://www.vidking.net/embed/tv/${id}/${season}/${episode}`
        : `https://www.vidking.net/embed/movie/${id}`;
    },
  },
  {
    id: 'videasy',
    name: 'Videasy HLS',
    domain: 'player.videasy.net',
    badge: 'Encrypted',
    tier: 2,
    description: 'Encrypted HLS streaming proxy resistant to takedowns',
    buildUrl: (tmdbId, type = 'movie', season = 1, episode = 1) => {
      const id = String(tmdbId).trim();
      return type === 'series' || type === 'tv'
        ? `https://player.videasy.net/tv/${id}/${season}/${episode}`
        : `https://player.videasy.net/movie/${id}`;
    },
  },
  {
    id: 'peachify',
    name: 'Peachify HD',
    domain: 'peachify.top',
    badge: '1080p',
    tier: 2,
    description: 'High-bitrate HLS streaming with clean WebVTT subtitles',
    buildUrl: (tmdbId, type = 'movie', season = 1, episode = 1) => {
      const id = String(tmdbId).trim();
      return type === 'series' || type === 'tv'
        ? `https://peachify.top/embed/tv/${id}/${season}/${episode}`
        : `https://peachify.top/embed/movie/${id}`;
    },
  },
  {
    id: 'multiembed',
    name: 'MultiEmbed',
    domain: 'multiembed.mov',
    badge: 'Multi-Host',
    tier: 3,
    description: 'Simultaneous scraper for MegaCloud, UpCloud, Streamtape & Filemoon',
    buildUrl: (tmdbId, type = 'movie', season = 1, episode = 1) => {
      const id = String(tmdbId).trim();
      return type === 'series' || type === 'tv'
        ? `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${season}&e=${episode}`
        : `https://multiembed.mov/?video_id=${id}&tmdb=1`;
    },
  },
  {
    id: '111movies',
    name: '111Movies',
    domain: '111movies.com',
    badge: 'Tokenized',
    tier: 3,
    description: 'Lightweight client runtime with short-lived session security',
    buildUrl: (tmdbId, type = 'movie', season = 1, episode = 1) => {
      const id = String(tmdbId).trim();
      return type === 'series' || type === 'tv'
        ? `https://111movies.com/tv/${id}/${season}/${episode}`
        : `https://111movies.com/movie/${id}`;
    },
  },
  {
    id: '2embed',
    name: '2Embed CC',
    domain: 'www.2embed.cc',
    badge: 'Classic',
    tier: 3,
    description: 'Legacy multi-cyberlocker resolver with extensive catalogue',
    buildUrl: (tmdbId, type = 'movie', season = 1, episode = 1) => {
      const id = String(tmdbId).trim();
      return type === 'series' || type === 'tv'
        ? `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`
        : `https://www.2embed.cc/embed/${id}`;
    },
  },
  {
    id: 'superflixapi',
    name: 'SuperFlix Dubs',
    domain: 'superflixapi.co',
    badge: 'Multi-Lang',
    tier: 3,
    description: 'Regional multi-audio support including dubbed & subbed releases',
    buildUrl: (tmdbId, type = 'movie', season = 1, episode = 1) => {
      const id = String(tmdbId).trim();
      return type === 'series' || type === 'tv'
        ? `https://superflixapi.co/serie/${id}/${season}/${episode}`
        : `https://superflixapi.co/filme/${id}`;
    },
  },
  {
    id: 'vidrock',
    name: 'VidRock',
    domain: 'vidrock.net',
    badge: 'Backup',
    tier: 3,
    description: 'React SPA embed provider with dynamic player bundling',
    buildUrl: (tmdbId, type = 'movie', season = 1, episode = 1) => {
      const id = String(tmdbId).trim();
      return type === 'series' || type === 'tv'
        ? `https://vidrock.net/tv/${id}/${season}/${episode}`
        : `https://vidrock.net/movie/${id}`;
    },
  },
];

/**
 * Get provider by ID or fallback to the primary recommended provider
 */
export function getProviderById(providerId) {
  return STREAM_PROVIDERS.find((p) => p.id === providerId) || STREAM_PROVIDERS[0];
}

/**
 * Generate stream URL for a given movie/show
 */
export function buildStreamUrl(providerId, tmdbId, type = 'movie', season = 1, episode = 1) {
  const provider = getProviderById(providerId);
  return provider.buildUrl(tmdbId, type, season, episode);
}

/**
 * Returns preconnect / dns-prefetch URLs for document head optimization
 */
export const STREAM_PRECONNECT_DOMAINS = [
  'https://vidlink.pro',
  'https://vidnest.fun',
  'https://vidsrc.mov',
  'https://vidfast.pro',
  'https://www.vidking.net',
  'https://player.videasy.net',
  'https://peachify.top',
  'https://multiembed.mov',
  'https://image.tmdb.org',
];
