import React, { useState, useCallback } from 'react';
import { Plus, Trash2, Megaphone, X, Check, Pencil, Filter } from 'lucide-react';
import { useAds } from '../../contexts/AdsContext';
import AdminLayout from './AdminLayout';
import './AdminLayout.css';
import './AdminAds.css';

const POSITIONS = [
  { value: 'home_top', label: 'Home — Top (above hero)' },
  { value: 'home_mid', label: 'Home — Middle (between rows)' },
  { value: 'movie_detail', label: 'Movie detail page' },
  { value: 'search_page', label: 'Search page' },
  { value: 'cinema_top', label: 'Trailer page — above player' },
  { value: 'cinema_download', label: 'Trailer page — near download' },
];

const EMPTY_AD = {
  title: '',
  sponsorName: '',
  adKind: 'sponsor',
  imageUrl: '',
  linkUrl: '',
  position: 'home_mid',
  startsAt: '',
  expiresAt: '',
  priority: 0,
};

const useToast = () => {
  const [toast, setToast] = useState(null);
  const show = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }, []);
  return { toast, show };
};

const AdModal = ({ initial, onSave, onClose, title }) => {
  const [form, setForm] = useState({ ...EMPTY_AD, ...initial });
  const set = (field) => (e) => setForm((p) => ({
    ...p,
    [field]: e.target.type === 'number' ? Number(e.target.value) : e.target.value,
  }));

  return (
    <div className="adm-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal" style={{ maxWidth: 560 }}>
        <div className="adm-modal-header">
          <h2 className="adm-modal-title">{title}</h2>
          <button className="adm-modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="adm-form-grid">
          <div className="adm-form-group full">
            <label className="adm-form-label">Campaign Title *</label>
            <input className="adm-input" value={form.title} onChange={set('title')} placeholder="e.g. Summer Sponsor Pack" required />
          </div>
          <div className="adm-form-group full">
            <label className="adm-form-label">Sponsor / Brand Name</label>
            <input className="adm-input" value={form.sponsorName} onChange={set('sponsorName')} placeholder="e.g. MTN Rwanda" />
          </div>
          <div className="adm-form-group">
            <label className="adm-form-label">Ad Type</label>
            <select className="adm-select" value={form.adKind} onChange={set('adKind')}>
              <option value="sponsor">Sponsor (branded)</option>
              <option value="banner">Banner (promo)</option>
            </select>
          </div>
          <div className="adm-form-group">
            <label className="adm-form-label">Priority (higher first)</label>
            <input className="adm-input" type="number" min="0" value={form.priority} onChange={set('priority')} />
          </div>
          <div className="adm-form-group full">
            <label className="adm-form-label">Banner Image URL</label>
            <input className="adm-input" value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://…/sponsor-banner.jpg" />
          </div>
          <div className="adm-form-group full">
            <label className="adm-form-label">Click URL (sponsor website / WhatsApp)</label>
            <input className="adm-input" value={form.linkUrl} onChange={set('linkUrl')} placeholder="https://wa.me/250… or brand site" />
          </div>
          <div className="adm-form-group full">
            <label className="adm-form-label">Placement</label>
            <select className="adm-select" value={form.position} onChange={set('position')}>
              {POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="adm-form-group">
            <label className="adm-form-label">Start Date (optional)</label>
            <input className="adm-input" type="date" value={form.startsAt} onChange={set('startsAt')} />
          </div>
          <div className="adm-form-group">
            <label className="adm-form-label">End Date (optional)</label>
            <input className="adm-input" type="date" value={form.expiresAt} onChange={set('expiresAt')} />
          </div>

          {form.imageUrl && (
            <div className="adm-form-group full">
              <label className="adm-form-label">Preview</label>
              <img
                src={form.imageUrl}
                alt="Ad preview"
                className="adm-ad-preview-img"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}
        </div>

        <div className="adm-form-actions">
          <button className="adm-btn adm-btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="adm-btn adm-btn-primary"
            onClick={() => { if (!form.title) return; onSave(form); }}
          >
            <Check size={16} /> Save
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminAds = () => {
  const { ads, addAd, updateAd, deleteAd, toggleAd } = useAds();
  const { toast, show } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editAd, setEditAd] = useState(null);
  const [filterPos, setFilterPos] = useState('all');

  const filtered = filterPos === 'all' ? ads : ads.filter((a) => a.position === filterPos);
  const activeCount = ads.filter((a) => a.active).length;

  const handleSave = (form) => {
    if (editAd) {
      updateAd(editAd.id, form);
      show('Sponsor ad updated!');
    } else {
      addAd(form);
      show('Sponsor ad created and set to LIVE!');
    }
    setModalOpen(false);
    setEditAd(null);
  };

  const handleDelete = (id, title) => {
    if (!window.confirm(`Delete sponsor ad "${title}"?`)) return;
    deleteAd(id);
    show('Ad deleted.', 'error');
  };

  return (
    <AdminLayout>
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Sponsor Ads</h1>
          <p className="adm-page-subtitle">{activeCount} live / {ads.length} total campaigns</p>
        </div>
        <button className="adm-btn adm-btn-primary" onClick={() => { setEditAd(null); setModalOpen(true); }}>
          <Plus size={16} /> New Sponsor Ad
        </button>
      </div>

      <div className="adm-ad-positions-legend">
        <div className="adm-position-pill" style={{ width: '100%', marginBottom: '.25rem' }}>
          <Filter size={14} />
          <span>Filter by placement:</span>
          <select className="adm-select adm-select-inline" value={filterPos} onChange={(e) => setFilterPos(e.target.value)}>
            <option value="all">All placements</option>
            {POSITIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        {POSITIONS.map((p) => (
          <div key={p.value} className="adm-position-pill">
            <span className="adm-badge adm-badge-default">{p.value}</span>
            <span>{p.label}</span>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="adm-empty" style={{ marginTop: '2rem' }}>
          <Megaphone size={40} />
          <p>No sponsor ads yet. Create a campaign when you get a brand partner.</p>
        </div>
      ) : (
        <div className="adm-ads-grid">
          {filtered.map((ad) => (
            <div key={ad.id} className={`adm-ad-card${ad.active ? ' active' : ''}`}>
              <div className="adm-ad-card-img">
                {ad.imageUrl ? (
                  <img src={ad.imageUrl} alt={ad.title} />
                ) : (
                  <div className="adm-ad-placeholder">
                    <Megaphone size={28} />
                    <span>{ad.sponsorName || 'Text Ad'}</span>
                  </div>
                )}
                <span className={`adm-badge ${ad.active ? 'adm-badge-active' : 'adm-badge-inactive'}`} style={{ position: 'absolute', top: '.5rem', left: '.5rem' }}>
                  {ad.active ? 'LIVE' : 'OFF'}
                </span>
                {ad.adKind === 'sponsor' && (
                  <span className="adm-badge adm-badge-sponsor" style={{ position: 'absolute', top: '.5rem', right: '.5rem' }}>SPONSOR</span>
                )}
              </div>

              <div className="adm-ad-card-body">
                <div className="adm-ad-card-title">{ad.title}</div>
                {ad.sponsorName && <div className="adm-ad-sponsor-line">{ad.sponsorName}</div>}
                <div className="adm-ad-card-position" style={{ marginBottom: '.5rem' }}>
                  <span className="adm-badge adm-badge-default">{ad.position}</span>
                  {ad.startsAt && <span className="adm-badge adm-badge-inactive" style={{ marginLeft: '.35rem' }}>From {new Date(ad.startsAt).toLocaleDateString()}</span>}
                  {ad.expiresAt && <span className="adm-badge adm-badge-inactive" style={{ marginLeft: '.35rem' }}>Until {new Date(ad.expiresAt).toLocaleDateString()}</span>}
                </div>

                <div className="adm-ad-stats">
                  <div><div className="adm-ad-stat-label">Views</div><div className="adm-ad-stat-val">{ad.impressions || 0}</div></div>
                  <div><div className="adm-ad-stat-label">Clicks</div><div className="adm-ad-stat-val blue">{ad.clicks || 0}</div></div>
                  <div><div className="adm-ad-stat-label">CTR</div><div className="adm-ad-stat-val green">{ad.impressions ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : 0}%</div></div>
                </div>

                {ad.linkUrl && (
                  <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="adm-ad-link">
                    {ad.linkUrl.slice(0, 44)}{ad.linkUrl.length > 44 ? '…' : ''}
                  </a>
                )}
              </div>

              <div className="adm-ad-card-footer">
                <div className="adm-ad-toggle-row">
                  <span style={{ fontSize: '.82rem', color: '#666' }}>{ad.active ? 'Active' : 'Inactive'}</span>
                  <label className="adm-toggle">
                    <input type="checkbox" checked={ad.active} onChange={() => toggleAd(ad.id)} />
                    <span className="adm-toggle-track" />
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '.35rem' }}>
                  <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => { setEditAd(ad); setModalOpen(true); }}>
                    <Pencil size={13} /> Edit
                  </button>
                  <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => handleDelete(ad.id, ad.title)}>
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <AdModal
          title={editAd ? `Edit: ${editAd.title}` : 'New Sponsor Ad'}
          initial={editAd || EMPTY_AD}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditAd(null); }}
        />
      )}
      {toast && <div className={`adm-toast${toast.type === 'error' ? ' error' : ''}`}>{toast.msg}</div>}
    </AdminLayout>
  );
};

export default AdminAds;
