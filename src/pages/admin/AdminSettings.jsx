import React, { useState } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import AdminLayout from './AdminLayout';
import './AdminLayout.css';
import './AdminSettings.css';
import { api } from '../../utils/api';
import { DEFAULT_SETTINGS, SETTINGS_KEY } from '../../utils/settings';

const AdminSettings = () => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    api.get(SETTINGS_KEY, DEFAULT_SETTINGS).then((s) => {
      setSettings({ ...DEFAULT_SETTINGS, ...s });
    });
  }, []);

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setSettings((p) => ({ ...p, [field]: val }));
  };

  const handleSave = async () => {
    await api.set(SETTINGS_KEY, settings, true);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all settings to defaults?')) return;
    await api.set(SETTINGS_KEY, DEFAULT_SETTINGS, true);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <AdminLayout>
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Settings</h1>
          <p className="adm-page-subtitle">Site features, TMDB catalog, downloads &amp; sponsors</p>
        </div>
        <div style={{ display: 'flex', gap: '.75rem' }}>
          <button className="adm-btn adm-btn-ghost" onClick={handleReset}>
            <RefreshCw size={15} /> Reset
          </button>
          <button className="adm-btn adm-btn-primary" onClick={handleSave}>
            <Save size={15} /> Save Changes
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        <div className="adm-settings-section">
          <h3 className="adm-settings-heading">General</h3>
          <div className="adm-form-grid">
            <div className="adm-form-group full">
              <label className="adm-form-label">Site Name</label>
              <input className="adm-input" value={settings.siteName} onChange={set('siteName')} />
            </div>
            <div className="adm-form-group full">
              <label className="adm-form-label">Footer Tagline</label>
              <input className="adm-input" value={settings.footerTagline} onChange={set('footerTagline')} />
            </div>
            <div className="adm-form-group full">
              <label className="adm-form-label">Admin Email</label>
              <input className="adm-input" type="email" value={settings.adminEmail} onChange={set('adminEmail')} placeholder="admin@rebafilme.com" />
            </div>
          </div>
        </div>

        <div className="adm-settings-section">
          <h3 className="adm-settings-heading">Movie Catalog (TMDB)</h3>
          <p style={{ color: '#888', fontSize: '.82rem', margin: '0 0 1rem' }}>
            The public site loads trending movies from TMDB automatically. Use <strong>Catalog</strong> in admin to pin featured titles.
          </p>
          <div className="adm-form-grid">
            <div className="adm-form-group full">
              <label className="adm-form-label">TMDB API Key (v3 auth)</label>
              <input className="adm-input" value={settings.tmdbApiKey} onChange={set('tmdbApiKey')} placeholder="Paste TMDB API key…" />
              <small style={{ color: '#555', fontSize: '.75rem', marginTop: '.25rem' }}>
                Required for posters, descriptions, trailers &amp; search. Also set <code>TMDB_API_KEY</code> in Cloudflare for production.
              </small>
            </div>
          </div>
          <div className="adm-form-row" style={{ marginTop: '.75rem' }}>
            <div>
              <span className="adm-form-row-label">Trailers Enabled</span>
              <small style={{ display: 'block', color: '#555', fontSize: '.78rem' }}>
                Watch button plays YouTube trailers on the cinema page
              </small>
            </div>
            <label className="adm-toggle">
              <input type="checkbox" checked={!!settings.trailersEnabled} onChange={set('trailersEnabled')} />
              <span className="adm-toggle-track" />
            </label>
          </div>
        </div>

        <div className="adm-settings-section">
          <h3 className="adm-settings-heading">Downloads</h3>
          <div className="adm-form-grid">
            <div className="adm-form-group full">
              <label className="adm-form-label">Download Redirect URL</label>
              <input className="adm-input" value={settings.downloadBaseUrl} onChange={set('downloadBaseUrl')} placeholder="https://videodownloader.site" />
              <small style={{ color: '#555', fontSize: '.75rem', marginTop: '.25rem' }}>
                Users are sent to <code>{settings.downloadBaseUrl || 'https://videodownloader.site'}/?q=Movie+Title</code>
              </small>
            </div>
          </div>
          <div className="adm-form-row" style={{ marginTop: '.75rem' }}>
            <div>
              <span className="adm-form-row-label">Show Download Buttons</span>
              <small style={{ display: 'block', color: '#555', fontSize: '.78rem' }}>
                Hide download buttons site-wide when off
              </small>
            </div>
            <label className="adm-toggle">
              <input type="checkbox" checked={settings.downloadEnabled} onChange={set('downloadEnabled')} />
              <span className="adm-toggle-track" />
            </label>
          </div>
        </div>

        {/* ── 💰 Pillar 1: SmartLinks & Popunders ── */}
        <div className="adm-settings-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div>
              <h3 className="adm-settings-heading" style={{ margin: 0 }}>
                💰 Ad Monetization — SmartLinks / Popunders
              </h3>
              <small style={{ color: '#888', fontSize: '.82rem' }}>
                Rotates Adsterra, Monetag, PopAds or ClickAdu direct links when visitors click on the site.
              </small>
            </div>
            <label className="adm-toggle">
              <input type="checkbox" checked={!!settings.smartlinksEnabled} onChange={set('smartlinksEnabled')} />
              <span className="adm-toggle-track" />
            </label>
          </div>

          <div className="adm-form-grid">
            <div className="adm-form-group">
              <label className="adm-form-label">Cooldown Timer (seconds)</label>
              <input
                className="adm-input"
                type="number"
                min="5"
                max="300"
                value={settings.smartlinksCooldown ?? 45}
                onChange={set('smartlinksCooldown')}
                placeholder="45"
              />
              <small style={{ color: '#666', fontSize: '.75rem', marginTop: '.25rem' }}>
                Minimum time between popup triggers (e.g. 45s keeps visitors happy while earning).
              </small>
            </div>

            <div className="adm-form-group">
              <label className="adm-form-label">Native Grid Interval (cards)</label>
              <input
                className="adm-input"
                type="number"
                min="4"
                max="24"
                value={settings.nativeAdsInterval ?? 8}
                onChange={set('nativeAdsInterval')}
                placeholder="8"
              />
              <small style={{ color: '#666', fontSize: '.75rem', marginTop: '.25rem' }}>
                Show native sponsor / VIP cards every N items in movie grids.
              </small>
            </div>

            <div className="adm-form-group full">
              <label className="adm-form-label">Rotating SmartLink URLs (one per line)</label>
              <textarea
                className="adm-input"
                rows={5}
                value={settings.smartlinksList || ''}
                onChange={set('smartlinksList')}
                placeholder={`https://nickeldefiancepriest.com/your-adsterra-link-1\nhttps://omg10.com/4/your-monetag-link-1\nhttps://nickeldefiancepriest.com/your-adsterra-link-2`}
                style={{ fontFamily: 'monospace', fontSize: '0.82rem', resize: 'vertical' }}
              />
              <small style={{ color: '#777', fontSize: '.75rem', marginTop: '.25rem' }}>
                Paste direct links from Adsterra, Monetag, PopAds, or ClickAdu. The engine cycles through each link in order on valid user clicks.
              </small>
            </div>
          </div>
        </div>

        {/* ── 🎬 Pillar 2: In-Stream Video Ads ── */}
        <div className="adm-settings-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div>
              <h3 className="adm-settings-heading" style={{ margin: 0 }}>
                🎬 In-Stream Video Ads (Pre-Roll Bumper)
              </h3>
              <small style={{ color: '#888', fontSize: '.82rem' }}>
                Plays a short video ad bumper in the stream player before the main movie begins.
              </small>
            </div>
            <label className="adm-toggle">
              <input type="checkbox" checked={!!settings.videoAdsEnabled} onChange={set('videoAdsEnabled')} />
              <span className="adm-toggle-track" />
            </label>
          </div>

          <div className="adm-form-grid">
            <div className="adm-form-group full">
              <label className="adm-form-label">Video Ad Source URL (.mp4 / direct stream)</label>
              <input
                className="adm-input"
                value={settings.videoAdUrl || ''}
                onChange={set('videoAdUrl')}
                placeholder="https://cdn.rebafilme.com/ad_bumper.mp4"
              />
            </div>
            <div className="adm-form-group">
              <label className="adm-form-label">Click-through SmartLink / Sponsor Link</label>
              <input
                className="adm-input"
                value={settings.videoAdLink || ''}
                onChange={set('videoAdLink')}
                placeholder="https://nickeldefiancepriest.com/your-smartlink"
              />
            </div>
            <div className="adm-form-group">
              <label className="adm-form-label">Ad Duration / Skip Time (seconds)</label>
              <input
                className="adm-input"
                type="number"
                min="3"
                max="60"
                value={settings.videoAdDuration ?? 10}
                onChange={set('videoAdDuration')}
                placeholder="10"
              />
            </div>
          </div>
        </div>

        {/* ── 👑 Pillar 4: Direct MTN MoMo & Airtel VIP Pass ── */}
        <div className="adm-settings-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div>
              <h3 className="adm-settings-heading" style={{ margin: 0, color: '#ffd700' }}>
                👑 MTN MoMo &amp; Airtel VIP Membership System
              </h3>
              <small style={{ color: '#888', fontSize: '.82rem' }}>
                Charge local subscribers via Mobile Money in Rwanda/DRC/Uganda for 100% ad-free streaming &amp; fast downloads.
              </small>
            </div>
            <label className="adm-toggle">
              <input type="checkbox" checked={!!settings.vipEnabled} onChange={set('vipEnabled')} />
              <span className="adm-toggle-track" />
            </label>
          </div>

          <div className="adm-form-grid">
            <div className="adm-form-group">
              <label className="adm-form-label">VIP Daily Price (RWF)</label>
              <input
                className="adm-input"
                type="number"
                min="100"
                max="50000"
                value={settings.vipPriceDaily ?? 1000}
                onChange={set('vipPriceDaily')}
                placeholder="1000"
              />
              <small style={{ color: '#666', fontSize: '.75rem', marginTop: '.25rem' }}>1 Day Access</small>
            </div>
            <div className="adm-form-group">
              <label className="adm-form-label">VIP Monthly Price (RWF)</label>
              <input
                className="adm-input"
                type="number"
                min="500"
                max="50000"
                value={typeof settings.vipPriceMonthly === 'number' ? settings.vipPriceMonthly : parseInt(String(settings.vipPriceMonthly || '5000').replace(/\D/g, ''), 10) || 5000}
                onChange={set('vipPriceMonthly')}
                placeholder="5000"
              />
              <small style={{ color: '#666', fontSize: '.75rem', marginTop: '.25rem' }}>30 Days Access (Standard)</small>
            </div>
            <div className="adm-form-group">
              <label className="adm-form-label">VIP Yearly Price (RWF)</label>
              <input
                className="adm-input"
                type="number"
                min="5000"
                max="500000"
                value={settings.vipPriceYearly ?? 45000}
                onChange={set('vipPriceYearly')}
                placeholder="45000"
              />
              <small style={{ color: '#666', fontSize: '.75rem', marginTop: '.25rem' }}>365 Days Access (Best Value)</small>
            </div>

            {/* 💳 Global Card & Crypto Prices (USD) */}
            <div className="adm-form-group">
              <label className="adm-form-label">VIP Daily Price (USD — Cards &amp; Crypto)</label>
              <input
                className="adm-input"
                type="number"
                step="0.01"
                min="0.10"
                max="100"
                value={settings.vipPriceUsdDaily ?? 0.99}
                onChange={set('vipPriceUsdDaily')}
                placeholder="0.99"
              />
              <small style={{ color: '#666', fontSize: '.75rem', marginTop: '.25rem' }}>Visa, Mastercard &amp; USDT</small>
            </div>
            <div className="adm-form-group">
              <label className="adm-form-label">VIP Monthly Price (USD — Cards &amp; Crypto)</label>
              <input
                className="adm-input"
                type="number"
                step="0.01"
                min="0.50"
                max="200"
                value={settings.vipPriceUsdMonthly ?? 3.99}
                onChange={set('vipPriceUsdMonthly')}
                placeholder="3.99"
              />
              <small style={{ color: '#666', fontSize: '.75rem', marginTop: '.25rem' }}>Standard Monthly Pass in USD</small>
            </div>
            <div className="adm-form-group">
              <label className="adm-form-label">VIP Yearly Price (USD — Cards &amp; Crypto)</label>
              <input
                className="adm-input"
                type="number"
                step="0.01"
                min="5.00"
                max="1000"
                value={settings.vipPriceUsdYearly ?? 34.99}
                onChange={set('vipPriceUsdYearly')}
                placeholder="34.99"
              />
              <small style={{ color: '#666', fontSize: '.75rem', marginTop: '.25rem' }}>Annual Pass in USD</small>
            </div>
            <div className="adm-form-group">
              <label className="adm-form-label">VIP Support WhatsApp</label>
              <input className="adm-input" value={settings.vipWhatsApp || '250786934081'} onChange={set('vipWhatsApp')} placeholder="250786934081" />
            </div>
            <div className="adm-form-group">
              <label className="adm-form-label">MTN MoMo Number</label>
              <input className="adm-input" value={settings.vipMomoNumber || '0786934081'} onChange={set('vipMomoNumber')} placeholder="0786934081" />
            </div>
            <div className="adm-form-group">
              <label className="adm-form-label">MTN MoMo Account Name</label>
              <input className="adm-input" value={settings.vipMomoName || 'RebaFilme Media'} onChange={set('vipMomoName')} placeholder="RebaFilme Media" />
            </div>
            <div className="adm-form-group">
              <label className="adm-form-label">Airtel Money Number</label>
              <input className="adm-input" value={settings.vipAirtelNumber || '0738000000'} onChange={set('vipAirtelNumber')} placeholder="0738000000" />
            </div>
            <div className="adm-form-group full">
              <label className="adm-form-label">Active VIP Passcodes (comma-separated)</label>
              <input className="adm-input" value={settings.vipPasscodes || ''} onChange={set('vipPasscodes')} placeholder="REBAVIP,MOMO2026,VIPPASS" />
              <small style={{ color: '#666', fontSize: '.75rem', marginTop: '.25rem' }}>
                Visitors can type these codes into the VIP modal for instant 30-day activation.
              </small>
            </div>
          </div>
        </div>

        <div className="adm-settings-section">
          <h3 className="adm-settings-heading">Sponsors &amp; Ads</h3>
          <div className="adm-form-grid">
            <div className="adm-form-group full">
              <label className="adm-form-label">Sponsor Contact Email</label>
              <input className="adm-input" type="email" value={settings.sponsorContactEmail} onChange={set('sponsorContactEmail')} placeholder="sponsors@rebafilme.com" />
              <small style={{ color: '#555', fontSize: '.75rem', marginTop: '.25rem' }}>
                Shown in footer / sponsor pages for brands who want to advertise
              </small>
            </div>
            <div className="adm-form-group full">
              <label className="adm-form-label">Sponsor Label on Site</label>
              <input className="adm-input" value={settings.adSponsorLabel} onChange={set('adSponsorLabel')} placeholder="Sponsored" />
              <small style={{ color: '#555', fontSize: '.75rem', marginTop: '.25rem' }}>
                Badge text shown on sponsor banners (e.g. &quot;Sponsored&quot;, &quot;Partner&quot;)
              </small>
            </div>
          </div>
        </div>

        <div className="adm-settings-section">
          <h3 className="adm-settings-heading">Contact &amp; Support</h3>
          <div className="adm-form-grid">
            <div className="adm-form-group full">
              <label className="adm-form-label">WhatsApp Number (digits only)</label>
              <input className="adm-input" value={settings.whatsapp} onChange={set('whatsapp')} placeholder="250786934081" />
            </div>
          </div>
        </div>

        <div className="adm-settings-section">
          <h3 className="adm-settings-heading">Feature Toggles</h3>
          <div className="adm-form-row">
            <div>
              <span className="adm-form-row-label" style={{ color: settings.maintenanceMode ? '#ef4444' : undefined }}>
                Maintenance Mode
              </span>
              <small style={{ display: 'block', color: '#555', fontSize: '.78rem' }}>
                Show maintenance page to visitors (admin still works)
              </small>
            </div>
            <label className="adm-toggle">
              <input type="checkbox" checked={settings.maintenanceMode} onChange={set('maintenanceMode')} />
              <span className="adm-toggle-track" />
            </label>
          </div>
          <div className="adm-form-row" style={{ marginTop: '.75rem' }}>
            <div>
              <span className="adm-form-row-label">AI Movie Assistant</span>
              <small style={{ display: 'block', color: '#555', fontSize: '.78rem' }}>
                Show the AI chat bubble on the public site
              </small>
            </div>
            <label className="adm-toggle">
              <input type="checkbox" checked={!!settings.aiAssistantEnabled} onChange={set('aiAssistantEnabled')} />
              <span className="adm-toggle-track" />
            </label>
          </div>
        </div>

        <div className="adm-settings-section">
          <h3 className="adm-settings-heading">Monetization Control</h3>
          <div className="adm-form-row">
            <div>
              <span className="adm-form-row-label" style={{ color: settings.disableMonetization ? '#ef4444' : undefined }}>
                Disable All Ads & Hide VIP Pass
              </span>
              <small style={{ display: 'block', color: '#555', fontSize: '.78rem' }}>
                Master kill switch: hides 👑 VIP icons/buttons and stops all ads (banners, native, video, popunders)
              </small>
            </div>
            <label className="adm-toggle">
              <input type="checkbox" checked={!!settings.disableMonetization} onChange={set('disableMonetization')} />
              <span className="adm-toggle-track" />
            </label>
          </div>
        </div>


        <div className="adm-settings-section adm-danger-zone">
          <h3 className="adm-settings-heading" style={{ color: '#ef4444' }}>Danger Zone</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            <div className="adm-danger-row">
              <div>
                <span className="adm-form-row-label">Clear Curated Pins</span>
                <small style={{ display: 'block', color: '#555', fontSize: '.78rem' }}>Removes featured/popular overrides on TMDB titles</small>
              </div>
              <button
                className="adm-btn adm-btn-danger adm-btn-sm"
                onClick={async () => {
                  if (window.confirm('Clear all curated movie pins across all devices?')) {
                    await api.set('rebafilme_curated', {}, true);
                    localStorage.removeItem('rebafilme_curated');
                    window.location.reload();
                  }
                }}
              >
                Clear Pins
              </button>
            </div>
            <div className="adm-danger-row">
              <div>
                <span className="adm-form-row-label">Clear All Ads</span>
                <small style={{ display: 'block', color: '#555', fontSize: '.78rem' }}>Permanently deletes sponsor ads</small>
              </div>
              <button
                className="adm-btn adm-btn-danger adm-btn-sm"
                onClick={async () => {
                  if (window.confirm('Delete ALL sponsor ads across all devices? Cannot be undone!')) {
                    await api.set('rebafilme_ads', [], true);
                    localStorage.removeItem('rebafilme_ads');
                    window.location.reload();
                  }
                }}
              >
                Clear Ads
              </button>
            </div>
          </div>
        </div>
      </div>

      {saved && <div className="adm-toast">Settings saved successfully!</div>}
    </AdminLayout>
  );
};

export default AdminSettings;
