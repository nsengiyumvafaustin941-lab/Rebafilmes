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
  footerTagline: "Reba filime z'umwimerere mu Kinyarwanda no mu Luganda.",
  adminEmail: '',
  sponsorContactEmail: '',
  adSponsorLabel: 'Sponsored',
  tmdbApiKey: '',
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

export function buildDownloadUrl(title) {
  const { downloadBaseUrl } = getSettings();
  const base = (downloadBaseUrl || DEFAULT_SETTINGS.downloadBaseUrl).replace(/\/$/, '');
  return `${base}/?q=${encodeURIComponent(title)}`;
}
