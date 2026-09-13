import React, { useState, useMemo } from 'react';
import { 
  Save, RefreshCw, BarChart2, Plus, Trash2, Pencil, Check, X, 
  ExternalLink, Code, LayoutList, RotateCcw, AlertTriangle 
} from 'lucide-react';
import AdminLayout from './AdminLayout';
import './AdminLayout.css';
import './AdminSettings.css';
import { api } from '../../utils/api';
import { DEFAULT_SETTINGS, SETTINGS_KEY, parsePriceAmount, parseUsdPrice } from '../../utils/settings';
import { parseSmartLinks, serializeSmartLinks } from '../../hooks/useSmartLinks';

const AdminSettings = () => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  // SmartLinks interactive management state
  const [editingLinkIdx, setEditingLinkIdx] = useState(null);
  const [editLinkData, setEditLinkData] = useState({ url: '', weight: '50' });
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkWeight, setNewLinkWeight] = useState('50');
  const [rawTextMode, setRawTextMode] = useState(false);

  const parsedSmartLinks = useMemo(
    () => parseSmartLinks(settings.smartlinksList || ''),
    [settings.smartlinksList]
  );

  React.useEffect(() => {
    api.get(SETTINGS_KEY, DEFAULT_SETTINGS).then((s) => {
      if (!s || typeof s !== 'object') return;
      setSettings({
        ...DEFAULT_SETTINGS,
        ...s,
        // Respect empty string from server (intentional clear), but fall back to default if key is missing entirely
        smartlinksList: typeof s.smartlinksList === 'string'
          ? s.smartlinksList
          : DEFAULT_SETTINGS.smartlinksList,
      });
    });
  }, []);

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setSettings((p) => ({ ...p, [field]: val }));
  };

  // Interactive SmartLink actions
  const handleAddSmartLink = () => {
    if (!newLinkUrl || !newLinkUrl.trim()) return;
    let url = newLinkUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    const weight = Number(newLinkWeight) > 0 ? Number(newLinkWeight) : 50;
    const current = [...parsedSmartLinks, { url, weight }];
    const serialized = serializeSmartLinks(current);
    setSettings((p) => ({ ...p, smartlinksList: serialized }));
    setNewLinkUrl('');
    setNewLinkWeight('50');
  };

  const handleRemoveSmartLink = (index) => {
    const updated = parsedSmartLinks.filter((_, idx) => idx !== index);
    const serialized = serializeSmartLinks(updated);
    setSettings((p) => ({ ...p, smartlinksList: serialized }));
    if (editingLinkIdx === index) {
      setEditingLinkIdx(null);
    }
  };

  const handleStartEdit = (index) => {
    setEditingLinkIdx(index);
    setEditLinkData({
      url: parsedSmartLinks[index].url,
      weight: String(parsedSmartLinks[index].weight),
    });
  };

  const handleSaveEdit = (index) => {
    let url = (editLinkData.url || '').trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    const weight = Number(editLinkData.weight) > 0 ? Number(editLinkData.weight) : 1;
    const updated = parsedSmartLinks.map((item, idx) =>
      idx === index ? { ...item, url, weight } : item
    );
    const serialized = serializeSmartLinks(updated);
    setSettings((p) => ({ ...p, smartlinksList: serialized }));
    setEditingLinkIdx(null);
  };

  const handleCancelEdit = () => {
    setEditingLinkIdx(null);
  };

  const handleEqualize = () => {
    if (parsedSmartLinks.length === 0) return;
    const equalPct = Math.floor(100 / parsedSmartLinks.length);
    const normalized = parsedSmartLinks.map((item, idx) => {
      const pct = idx === parsedSmartLinks.length - 1 ? 100 - equalPct * (parsedSmartLinks.length - 1) : equalPct;
      return `${item.url} | ${pct}%`;
    }).join('\n');
    setSettings((p) => ({ ...p, smartlinksList: normalized }));
  };

  const handleClearAllSmartLinks = () => {
    if (window.confirm('Remove all rotating SmartLinks? Popunders and ad redirects will be completely disabled.')) {
      setSettings((p) => ({ ...p, smartlinksList: '' }));
      setEditingLinkIdx(null);
    }
  };

  const handleResetDefaultSmartLinks = () => {
    setSettings((p) => ({ ...p, smartlinksList: DEFAULT_SETTINGS.smartlinksList }));
    setEditingLinkIdx(null);
  };

  const handleTestSmartLink = (url) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSave = async () => {
    const cleanSettings = {
      ...settings,
      smartlinksList: typeof settings.smartlinksList === 'string' ? settings.smartlinksList.trim() : '',
      vipPriceDaily: parsePriceAmount(settings.vipPriceDaily, 1000),
      vipPriceMonthly: parsePriceAmount(settings.vipPriceMonthly, 5000),
      vipPriceYearly: parsePriceAmount(settings.vipPriceYearly, 45000),
      vipPriceUsdDaily: parseUsdPrice(settings.vipPriceUsdDaily, 0.99),
      vipPriceUsdMonthly: parseUsdPrice(settings.vipPriceUsdMonthly, 3.99),
      vipPriceUsdYearly: parseUsdPrice(settings.vipPriceUsdYearly, 34.99),
      updatedAt: Date.now(),
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

        {/* ── 🔒 Pillar 5: Content Locker & Pay-Per-Download (PPD) ── */}
        <div className="adm-settings-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div>
              <h3 className="adm-settings-heading" style={{ margin: 0 }}>
                🔒 Monetization Pillar 5 — Content Locker &amp; Pay-Per-Download (PPD)
              </h3>
              <small style={{ color: '#888', fontSize: '.82rem' }}>
                Monetize file downloads via Linkvertise, CPAGrip, or Monetag SmartLinks before unlocking high-speed video files. VIPs skip automatically.
              </small>
            </div>
            <label className="adm-toggle">
              <input type="checkbox" checked={!!settings.contentLockerEnabled} onChange={set('contentLockerEnabled')} />
              <span className="adm-toggle-track" />
            </label>
          </div>

          <div className="adm-form-grid">
            <div className="adm-form-group full">
              <label className="adm-form-label">Content Locker / PPD Sponsor URL</label>
              <input 
                className="adm-input" 
                value={settings.contentLockerUrl || ''} 
                onChange={set('contentLockerUrl')} 
                placeholder="https://linkvertise.com/your-locker-link (Leave blank to use SmartLink balancer)" 
              />
              <small style={{ color: '#666', fontSize: '.75rem', marginTop: '.25rem' }}>
                Paste your Linkvertise, CPAGrip, or Monetag Direct Link. If left blank, it automatically defaults to your highest-weight SmartLink.
              </small>
            </div>

            <div className="adm-form-group">
              <label className="adm-form-label">Verification Timer (seconds)</label>
              <input
                className="adm-input"
                type="number"
                min="5"
                max="60"
                value={settings.contentLockerTimer ?? 10}
                onChange={set('contentLockerTimer')}
                placeholder="10"
              />
              <small style={{ color: '#666', fontSize: '.75rem', marginTop: '.25rem' }}>
                Countdown duration displayed to visitors while completing the sponsor task (10s recommended).
              </small>
            </div>

            <div className="adm-form-group">
              <label className="adm-form-label">Locker Network</label>
              <select
                className="adm-select"
                value={settings.contentLockerNetwork || 'auto'}
                onChange={set('contentLockerNetwork')}
              >
                <option value="auto">🌐 Auto / SmartLink Fallback</option>
                <option value="linkvertise">🔗 Linkvertise</option>
                <option value="cpagrip">🔒 CPAGrip</option>
                <option value="monetag">⚡ Monetag Direct</option>
                <option value="custom">🛠️ Custom PPD Provider</option>
              </select>
            </div>

            <div className="adm-form-group">
              <label className="adm-form-label">Locker Modal Title</label>
              <input
                className="adm-input"
                value={settings.contentLockerTitle || 'Unlock High-Speed HD Download'}
                onChange={set('contentLockerTitle')}
                placeholder="Unlock High-Speed HD Download"
              />
            </div>
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

            {/* ── Rotating SmartLinks Manager ── */}
            <div className="adm-form-group full">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem', flexWrap: 'wrap', gap: '.5rem' }}>
                <div>
                  <label className="adm-form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                    <BarChart2 size={16} color="#ffd700" />
                    Active SmartLinks ({parsedSmartLinks.length})
                  </label>
                  <small style={{ color: '#888', fontSize: '.75rem' }}>
                    Distribution Mode: <strong style={{ color: '#fff' }}>{settings.smartlinksStrategy === 'round_robin' ? 'Round-Robin (1:1)' : settings.smartlinksStrategy === 'random' ? 'Random' : 'Weighted'}</strong>
                  </small>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="adm-btn adm-btn-ghost adm-btn-sm"
                    style={{ fontSize: '.72rem', padding: '.25rem .55rem' }}
                    onClick={handleEqualize}
                    title="Distribute traffic equally across all active links"
                  >
                    ⚖️ Equalize (50/50)
                  </button>
                  <button
                    type="button"
                    className="adm-btn adm-btn-ghost adm-btn-sm"
                    style={{ fontSize: '.72rem', padding: '.25rem .55rem' }}
                    onClick={handleResetDefaultSmartLinks}
                    title="Reset to recommended default networks"
                  >
                    <RotateCcw size={12} /> Defaults
                  </button>
                  {parsedSmartLinks.length > 0 && (
                    <button
                      type="button"
                      className="adm-btn adm-btn-ghost adm-btn-sm"
                      style={{ fontSize: '.72rem', padding: '.25rem .55rem', color: '#f87171' }}
                      onClick={handleClearAllSmartLinks}
                      title="Clear all smartlinks"
                    >
                      <Trash2 size={12} /> Clear All
                    </button>
                  )}
                  <button
                    type="button"
                    className="adm-btn adm-btn-ghost adm-btn-sm"
                    style={{ fontSize: '.72rem', padding: '.25rem .55rem' }}
                    onClick={() => setRawTextMode((p) => !p)}
                    title="Toggle raw syntax editor"
                  >
                    {rawTextMode ? <LayoutList size={12} /> : <Code size={12} />} {rawTextMode ? 'Visual Cards' : 'Raw Text'}
                  </button>
                </div>
              </div>

              {/* Raw Text View (for power users / bulk copy-paste) */}
              {rawTextMode ? (
                <div>
                  <textarea
                    className="adm-input"
                    rows={6}
                    value={settings.smartlinksList || ''}
                    onChange={set('smartlinksList')}
                    placeholder={`https://nickeldefiancepriest.com/your-adsterra-key | 60%\nhttps://omg10.com/4/your-monetag-key | 30%\nhttps://clickadu.com/your-clickadu-key | 10%`}
                    style={{ fontFamily: 'monospace', fontSize: '0.82rem', resize: 'vertical' }}
                  />
                  <small style={{ color: '#777', fontSize: '.75rem', marginTop: '.25rem', display: 'block' }}>
                    Syntax: <code>URL | weight%</code> (one URL per line). Leave empty to disable all smartlink popunders.
                  </small>
                </div>
              ) : (
                /* Visual Card Manager (Remove, Edit, Test, Add) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
                  {parsedSmartLinks.length === 0 ? (
                    <div className="adm-sl-empty-state">
                      <p style={{ margin: '0 0 .5rem', color: '#94a3b8' }}>
                        🚫 No SmartLinks configured. Popunders and direct-link redirects are currently <strong>inactive</strong>.
                      </p>
                      <button
                        type="button"
                        className="adm-btn adm-btn-ghost adm-btn-sm"
                        style={{ fontSize: '.75rem', margin: '0 auto', color: '#38bdf8' }}
                        onClick={handleResetDefaultSmartLinks}
                      >
                        <RotateCcw size={13} /> Load Recommended Networks (Adsterra, Monetag, ClickAdu)
                      </button>
                    </div>
                  ) : (
                    parsedSmartLinks.map((item, idx) => {
                      const isEditing = editingLinkIdx === idx;
                      const effectivePct = settings.smartlinksStrategy === 'round_robin' || settings.smartlinksStrategy === 'random'
                        ? Math.round(100 / parsedSmartLinks.length)
                        : item.percentage;
                      const dotColor = idx === 0 ? '#3b82f6' : idx === 1 ? '#22c55e' : idx === 2 ? '#f59e0b' : '#ec4899';

                      return (
                        <div key={idx} className={`adm-sl-card ${isEditing ? 'adm-sl-card-editing' : ''}`}>
                          <div className="adm-sl-header">
                            <span className="adm-sl-domain">
                              <span className="adm-sl-dot" style={{ background: dotColor }} />
                              {item.domain}
                            </span>
                            <span className="adm-sl-pct">
                              {settings.smartlinksStrategy === 'round_robin'
                                ? `${effectivePct}% (1:1 Cycle)`
                                : settings.smartlinksStrategy === 'random'
                                ? `${effectivePct}% (Random)`
                                : `${effectivePct}% traffic (${item.weight} pts)`}
                            </span>
                          </div>

                          <div className="adm-sl-bar-track">
                            <div
                              className="adm-sl-bar-fill"
                              style={{
                                width: `${effectivePct}%`,
                                background: idx === 0
                                  ? 'linear-gradient(90deg, #2563eb, #3b82f6)'
                                  : idx === 1
                                  ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                                  : idx === 2
                                  ? 'linear-gradient(90deg, #d97706, #f59e0b)'
                                  : 'linear-gradient(90deg, #db2777, #ec4899)',
                              }}
                            />
                          </div>

                          {isEditing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '.45rem', marginTop: '.4rem' }}>
                              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                                <input
                                  className="adm-input"
                                  style={{ flex: 1, minWidth: 200, fontSize: '.78rem' }}
                                  value={editLinkData.url}
                                  onChange={(e) => setEditLinkData((p) => ({ ...p, url: e.target.value }))}
                                  placeholder="https://..."
                                  autoFocus
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                                  <span style={{ fontSize: '.75rem', color: '#888' }}>Weight:</span>
                                  <input
                                    className="adm-input"
                                    type="number"
                                    min="1"
                                    max="1000"
                                    style={{ width: 70, fontSize: '.78rem' }}
                                    value={editLinkData.weight}
                                    onChange={(e) => setEditLinkData((p) => ({ ...p, weight: e.target.value }))}
                                  />
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '.4rem', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  className="adm-sl-action-btn"
                                  onClick={handleCancelEdit}
                                >
                                  <X size={12} /> Cancel
                                </button>
                                <button
                                  type="button"
                                  className="adm-sl-action-btn adm-sl-btn-save"
                                  onClick={() => handleSaveEdit(idx)}
                                >
                                  <Check size={12} /> Update Link
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="adm-sl-url-row">
                              <span className="adm-sl-url-text" title={item.url}>
                                {item.url}
                              </span>
                              <div className="adm-sl-actions">
                                <button
                                  type="button"
                                  className="adm-sl-action-btn adm-sl-btn-test"
                                  onClick={() => handleTestSmartLink(item.url)}
                                  title="Test link in new tab"
                                >
                                  <ExternalLink size={12} /> Test
                                </button>
                                <button
                                  type="button"
                                  className="adm-sl-action-btn"
                                  onClick={() => handleStartEdit(idx)}
                                  title="Edit link URL or weight"
                                >
                                  <Pencil size={12} /> Edit
                                </button>
                                <button
                                  type="button"
                                  className="adm-sl-action-btn adm-sl-btn-delete"
                                  onClick={() => handleRemoveSmartLink(idx)}
                                  title="Remove this smartlink from rotation"
                                >
                                  <Trash2 size={12} /> Remove
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                  {/* Quick Add New SmartLink Panel */}
                  <div className="adm-sl-add-panel">
                    <div style={{ fontSize: '.78rem', fontWeight: 700, color: '#38bdf8', marginBottom: '.4rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                      <Plus size={14} /> Add New Direct Link / SmartLink
                    </div>
                    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <input
                        className="adm-input"
                        style={{ flex: 1, minWidth: 220, fontSize: '.78rem' }}
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        placeholder="https://ad-network.com/direct-link or smartlink URL"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSmartLink();
                          }
                        }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                        <span style={{ fontSize: '.75rem', color: '#888' }}>Weight:</span>
                        <input
                          className="adm-input"
                          type="number"
                          min="1"
                          max="1000"
                          style={{ width: 70, fontSize: '.78rem' }}
                          value={newLinkWeight}
                          onChange={(e) => setNewLinkWeight(e.target.value)}
                          placeholder="50"
                        />
                      </div>
                      <button
                        type="button"
                        className="adm-btn adm-btn-primary adm-btn-sm"
                        style={{ fontSize: '.78rem', padding: '.45rem .85rem', height: 'auto' }}
                        onClick={handleAddSmartLink}
                        disabled={!newLinkUrl.trim()}
                      >
                        <Plus size={14} /> Add Link
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {parsedSmartLinks.some((item) => item.hasInvalidWeight) && (
                <div style={{ color: '#f59e0b', fontSize: '.78rem', marginTop: '.4rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                  <AlertTriangle size={13} /> Some links had invalid weights and were defaulted to weight 1.
                </div>
              )}
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
