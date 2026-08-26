import { SETTINGS_KEY as CONSTANTS_SETTINGS_KEY } from './constants';

export const SETTINGS_KEY = CONSTANTS_SETTINGS_KEY;

export const DEFAULT_SETTINGS = {
  siteName: 'RebaFilme',
  whatsapp: '250786934081',
  downloadEnabled: true,
  downloadBaseUrl: 'https://videodownloader.site',
  trailersEnabled: true,
  maintenanceMode: false,
  aiAssistantEnabled: true,
  disableMonetization: false,
  footerTagline: "Reba filime z'umwimerere mu Kinyarwanda no mu Luganda.",
  adminEmail: 'nsengiyumvafaustin941@gmail.com',
  sponsorContactEmail: '',
  adSponsorLabel: 'Sponsored',
  tmdbApiKey: '',

  // 💰 Monetization Pillar 1: SmartLinks & Popunders
  smartlinksEnabled: true,
  smartlinksList: `https://nickeldefiancepriest.com/adsterra-direct-link-1
https://omg10.com/4/monetag-direct-link-1
https://nickeldefiancepriest.com/adsterra-direct-link-2
https://clickadu.com/smartlink-direct-link-1`,
  smartlinksCooldown: 45, // in seconds

  // 🎬 Monetization Pillar 2: In-Stream Video Ads (Pre-Roll)
  videoAdsEnabled: false,
  videoAdUrl: '',
  videoAdLink: '',
  videoAdDuration: 10, // in seconds

  // 👑 Monetization Pillar 4: Direct MTN MoMo, Cards & Crypto VIP Pass
  vipEnabled: true,
  vipPriceDaily: 1000,
  vipPriceMonthly: 5000,
  vipPriceYearly: 45000,
  vipPriceUsdDaily: 0.99,
  vipPriceUsdMonthly: 3.99,
  vipPriceUsdYearly: 34.99,
  vipMomoNumber: '0786934081',
  vipMomoName: 'RebaFilme Media',
  vipAirtelNumber: '0738000000',
  vipWhatsApp: '250786934081',
  vipPasscodes: 'REBAVIP,MOMO2026,VIPPASS,REBAFILME2026',

  // 🖼️ Monetization Pillar 3: Native Grid Banners
  nativeAdsInterval: 8,
};

export function getSettings() {
  try {
    const raw = localStorage.getItem(CONSTANTS_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function parsePriceAmount(val, defaultAmount = 1000) {
  if (typeof val === 'number' && Number.isFinite(val) && val > 0) return Math.round(val);
  if (!val) return defaultAmount;
  const num = parseInt(String(val).replace(/[^0-9]/g, ''), 10);
  return isNaN(num) || num <= 0 ? defaultAmount : num;
}

export function parseUsdPrice(val, defaultAmount = 3.99) {
  if (typeof val === 'number' && Number.isFinite(val) && val > 0) return val;
  if (!val) return defaultAmount;
  const num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
  return isNaN(num) || num <= 0 ? defaultAmount : num;
}

export function getDynamicVipPlans() {
  const s = getSettings();
  const dailyRwf = parsePriceAmount(s.vipPriceDaily, 1000);
  const monthlyRwf = parsePriceAmount(s.vipPriceMonthly, 5000);
  const yearlyRwf = parsePriceAmount(s.vipPriceYearly, 45000);

  const dailyUsd = parseUsdPrice(s.vipPriceUsdDaily, 0.99);
  const monthlyUsd = parseUsdPrice(s.vipPriceUsdMonthly, 3.99);
  const yearlyUsd = parseUsdPrice(s.vipPriceUsdYearly, 34.99);

  return [
    { 
      id: 'daily', 
      name: 'Day', 
      priceRwf: `${dailyRwf.toLocaleString()} RWF`, 
      amountRwf: dailyRwf, 
      priceUsd: `$${dailyUsd.toFixed(2)} USD`, 
      amountUsd: dailyUsd, 
      duration: '1 Day'
    },
    { 
      id: 'monthly', 
      name: 'Month', 
      priceRwf: `${monthlyRwf.toLocaleString()} RWF`, 
      amountRwf: monthlyRwf, 
      priceUsd: `$${monthlyUsd.toFixed(2)} USD`, 
      amountUsd: monthlyUsd, 
      duration: '1 Month', 
      badge: 'Most Popular', 
      popular: true 
    },
    { 
      id: 'yearly', 
      name: 'Year', 
      priceRwf: `${yearlyRwf.toLocaleString()} RWF`, 
      amountRwf: yearlyRwf, 
      priceUsd: `$${yearlyUsd.toFixed(2)} USD`, 
      amountUsd: yearlyUsd, 
      duration: '1 Year', 
      badge: 'Save 25%', 
      badgeColor: '#00e676'
    }
  ];
}

export function buildDownloadUrl(title) {
  const { downloadBaseUrl } = getSettings();
  const base = (downloadBaseUrl || DEFAULT_SETTINGS.downloadBaseUrl).replace(/\/$/, '');
  return `${base}/?q=${encodeURIComponent(title)}`;
}
