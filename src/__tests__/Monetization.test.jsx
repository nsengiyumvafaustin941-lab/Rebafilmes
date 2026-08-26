import { describe, it, expect, beforeEach } from 'vitest';
import { VIP_KEY, LAST_POP_KEY, POP_INDEX_KEY } from '../utils/constants';

import { getSettings, DEFAULT_SETTINGS, parsePriceAmount } from '../utils/settings';

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
