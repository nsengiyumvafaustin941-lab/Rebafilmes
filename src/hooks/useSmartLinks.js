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
      const links = rawList
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('http://') || l.startsWith('https://'));

      if (links.length === 0) return;

      // 4. Cooldown and Session Frequency Cap check
      const cooldownMs = (Number(settings.smartlinksCooldown) || 45) * 1000;
      const lastPop = localStorage.getItem(LAST_POP_KEY);
      const now = Date.now();

      if (lastPop && now - parseInt(lastPop, 10) < cooldownMs) return;

      const sessionPopCount = parseInt(sessionStorage.getItem('rebafilme_session_pop_count') || '0', 10);
      const maxPerSession = Number(settings.smartlinksMaxPerSession) || 6;
      if (sessionPopCount >= maxPerSession) return;

      // 5. Fire — record before opening to prevent double-fire on slow clicks
      localStorage.setItem(LAST_POP_KEY, now.toString());
      sessionStorage.setItem('rebafilme_session_pop_count', (sessionPopCount + 1).toString());

      const idx = parseInt(localStorage.getItem(POP_INDEX_KEY) || '0', 10);
      const targetUrl = links[idx % links.length];
      localStorage.setItem(POP_INDEX_KEY, ((idx + 1) % links.length).toString());

      try {
        const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
        if (!win || win.closed || typeof win.closed === 'undefined') {
          window.dispatchEvent(new CustomEvent('rebafilme_popunder_blocked', {
            detail: { url: targetUrl, timestamp: now }
          }));
        } else {
          window.dispatchEvent(new CustomEvent('rebafilme_popunder_opened', {
            detail: { url: targetUrl, index: idx, timestamp: now }
          }));

          // Persist telemetry to /api/ads/track
          try {
            const domain = new URL(targetUrl).hostname.replace(/[^a-zA-Z0-9]/g, '_');
            fetch('/api/ads/track', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'smartlink_trigger',
                targetUrl,
                targetDomain: domain,
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
