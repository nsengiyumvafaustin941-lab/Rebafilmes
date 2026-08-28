import { useEffect, useRef } from 'react';
import { getSettings } from '../utils/settings';
import { LAST_POP_KEY, POP_INDEX_KEY } from '../utils/constants';
import { useVIP } from './useVIP';
import { useAdmin } from '../contexts/AdminContext';
import { useMonetizationEnabled } from './useMonetizationEnabled';

// ── Elements that should NEVER trigger a popunder ──────────────
const BLOCKED_SELECTORS = [
  'button',
  'input',
  'textarea',
  'select',
  'label',
  'a[href^="#"]',   // anchor-only hash links (accordions, tabs)
  '.modal',
  '.vip-modal',
  '.adm-',          // any admin UI element
  '[data-no-pop]',  // opt-out attribute for individual elements
  '.sidebar',
  '.footer',
  '.movie-section .view-all', // "View All" links inside section headers
].join(',');

// Selector for elements that SHOULD count as meaningful navigation
const TRIGGER_SELECTORS = [
  'a[href]:not([href^="#"])',  // real navigation links
  '[data-smartlink-trigger]', // explicit opt-in attribute
  '.movie-card',
  '.hero-card',
  '.movie-poster',
  '.content-card',
].join(',');

export const SMARTLINKS_RR_KEY = 'rebafilme_sl_rr_idx';

/**
 * Parses raw newline-separated SmartLinks text into structured items with weights & percentages.
 * Supports syntax: `https://example.com/link | 70%` or `https://example.com/link | 70` or `https://example.com/link`
 */
export function parseSmartLinks(rawList) {
  if (!rawList || typeof rawList !== 'string') return [];

  const lines = rawList
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  const parsed = [];

  for (const line of lines) {
    let url = line;
    let weight = 1;
    let hasInvalidWeight = false;

    if (line.includes('|')) {
      const parts = line.split('|');
      url = parts[0].trim();
      const rawWeight = parts[1].trim().replace('%', '');
      const parsedNum = parseFloat(rawWeight);
      if (!isNaN(parsedNum) && parsedNum > 0) {
        weight = parsedNum;
      } else {
        hasInvalidWeight = true;
        weight = 1; // Graceful fallback
      }
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      let domain = '';
      try {
        domain = new URL(url).hostname;
      } catch {
        domain = 'ad-network';
      }

      parsed.push({
        url,
        weight,
        domain,
        hasInvalidWeight,
        raw: line,
      });
    }
  }

  const totalWeight = parsed.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0 || parsed.length === 0) return [];

  // Calculate percentages and ensure exact 100% total sum without rounding artifacts
  let runningSum = 0;
  return parsed.map((item, index) => {
    let percentage;
    if (index === parsed.length - 1) {
      percentage = Math.max(0, 100 - runningSum);
    } else {
      percentage = Math.round((item.weight / totalWeight) * 100);
      runningSum += percentage;
    }

    return {
      ...item,
      percentage,
    };
  });
}

/**
 * Picks a SmartLink according to the chosen load balancing strategy.
 */
export function pickSmartLink(links, strategy = 'weighted') {
  if (!links || links.length === 0) return null;

  if (links.length === 1) return { link: links[0], nextIndex: 0 };

  if (strategy === 'random') {
    const randomIndex = Math.floor(Math.random() * links.length);
    return { link: links[randomIndex], nextIndex: randomIndex };
  }

  if (strategy === 'round_robin') {
    const lastIdx = parseInt(
      localStorage.getItem(SMARTLINKS_RR_KEY) || localStorage.getItem(POP_INDEX_KEY) || '0',
      10
    );
    const nextIdx = (lastIdx + 1) % links.length;
    localStorage.setItem(SMARTLINKS_RR_KEY, nextIdx.toString());
    localStorage.setItem(POP_INDEX_KEY, nextIdx.toString());
    return { link: links[lastIdx % links.length], nextIndex: nextIdx };
  }

  // Default: 'weighted' (Weighted Reservoir Selection)
  const totalWeight = links.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * (totalWeight || 1);

  for (let i = 0; i < links.length; i++) {
    const item = links[i];
    if (random < item.weight) {
      return { link: item, nextIndex: i };
    }
    random -= item.weight;
  }

  return { link: links[0], nextIndex: 0 };
}

export function useSmartLinks() {
  const { isVip } = useVIP();
  const { isAdmin } = useAdmin();
  const monetizationEnabled = useMonetizationEnabled();

  // Cache a ref so we don't re-register the listener on every VIP toggle
  const stateRef = useRef({ isVip, isAdmin, monetizationEnabled });
  useEffect(() => {
    stateRef.current = { isVip, isAdmin, monetizationEnabled };
  }, [isVip, isAdmin, monetizationEnabled]);

  useEffect(() => {
    // Cache settings for the session (re-read at most once per mount)
    let cachedSettings = null;
    const loadSettings = () => {
      if (!cachedSettings) cachedSettings = getSettings();
      return cachedSettings;
    };

    const handleClick = (e) => {
      const { isVip: vip, isAdmin: admin, monetizationEnabled: isMonetized } = stateRef.current;

      // 1. Hard bypasses
      if (admin || vip || !isMonetized) return;
      if (window.location.pathname.startsWith('/admin')) return;

      // 2. Target discrimination ─────────────────────────────────
      const target = e.target;

      // Never fire on interactive / chrome-UI elements
      if (target.closest(BLOCKED_SELECTORS)) return;

      // Only fire on meaningful navigation targets
      if (!target.closest(TRIGGER_SELECTORS)) return;

      // 3. Settings guard
      const settings = loadSettings();
      if (!settings.smartlinksEnabled || settings.disableMonetization) return;

      const rawList = settings.smartlinksList || '';
      const parsedLinks = parseSmartLinks(rawList);

      if (parsedLinks.length === 0) return;

      // 4. Cooldown and Session Frequency Cap check
      const cooldownMs = (Number(settings.smartlinksCooldown) || 45) * 1000;
      const lastPop = localStorage.getItem(LAST_POP_KEY);
      const now = Date.now();

      if (lastPop && now - parseInt(lastPop, 10) < cooldownMs) return;

      const sessionPopCount = parseInt(sessionStorage.getItem('rebafilme_session_pop_count') || '0', 10);
      const maxPerSession = Number(settings.smartlinksMaxPerSession) || 6;
      if (sessionPopCount >= maxPerSession) return;

      // 5. Pick URL via Load Balancer (Weighted, Round-Robin, or Random)
      const strategy = settings.smartlinksStrategy || 'weighted';
      const picked = pickSmartLink(parsedLinks, strategy);
      if (!picked || !picked.link) return;

      const { url: targetUrl, domain: targetDomain } = picked.link;
      const idx = picked.nextIndex;

      // Record before opening to prevent double-fire on slow clicks
      localStorage.setItem(LAST_POP_KEY, now.toString());
      sessionStorage.setItem('rebafilme_session_pop_count', (sessionPopCount + 1).toString());

      try {
        const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
        if (!win || win.closed || typeof win.closed === 'undefined') {
          window.dispatchEvent(new CustomEvent('rebafilme_popunder_blocked', {
            detail: { url: targetUrl, domain: targetDomain, timestamp: now }
          }));
        } else {
          window.dispatchEvent(new CustomEvent('rebafilme_popunder_opened', {
            detail: { url: targetUrl, domain: targetDomain, index: idx, strategy, timestamp: now }
          }));

          // Persist telemetry to /api/ads/track
          try {
            const cleanDomain = String(targetDomain).replace(/[^a-zA-Z0-9]/g, '_');
            fetch('/api/ads/track', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'smartlink_trigger',
                targetUrl,
                targetDomain: cleanDomain,
                strategy,
              }),
            }).catch(() => {});
          } catch {}
        }
      } catch (err) {
        window.dispatchEvent(new CustomEvent('rebafilme_popunder_blocked', {
          detail: { url: targetUrl, error: err.message, timestamp: now }
        }));
      }
    };

    // Bubble phase ({ capture: false }) — fires after child element click handlers complete
    document.addEventListener('click', handleClick, { capture: false });
    return () => document.removeEventListener('click', handleClick, { capture: false });
  }, []); // runs once; reads current VIP/admin from ref on every click
}

export default useSmartLinks;

