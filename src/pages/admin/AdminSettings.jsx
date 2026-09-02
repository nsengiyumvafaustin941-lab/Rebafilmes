import React, { useState, useMemo } from 'react';
import { Save, RefreshCw, BarChart2 } from 'lucide-react';
import AdminLayout from './AdminLayout';
import './AdminLayout.css';
import './AdminSettings.css';
import { api } from '../../utils/api';
import { DEFAULT_SETTINGS, SETTINGS_KEY, parsePriceAmount, parseUsdPrice } from '../../utils/settings';
import { parseSmartLinks } from '../../hooks/useSmartLinks';

const AdminSettings = () => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  const parsedSmartLinks = useMemo(
    () => parseSmartLinks(settings.smartlinksList || ''),
    [settings.smartlinksList]
  );

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
    const cleanSettings = {
      ...settings,
      vipPriceDaily: parsePriceAmount(settings.vipPriceDaily, 1000),
      vipPriceMonthly: parsePriceAmount(settings.vipPriceMonthly, 5000),
      vipPriceYearly: parsePriceAmount(settings.vipPriceYearly, 45000),
      vipPriceUsdDaily: parseUsdPrice(settings.vipPriceUsdDaily, 0.99),
      vipPriceUsdMonthly: parseUsdPrice(settings.vipPriceUsdMonthly, 3.99),
      vipPriceUsdYearly: parseUsdPrice(settings.vipPriceUsdYearly, 34.99),
    };
    await api.set(SETTINGS_KEY, cleanSettings, true);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(cleanSettings));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rebafilme_settings_updated', { detail: cleanSettings }));
    }
    setSettings(cleanSettings);
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
            <Save size={15} /> {saved ? 'Saved!' : 'Save Changes'}
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
            </div>
          </div>
          <div className="adm-form-row" style={{ marginTop: '.75rem' }}>
            <div>
              <span className="adm-form-row-label">Enable Download Button</span>
              <small style={{ display: 'block', color: '#555', fontSize: '.78rem' }}>
                Shows Download button on movie detail and cinema pages
              </small>
            </div>
            <label className="adm-toggle">
              <input type="checkbox" checked={!!settings.downloadEnabled} onChange={set('downloadEnabled')} />
              <span className="adm-toggle-track" />
            </label>
          </div>
        </div>

        {/* ── 💰 Pillar 1: SmartLinks & Load Balancing ── */}
        <div className="adm-settings-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div>
              <h3 className="adm-settings-heading" style={{ margin: 0 }}>
                💰 Ad Monetization — SmartLinks &amp; Load Balancer
              </h3>
              <small style={{ color: '#888', fontSize: '.82rem' }}>
                Distribute popunder &amp; direct-link traffic across multiple ad networks (Adsterra, Monetag, PopAds, ClickAdu).
              </small>
            </div>
            <label className="adm-toggle">
              <input type="checkbox" checked={!!settings.smartlinksEnabled} onChange={set('smartlinksEnabled')} />
              <span className="adm-toggle-track" />
            </label>
          </div>

          <div className="adm-form-grid">
            <div className="adm-form-group">
              <label className="adm-form-label">Balancing Strategy</label>
              <select
                className="adm-select"
                value={settings.smartlinksStrategy || 'weighted'}
                onChange={set('smartlinksStrategy')}
              >
                <option value="weighted">⚖️ Weighted Distribution (Recommended)</option>
                <option value="round_robin">🔄 Sequential Round-Robin (Equal 1:1)</option>
                <option value="random">🎲 Pure Random (Uniform)</option>
              </select>
              <small style={{ color: '#666', fontSize: '.75rem', marginTop: '.25rem' }}>
                Weighted divides traffic by assigned percentages; Round-Robin cycles sequentially.
              </small>
            </div>

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
              <label className="adm-form-label">Max Popunders Per Session</label>
              <input
                className="adm-input"
                type="number"
                min="1"
                max="30"
                value={settings.smartlinksMaxPerSession ?? 6}
                onChange={set('smartlinksMaxPerSession')}
                placeholder="6"
              />
              <small style={{ color: '#666', fontSize: '.75rem', marginTop: '.25rem' }}>
                Frequency cap per browser session (default 6).
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.35rem', flexWrap: 'wrap', gap: '.5rem' }}>
                <label className="adm-form-label" style={{ margin: 0 }}>
                  Rotating SmartLink URLs &amp; Weights (one per line)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                  <button
                    type="button"
                    className="adm-btn adm-btn-ghost adm-btn-sm"
                    style={{ fontSize: '.72rem', padding: '.2rem .5rem', height: 'auto' }}
                    onClick={() => {
                      if (parsedSmartLinks.length === 0) return;
                      const equalPct = Math.floor(100 / parsedSmartLinks.length);
                      const normalized = parsedSmartLinks.map((item, idx) => {
                        const pct = idx === parsedSmartLinks.length - 1 ? 100 - equalPct * (parsedSmartLinks.length - 1) : equalPct;
                        return `${item.url} | ${pct}%`;
                      }).join('\n');
                      setSettings((p) => ({ ...p, smartlinksList: normalized }));
                    }}
                  >
                    ⚖️ Equalize Weights (50/50)
                  </button>
                  <span style={{ fontSize: '.75rem', color: '#3b82f6', fontWeight: 600 }}>
                    Syntax: <code>URL | weight%</code>
                  </span>
                </div>
              </div>
              <textarea
                className="adm-input"
                rows={5}
                value={settings.smartlinksList || ''}
                onChange={set('smartlinksList')}
                placeholder={`https://nickeldefiancepriest.com/your-adsterra-key | 60%\nhttps://omg10.com/4/your-monetag-key | 30%\nhttps://clickadu.com/your-clickadu-key | 10%`}
                style={{ fontFamily: 'monospace', fontSize: '0.82rem', resize: 'vertical' }}
              />
              <small style={{ color: '#777', fontSize: '.75rem', marginTop: '.25rem' }}>
                Paste direct links from Adsterra, Monetag, PopAds, or ClickAdu. Add <code>| 60%</code> to assign custom traffic weights.
              </small>

              {parsedSmartLinks.some((item) => item.hasInvalidWeight) && (
                <div style={{ color: '#f59e0b', fontSize: '.78rem', marginTop: '.4rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                  ⚠️ Some links have unparseable weights and are defaulting to equal weight (1).
                </div>
              )}
            </div>

            {/* ── Live Traffic Share Visualizer Widget ── */}
            {parsedSmartLinks.length > 0 && (
              <div className="adm-form-group full" style={{ background: '#0e0e14', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem' }}>
                  <span style={{ fontSize: '.82rem', fontWeight: 700, color: '#ffd700', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                    <BarChart2 size={15} /> Live Traffic Allocation Preview ({parsedSmartLinks.length} networks)
                  </span>
                  <span style={{ fontSize: '.72rem', color: '#888' }}>
                    Mode: <strong>{settings.smartlinksStrategy === 'round_robin' ? 'Round-Robin' : settings.smartlinksStrategy === 'random' ? 'Random' : 'Weighted'}</strong>
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
                  {parsedSmartLinks.map((item, idx) => {
                    const effectivePct = settings.smartlinksStrategy === 'round_robin' || settings.smartlinksStrategy === 'random'
                      ? Math.round(100 / parsedSmartLinks.length)
                      : item.percentage;

                    return (
                      <div key={idx} style={{ background: '#161622', padding: '.65rem .85rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.35rem', fontSize: '.8rem' }}>
                          <span style={{ fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: idx === 0 ? '#3b82f6' : idx === 1 ? '#22c55e' : idx === 2 ? '#f59e0b' : '#ec4899', display: 'inline-block' }} />
                            {item.domain}
                          </span>
                          <span style={{ color: '#ffd700', fontWeight: 700 }}>
                            {settings.smartlinksStrategy === 'round_robin'
                              ? `${effectivePct}% (Equal 1:1)`
                              : settings.smartlinksStrategy === 'random'
                              ? `${effectivePct}% (Uniform Random)`
                              : `${effectivePct}% of traffic (${item.weight} pts)`}
                          </span>
                        </div>

                        <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${effectivePct}%`,
                              height: '100%',
                              background: idx === 0 ? 'linear-gradient(90deg, #2563eb, #3b82f6)' : idx === 1 ? 'linear-gradient(90deg, #16a34a, #22c55e)' : idx === 2 ? 'linear-gradient(90deg, #d97706, #f59e0b)' : 'linear-gradient(90deg, #db2777, #ec4899)',
                              borderRadius: 3,
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>

                        <div style={{ fontSize: '.7rem', color: '#666', marginTop: '.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.url}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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

        {/* ── Pillar 4: Direct MTN MoMo & Airtel VIP Pass ── */}
        <div className="adm-settings-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div>
              <h3 className="adm-settings-heading" style={{ margin: 0, color: '#ffd700' }}>
                MTN MoMo &amp; Airtel VIP Membership System
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
                min="50"
                max="500000"
                value={settings.vipPriceDaily ?? ''}
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
                min="50"
                max="500000"
                value={settings.vipPriceMonthly ?? ''}
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
                min="50"
                max="5000000"
                value={settings.vipPriceYearly ?? ''}
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
                min="0.01"
                max="500"
                value={settings.vipPriceUsdDaily ?? ''}
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
                min="0.01"
                max="1000"
                value={settings.vipPriceUsdMonthly ?? ''}
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
                min="0.01"
                max="5000"
                value={settings.vipPriceUsdYearly ?? ''}
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
                Master kill switch: hides VIP icons/buttons and stops all ads (banners, native, video, popunders)
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
