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
                onClick={() => {
                  if (window.confirm('Clear all curated movie pins?')) {
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
                onClick={() => {
                  if (window.confirm('Delete ALL ads? Cannot be undone!')) {
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
