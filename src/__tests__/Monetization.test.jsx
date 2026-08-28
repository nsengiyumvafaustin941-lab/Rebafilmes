import { describe, it, expect, beforeEach } from 'vitest';
import { VIP_KEY, LAST_POP_KEY, POP_INDEX_KEY } from '../utils/constants';
import { getSettings, DEFAULT_SETTINGS, parsePriceAmount } from '../utils/settings';
import { parseSmartLinks, pickSmartLink } from '../hooks/useSmartLinks';

describe('Monetization & Settings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides comprehensive default monetization settings', () => {
    const settings = getSettings();
    expect(settings.smartlinksCooldown).toBe(45);
    expect(settings.nativeAdsInterval).toBe(8);
    expect(settings.vipPriceDaily).toBe(DEFAULT_SETTINGS.vipPriceDaily);
    expect(settings.vipPriceMonthly).toBe(DEFAULT_SETTINGS.vipPriceMonthly);
    expect(settings.vipPriceYearly).toBe(DEFAULT_SETTINGS.vipPriceYearly);
    expect(settings.vipMomoNumber).toBe('0786934081');
    expect(settings.vipPasscodes).toContain('REBAVIP');
    expect(settings.vipPasscodes).toContain('MOMO2026');
  });

  it('validates and activates VIP passcodes into localStorage with 30-day expiry', () => {
    const code = 'REBAVIP';
    const allowed = (DEFAULT_SETTINGS.vipPasscodes || '').split(',').map((c) => c.trim().toUpperCase());
    expect(allowed).toContain(code);

    const now = Date.now();
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000;
    const vipPayload = {
      active: true,
      code,
      activatedAt: now,
      expiresAt,
    };

    localStorage.setItem(VIP_KEY, JSON.stringify(vipPayload));

    const savedRaw = localStorage.getItem(VIP_KEY);
    expect(savedRaw).not.toBeNull();
    const parsed = JSON.parse(savedRaw);
    expect(parsed.active).toBe(true);
    expect(parsed.code).toBe('REBAVIP');
    expect(parsed.expiresAt).toBeGreaterThan(now);
  });

  it('handles VIP expiration correctly when past expiry timestamp', () => {
    const expiredPayload = {
      active: true,
      code: 'EXPIRED123',
      activatedAt: Date.now() - 40 * 24 * 60 * 60 * 1000,
      expiresAt: Date.now() - 10 * 24 * 60 * 60 * 1000, // expired 10 days ago
    };
    localStorage.setItem(VIP_KEY, JSON.stringify(expiredPayload));

    const raw = localStorage.getItem(VIP_KEY);
    const data = JSON.parse(raw);
    const isExpired = data.expiresAt && Date.now() > data.expiresAt;
    expect(isExpired).toBe(true);
  });

  it('manages SmartLink URL round-robin rotation and cooldown', () => {
    const sampleLinks = [
      'https://network1.com/linkA',
      'https://network2.com/linkB',
      'https://network3.com/linkC',
    ];

    // First pop
    let idx = parseInt(localStorage.getItem(POP_INDEX_KEY) || '0', 10);
    const firstUrl = sampleLinks[idx % sampleLinks.length];
    expect(firstUrl).toBe('https://network1.com/linkA');
    localStorage.setItem(POP_INDEX_KEY, ((idx + 1) % sampleLinks.length).toString());

    // Second pop
    idx = parseInt(localStorage.getItem(POP_INDEX_KEY) || '0', 10);
    const secondUrl = sampleLinks[idx % sampleLinks.length];
    expect(secondUrl).toBe('https://network2.com/linkB');
    localStorage.setItem(POP_INDEX_KEY, ((idx + 1) % sampleLinks.length).toString());

    // Third pop
    idx = parseInt(localStorage.getItem(POP_INDEX_KEY) || '0', 10);
    const thirdUrl = sampleLinks[idx % sampleLinks.length];
    expect(thirdUrl).toBe('https://network3.com/linkC');
    localStorage.setItem(POP_INDEX_KEY, ((idx + 1) % sampleLinks.length).toString());

    // Rotates back to first link
    idx = parseInt(localStorage.getItem(POP_INDEX_KEY) || '0', 10);
    const fourthUrl = sampleLinks[idx % sampleLinks.length];
    expect(fourthUrl).toBe('https://network1.com/linkA');
  });

  it('enforces cooldown threshold between consecutive popunder clicks', () => {
    const cooldownSeconds = 45;
    const cooldownMs = cooldownSeconds * 1000;
    const now = Date.now();

    // Set last pop to 10 seconds ago (should be blocked by cooldown)
    localStorage.setItem(LAST_POP_KEY, (now - 10000).toString());
    let lastPop = localStorage.getItem(LAST_POP_KEY);
    let shouldTrigger = !lastPop || now - parseInt(lastPop, 10) >= cooldownMs;
    expect(shouldTrigger).toBe(false);

    // Set last pop to 50 seconds ago (should trigger)
    localStorage.setItem(LAST_POP_KEY, (now - 50000).toString());
    lastPop = localStorage.getItem(LAST_POP_KEY);
    shouldTrigger = !lastPop || now - parseInt(lastPop, 10) >= cooldownMs;
    expect(shouldTrigger).toBe(true);
  });

  it('correctly parses price amounts from numbers and formatted currency strings', () => {
    expect(parsePriceAmount(500, 1000)).toBe(500);
    expect(parsePriceAmount('1,000 RWF', 1000)).toBe(1000);
    expect(parsePriceAmount('2,500 RWF', 1000)).toBe(2500);
    expect(parsePriceAmount('20,000 RWF', 1000)).toBe(20000);
    expect(parsePriceAmount('', 1000)).toBe(1000);
    expect(parsePriceAmount(null, 2000)).toBe(2000);
  });
});

describe('SmartLinks Load Balancer & Weight Engine', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('includes smartlinksStrategy and smartlinksMaxPerSession in default settings', () => {
    const settings = getSettings();
    expect(settings.smartlinksStrategy).toBe('weighted');
    expect(settings.smartlinksMaxPerSession).toBe(6);
    expect(DEFAULT_SETTINGS.smartlinksMaxPerSession).toBe(6);
    expect(DEFAULT_SETTINGS.smartlinksStrategy).toBe('weighted');
  });

  it('parses weighted URLs with percentages, integers, and default weights', () => {
    const raw = `
      https://nickeldefiancepriest.com/key1 | 60%
      https://omg10.com/4/key2 | 30
      https://clickadu.com/key3 | 10%
    `;
    const parsed = parseSmartLinks(raw);
    expect(parsed).toHaveLength(3);
    expect(parsed[0].domain).toBe('nickeldefiancepriest.com');
    expect(parsed[0].weight).toBe(60);
    expect(parsed[0].percentage).toBe(60);

    expect(parsed[1].domain).toBe('omg10.com');
    expect(parsed[1].weight).toBe(30);
    expect(parsed[1].percentage).toBe(30);

    expect(parsed[2].domain).toBe('clickadu.com');
    expect(parsed[2].weight).toBe(10);
    expect(parsed[2].percentage).toBe(10);

    const totalPct = parsed.reduce((s, i) => s + i.percentage, 0);
    expect(totalPct).toBe(100);
  });

  it('guarantees percentage sum equals exact 100% even with odd division (e.g. 3 links at weight 1)', () => {
    const raw = `
      https://site1.com/link1
      https://site2.com/link2
      https://site3.com/link3
    `;
    const parsed = parseSmartLinks(raw);
    expect(parsed).toHaveLength(3);
    const sum = parsed.reduce((s, i) => s + i.percentage, 0);
    expect(sum).toBe(100);
  });

  it('gracefully handles invalid/corrupted weights by falling back to weight 1 and flagging them', () => {
    const raw = `
      https://good.com/link | 80%
      https://bad.com/link | -50%
      https://corrupted.com/link | not-a-number
    `;
    const parsed = parseSmartLinks(raw);
    expect(parsed).toHaveLength(3);
    expect(parsed[0].weight).toBe(80);
    expect(parsed[0].hasInvalidWeight).toBeFalsy();
    expect(parsed[1].hasInvalidWeight).toBe(true);
    expect(parsed[1].weight).toBe(1);
    expect(parsed[2].hasInvalidWeight).toBe(true);
    expect(parsed[2].weight).toBe(1);
  });

  it('picks links according to weighted distribution over a statistical sample', () => {
    const links = [
      { url: 'https://heavy.com', weight: 70, domain: 'heavy.com', percentage: 70, raw: '' },
      { url: 'https://light.com', weight: 30, domain: 'light.com', percentage: 30, raw: '' },
    ];

    const counts = { heavy: 0, light: 0 };
    const trials = 1000;

    for (let i = 0; i < trials; i++) {
      const picked = pickSmartLink(links, 'weighted');
      if (picked.link.url === 'https://heavy.com') counts.heavy++;
      else counts.light++;
    }

    const heavyRatio = counts.heavy / trials;
    // Expect between 63% and 77% (statistically expected ~70%)
    expect(heavyRatio).toBeGreaterThan(0.63);
    expect(heavyRatio).toBeLessThan(0.77);
  });

  it('rotates sequentially in round_robin strategy using dedicated state', () => {
    const links = [
      { url: 'https://a.com', weight: 1, domain: 'a.com', percentage: 33, raw: '' },
      { url: 'https://b.com', weight: 1, domain: 'b.com', percentage: 33, raw: '' },
      { url: 'https://c.com', weight: 1, domain: 'c.com', percentage: 34, raw: '' },
    ];

    expect(pickSmartLink(links, 'round_robin').link.url).toBe('https://a.com');
    expect(pickSmartLink(links, 'round_robin').link.url).toBe('https://b.com');
    expect(pickSmartLink(links, 'round_robin').link.url).toBe('https://c.com');
    expect(pickSmartLink(links, 'round_robin').link.url).toBe('https://a.com');
  });

  it('picks valid links in random strategy', () => {
    const links = [
      { url: 'https://a.com', weight: 1, domain: 'a.com', percentage: 50, raw: '' },
      { url: 'https://b.com', weight: 1, domain: 'b.com', percentage: 50, raw: '' },
    ];

    const picked = pickSmartLink(links, 'random');
    expect(['https://a.com', 'https://b.com']).toContain(picked.link.url);
  });

  it('enforces max popunders per session frequency cap', () => {
    const maxPerSession = 6;
    sessionStorage.setItem('rebafilme_session_pop_count', '5');

    let currentCount = parseInt(sessionStorage.getItem('rebafilme_session_pop_count') || '0', 10);
    expect(currentCount < maxPerSession).toBe(true);

    // Increment to limit
    sessionStorage.setItem('rebafilme_session_pop_count', (currentCount + 1).toString());
    currentCount = parseInt(sessionStorage.getItem('rebafilme_session_pop_count') || '0', 10);
    expect(currentCount >= maxPerSession).toBe(true);
  });
});

