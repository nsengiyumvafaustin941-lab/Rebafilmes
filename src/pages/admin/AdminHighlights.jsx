import React, { useState, useCallback } from 'react';
import { Plus, Trash2, PlayCircle, X, Check, Eye, EyeOff } from 'lucide-react';
import { useHighlights } from '../../contexts/HighlightsContext';
import AdminLayout from './AdminLayout';
import './AdminLayout.css';

/* ─── Helpers ────────────────────────────────────────── */
const extractYouTubeId = (url) => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
};

const useToast = () => {
  const [toast, setToast] = useState(null);
  const show = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }, []);
  return { toast, show };
};

/* ─── Add Modal ──────────────────────────────────────── */
const AddModal = ({ onSave, onClose }) => {
  const [form, setForm] = useState({ title: '', youtubeUrl: '', description: '' });
  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  const videoId = extractYouTubeId(form.youtubeUrl);

  return (
    <div className="adm-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal" style={{ maxWidth: 560 }}>
        <div className="adm-modal-header">
          <h2 className="adm-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <PlayCircle size={20} style={{ color: '#ff0000' }} /> Add YouTube Highlight
          </h2>
          <button className="adm-modal-close" onClick={onClose}><X size={16}/></button>
        </div>

        <div className="adm-form-grid">
          <div className="adm-form-group full">
            <label className="adm-form-label">Title *</label>
            <input className="adm-input" value={form.title} onChange={set('title')} placeholder="e.g. Season 2 Trailer" required />
          </div>
          <div className="adm-form-group full">
            <label className="adm-form-label">YouTube URL *</label>
            <input
              className="adm-input"
              value={form.youtubeUrl}
              onChange={set('youtubeUrl')}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            {form.youtubeUrl && !videoId && (
              <small style={{ color: '#e50914', fontSize: '.75rem', marginTop: '.25rem', display: 'block' }}>
                ⚠ Invalid YouTube URL. Paste a valid watch/shorts/embed link.
              </small>
            )}
          </div>
          <div className="adm-form-group full">
            <label className="adm-form-label">Description (optional)</label>
            <textarea
              className="adm-input"
              value={form.description}
              onChange={set('description')}
              placeholder="Short description shown below the video…"
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Live Preview */}
          {videoId && (
            <div className="adm-form-group full">
              <label className="adm-form-label">Live Preview</label>
              <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,.1)' }}>
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title="Preview"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="adm-form-actions">
          <button className="adm-btn adm-btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="adm-btn adm-btn-primary"
            style={{ background: 'linear-gradient(135deg,#ff0000,#c00)' }}
            onClick={() => { if (!form.title || !videoId) return; onSave({ ...form, videoId }); }}
            disabled={!form.title || !videoId}
          >
            <Check size={16}/> Add Highlight
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Page ──────────────────────────────────────── */
const AdminHighlights = () => {
  const { highlights, addHighlight, deleteHighlight, toggleHighlight } = useHighlights();
  const { toast, show } = useToast();
  const [modalOpen, setModalOpen] = useState(false);

  const handleAdd = (form) => {
    addHighlight(form);
    setModalOpen(false);
    show('Highlight added and set to LIVE!');
  };

  const handleDelete = (id, title) => {
    if (!window.confirm(`Delete highlight "${title}"?`)) return;
    deleteHighlight(id);
    show('Highlight deleted.', 'error');
  };

  const active = highlights.filter(h => h.active).length;

  return (
    <AdminLayout>
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title" style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
            <PlayCircle size={26} style={{ color: '#ff0000' }} /> YouTube Highlights
          </h1>
          <p className="adm-page-subtitle">{active} active / {highlights.length} total highlights</p>
        </div>
        <button className="adm-btn adm-btn-primary" style={{ background: 'linear-gradient(135deg,#ff0000,#c00)' }} onClick={() => setModalOpen(true)}>
          <Plus size={16}/> Add Highlight
        </button>
      </div>

      {highlights.length === 0 ? (
        <div className="adm-empty" style={{ marginTop: '2rem' }}>
          <PlayCircle size={44} style={{ color: '#ff0000', opacity: .5 }}/>
          <p>No highlights yet. Add a YouTube link to showcase your content to users.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
          {highlights.map(h => (
            <div key={h.id} style={{
              background: 'rgba(255,255,255,.03)',
              border: `1px solid ${h.active ? 'rgba(255,0,0,.25)' : 'rgba(255,255,255,.07)'}`,
              borderRadius: 12,
              overflow: 'hidden',
              transition: 'border-color .2s'
            }}>
              {/* Thumbnail embed */}
              <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000' }}>
                <iframe
                  src={`https://www.youtube.com/embed/${h.videoId}`}
                  title={h.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                />
                <span style={{
                  position: 'absolute', top: '.5rem', left: '.5rem',
                  background: h.active ? 'rgba(255,0,0,.85)' : 'rgba(0,0,0,.7)',
                  color: '#fff', fontSize: '.65rem', fontWeight: 700,
                  padding: '.15rem .45rem', borderRadius: 4, letterSpacing: 1
                }}>
                  {h.active ? 'LIVE' : 'OFF'}
                </span>
              </div>

              {/* Info */}
              <div style={{ padding: '.9rem 1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '.9rem', marginBottom: '.25rem', color: '#fff' }}>{h.title}</div>
                {h.description && (
                  <div style={{ fontSize: '.78rem', color: '#777', marginBottom: '.6rem', lineHeight: 1.5 }}>{h.description}</div>
                )}
                <div style={{ fontSize: '.7rem', color: '#555' }}>{new Date(h.createdAt).toLocaleDateString()}</div>
              </div>

              {/* Actions */}
              <div style={{ padding: '.5rem 1rem .85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,.05)' }}>
                <button
                  onClick={() => { toggleHighlight(h.id); show(h.active ? 'Highlight hidden.' : 'Highlight is now LIVE!'); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '.4rem',
                    background: 'none', border: '1px solid rgba(255,255,255,.15)',
                    borderRadius: 6, color: '#ccc', fontSize: '.78rem', padding: '.35rem .75rem', cursor: 'pointer'
                  }}
                >
                  {h.active ? <EyeOff size={13}/> : <Eye size={13}/>}
                  {h.active ? 'Hide' : 'Show'}
                </button>
                <button
                  className="adm-btn adm-btn-danger adm-btn-sm"
                  onClick={() => handleDelete(h.id, h.title)}
                >
                  <Trash2 size={13}/> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && <AddModal onSave={handleAdd} onClose={() => setModalOpen(false)} />}
      {toast && <div className={`adm-toast${toast.type === 'error' ? ' error' : ''}`}>{toast.msg}</div>}
    </AdminLayout>
  );
};

export default AdminHighlights;
