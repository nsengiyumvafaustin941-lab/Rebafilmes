import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Plus, Pencil, Trash2, Search, Film, X, Check, Wand2, Upload, CloudUpload } from 'lucide-react';
import { useMovies } from '../../contexts/MoviesContext';
import AdminLayout from './AdminLayout';
import './AdminLayout.css';

const EMPTY_MOVIE = {
  title: '', type: 'movie', poster: '', backdrop: '', videoUrl: '',
  trailerKey: '',
  genre: '', country: '', year: new Date().getFullYear(),
  badge: 'HD', description: '', featured: false, popular: false,
  seoTitle: '', seoDesc: '', seoKeywords: '', episodes: []
};

/* ─── Toast helper ─────────────────────────────────── */
const useToast = () => {
  const [toast, setToast] = useState(null);
  const show = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }, []);
  return { toast, show };
};

/* ─── R2 Upload hook ────────────────────────────────── */
const useVideoUpload = (onComplete) => {
  const [state, setState] = useState('idle'); // idle | uploading | done | error
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const xhrRef = useRef(null);

  const upload = useCallback(async (file) => {
    setState('uploading');
    setProgress(0);
    setError(null);

    const session = JSON.parse(localStorage.getItem('rebafilme_admin_session') || 'null');
    const token = session?.token || '';

    // 1. Request presigned URL from backend
    let presignedUrl, publicUrl, contentType;
    try {
      const res = await fetch('/api/admin/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token || '',
        },
        body: JSON.stringify({ filename: file.name, fileSize: file.size }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error ${res.status}`);
      }
      ({ presignedUrl, publicUrl, contentType } = await res.json());
    } catch (err) {
      setState('error');
      setError(err.message);
      return;
    }

    // 2. Upload directly to R2 via XHR (supports progress events)
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`R2 upload failed (HTTP ${xhr.status})`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
      xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', contentType);
      xhr.send(file);
    }).then(() => {
      setState('done');
      setProgress(100);
      onComplete(publicUrl);
    }).catch((err) => {
      setState('error');
      setError(err.message);
    });
  }, [onComplete]);

  const cancel = useCallback(() => {
    xhrRef.current?.abort();
    setState('idle');
    setProgress(0);
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setProgress(0);
    setError(null);
  }, []);

  return { state, progress, error, upload, cancel, reset };
};

/* ─── Video Upload Zone ─────────────────────────────── */
const VideoUploadZone = ({ onUrlReady }) => {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);
  const { state, progress, error, upload, cancel, reset } = useVideoUpload(onUrlReady);

  const handleFile = (file) => {
    if (!file) return;
    upload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  if (state === 'uploading' || state === 'done') {
    return (
      <div style={{
        border: `1px solid ${state === 'done' ? '#22c55e' : '#3b82f6'}`,
        borderRadius: 8,
        padding: '1rem',
        background: state === 'done' ? 'rgba(34,197,94,.08)' : 'rgba(59,130,246,.08)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
          <span style={{ fontSize: '.82rem', color: state === 'done' ? '#22c55e' : '#93c5fd' }}>
            {state === 'done' ? '✅ Upload complete — URL filled in below' : `Uploading… ${progress}%`}
          </span>
          {state === 'uploading'
            ? <button type="button" onClick={cancel} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '.8rem' }}>✕ Cancel</button>
            : <button type="button" onClick={reset} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '.8rem' }}>Upload another</button>
          }
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,.1)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: state === 'done' ? '#22c55e' : 'linear-gradient(90deg,#3b82f6,#60a5fa)',
            borderRadius: 3,
            transition: 'width .15s ease',
          }} />
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div style={{ border: '1px solid #ef4444', borderRadius: 8, padding: '1rem', background: 'rgba(239,68,68,.08)' }}>
        <p style={{ color: '#f87171', fontSize: '.82rem', margin: 0 }}>❌ {error}</p>
        <button type="button" onClick={reset} style={{ marginTop: '.5rem', background: 'none', border: '1px solid #ef4444', color: '#f87171', borderRadius: 5, padding: '.25rem .75rem', cursor: 'pointer', fontSize: '.8rem' }}>Try again</button>
      </div>
    );
  }

  return (
    <div
      onDragEnter={() => setDragging(true)}
      onDragLeave={() => setDragging(false)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      style={{
        border: `2px dashed ${dragging ? '#3b82f6' : 'rgba(255,255,255,.15)'}`,
        borderRadius: 8,
        padding: '1.5rem 1rem',
        textAlign: 'center',
        cursor: 'pointer',
        background: dragging ? 'rgba(59,130,246,.08)' : 'rgba(255,255,255,.02)',
        transition: 'all .2s',
      }}
    >
      <CloudUpload size={28} color={dragging ? '#3b82f6' : '#555'} style={{ marginBottom: '.5rem' }} />
      <p style={{ margin: 0, fontSize: '.85rem', color: '#888' }}>
        Drag &amp; drop a video file here, or <span style={{ color: '#3b82f6', textDecoration: 'underline' }}>click to browse</span>
      </p>
      <p style={{ margin: '.3rem 0 0', fontSize: '.72rem', color: '#555' }}>MP4, MKV, WEBM, AVI, M3U8 — up to 5 GB</p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp4,.mkv,.webm,.avi,.m3u8"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files[0])}
      />
    </div>
  );
};

/* ─── Inline Episode Upload Button ─────────────────── */
const EpisodeUploadBtn = ({ onUrlReady }) => {
  const fileInputRef = useRef(null);
  const { upload, state: uploadState, progress } = useVideoUpload((url) => {
    onUrlReady(url);
  });
  return (
    <>
      <button
        type="button"
        title="Upload video to R2"
        onClick={() => fileInputRef.current?.click()}
        style={{
          background: uploadState === 'done' ? '#22c55e' : 'rgba(59,130,246,.15)',
          border: '1px solid rgba(59,130,246,.4)',
          borderRadius: 5,
          color: '#93c5fd',
          cursor: 'pointer',
          padding: '0 .4rem',
          fontSize: '.7rem',
          height: '100%',
          minWidth: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {uploadState === 'uploading'
          ? <span style={{ fontSize: '.65rem' }}>{progress}%</span>
          : uploadState === 'done'
            ? <Check size={11} />
            : <Upload size={11} />}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp4,.mkv,.webm,.avi,.m3u8"
        style={{ display: 'none' }}
        onChange={(e) => upload(e.target.files[0])}
      />
    </>
  );
};


/* ─── Movie Form Modal ─────────────────────────────── */
const MovieModal = ({ initial, onSave, onClose, title }) => {
  const [form, setForm] = useState({ ...EMPTY_MOVIE, ...initial });
  const [isFetching, setIsFetching] = useState(false);
  const [toast, setToast] = useState(null);
  const [videoTab, setVideoTab] = useState('paste'); // 'paste' | 'upload'

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked
              : e.target.type === 'number'   ? Number(e.target.value)
              : e.target.value;
    setForm(p => ({ ...p, [field]: val }));
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const handleAddEpisode = () => {
    setForm(p => ({
      ...p,
      episodes: [...(p.episodes || []), { id: Date.now().toString(), s: 1, e: (p.episodes?.length || 0) + 1, title: `Episode ${(p.episodes?.length || 0) + 1}`, videoUrl: '' }]
    }));
  };

  const handleUpdateEpisode = (id, field, val) => {
    setForm(p => ({
      ...p,
      episodes: (p.episodes || []).map(ep => ep.id === id ? { ...ep, [field]: val } : ep)
    }));
  };

  const handleRemoveEpisode = (id) => {
    setForm(p => ({
      ...p,
      episodes: (p.episodes || []).filter(ep => ep.id !== id)
    }));
  };

  const handleTMDBFetch = async () => {
    if (!form.title) return showToast('Please enter a title first to search', 'error');
    
    const settings = JSON.parse(localStorage.getItem('rebafilme_settings')) || {};
    if (!settings.tmdbApiKey) return showToast('TMDB API Key missing! Add it in Settings.', 'error');

    setIsFetching(true);
    try {
      const url = `https://api.themoviedb.org/3/search/multi?api_key=${settings.tmdbApiKey}&query=${encodeURIComponent(form.title)}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (!data.results || data.results.length === 0) {
        showToast('No movie found on TMDB', 'error');
        return;
      }
      
      const best = data.results[0];
      const mediaType = best.media_type;
      const baseImg = 'https://image.tmdb.org/t/p/w1280';
      const basePoster = 'https://image.tmdb.org/t/p/w500';

      // Fetch detailed info for genre names, production countries, and trailers
      let genreNames = '';
      let countryNames = '';
      let trailerKey = '';
      try {
        const detailRes = await fetch(
          `https://api.themoviedb.org/3/${mediaType}/${best.id}?api_key=${settings.tmdbApiKey}&append_to_response=videos`
        );
        const detail = await detailRes.json();
        genreNames = (detail.genres || []).map(g => g.name).join(', ');
        countryNames = (detail.production_countries || detail.origin_country || []).map(c => typeof c === 'string' ? c : c.name).join(', ');
        
        // Find Youtube trailer key
        const videos = detail.videos?.results || [];
        const trailer = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer') || videos.find(v => v.site === 'YouTube');
        if (trailer) {
          trailerKey = trailer.key;
        }
      } catch {
        // Detail fetch failed — continue with search data only
      }

      setForm(p => ({
        ...p,
        title: best.title || best.name || p.title,
        type: mediaType === 'tv' ? 'series' : 'movie',
        poster: best.poster_path ? `${basePoster}${best.poster_path}` : p.poster,
        backdrop: best.backdrop_path ? `${baseImg}${best.backdrop_path}` : p.backdrop,
        year: best.release_date ? parseInt(best.release_date.substring(0, 4)) : best.first_air_date ? parseInt(best.first_air_date.substring(0, 4)) : p.year,
        description: best.overview || p.description,
        genre: genreNames || p.genre,
        country: countryNames || p.country,
        trailerKey: trailerKey || p.trailerKey,
        seoTitle: best.title || best.name || p.title,
        seoDesc: best.overview ? best.overview.substring(0, 150) : p.seoDesc,
      }));
      showToast('TMDB data fetched successfully! (incl. genre, country & trailer)');
    } catch (err) {
      console.error('TMDB Fetch Error:', err);
      showToast('Failed to connect to TMDB', 'error');
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="adm-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal">
        <div className="adm-modal-header">
          <h2 className="adm-modal-title">{title}</h2>
          <button className="adm-modal-close" onClick={onClose}><X size={16}/></button>
        </div>

        <div className="adm-form-grid">
          <div className="adm-form-group full">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <label className="adm-form-label">
                Title *
                {form.type === 'series' && <span style={{fontSize: '.75rem', color: '#e50914', marginLeft: '10px'}}>(Use format: 'Series Name - S1E1')</span>}
              </label>
              <button 
                type="button" 
                className="adm-btn adm-btn-sm" 
                style={{ background: '#3b82f6', color: '#fff', padding: '.25rem .5rem', fontSize: '.7rem' }}
                onClick={handleTMDBFetch}
                disabled={isFetching}
              >
                <Wand2 size={12}/> {isFetching ? 'Fetching...' : 'Magic Fetch (TMDB)'}
              </button>
            </div>
            <input className="adm-input" value={form.title} onChange={set('title')} placeholder="Movie title" required />
          </div>
          <div className="adm-form-group">
            <label className="adm-form-label">Type</label>
            <select className="adm-select" value={form.type} onChange={set('type')}>
              <option value="movie">Movie</option>
              <option value="series">Series</option>
            </select>
          </div>
          <div className="adm-form-group">
            <label className="adm-form-label">Badge</label>
            <input className="adm-input" value={form.badge} onChange={set('badge')} placeholder="HD, New, EP 1…" />
          </div>
          <div className="adm-form-group full">
            <label className="adm-form-label">Poster URL</label>
            <input className="adm-input" value={form.poster} onChange={set('poster')} placeholder="https://image.tmdb.org/…" />
          </div>
          <div className="adm-form-group full">
            <label className="adm-form-label">Backdrop URL</label>
            <input className="adm-input" value={form.backdrop} onChange={set('backdrop')} placeholder="https://image.tmdb.org/…" />
          </div>
          <div className="adm-form-group full">
            <label className="adm-form-label">Trailer Key (YouTube Video ID / URL)</label>
            <input className="adm-input" value={form.trailerKey || ''} onChange={set('trailerKey')} placeholder="e.g. AyIZ9tiiN8I" />
          </div>
          {form.type === 'movie' ? (
            <div className="adm-form-group full">
              <label className="adm-form-label">Video URL (MP4 / M3U8)</label>
              {/* Tab toggle */}
              <div style={{ display: 'flex', gap: 0, marginBottom: '.5rem', background: 'rgba(255,255,255,.05)', borderRadius: 6, padding: 2, width: 'fit-content' }}>
                <button
                  type="button"
                  onClick={() => setVideoTab('paste')}
                  style={{
                    padding: '.25rem .75rem', fontSize: '.75rem', borderRadius: 4, border: 'none',
                    background: videoTab === 'paste' ? 'rgba(255,255,255,.12)' : 'transparent',
                    color: videoTab === 'paste' ? '#fff' : '#888', cursor: 'pointer', transition: 'all .15s',
                  }}
                >
                  🔗 Paste URL
                </button>
                <button
                  type="button"
                  onClick={() => setVideoTab('upload')}
                  style={{
                    padding: '.25rem .75rem', fontSize: '.75rem', borderRadius: 4, border: 'none',
                    background: videoTab === 'upload' ? 'rgba(59,130,246,.3)' : 'transparent',
                    color: videoTab === 'upload' ? '#93c5fd' : '#888', cursor: 'pointer', transition: 'all .15s',
                  }}
                >
                  ☁️ Upload File
                </button>
              </div>

              {videoTab === 'paste' ? (
                <input className="adm-input" value={form.videoUrl} onChange={set('videoUrl')} placeholder="https://pub-xxxx.r2.dev/movies/movie.mp4" />
              ) : (
                <>
                  <VideoUploadZone onUrlReady={(url) => {
                    setForm(p => ({ ...p, videoUrl: url }));
                    setVideoTab('paste'); // switch to paste tab to show the filled URL
                  }} />
                  {form.videoUrl && (
                    <input
                      className="adm-input"
                      style={{ marginTop: '.5rem', opacity: .7, fontSize: '.8rem' }}
                      value={form.videoUrl}
                      readOnly
                      placeholder="R2 URL will appear here after upload"
                    />
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="adm-form-group full">
              <div className="adm-ep-manager">
                <div className="adm-ep-header">
                  <h3 className="adm-ep-title">EPISODES MANAGER</h3>
                  <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={handleAddEpisode}>
                    <Plus size={14} /> Add Episode
                  </button>
                </div>
                <div className="adm-ep-grid-header">
                  <div className="col-s">S</div>
                  <div className="col-e">E</div>
                  <div className="col-title">TITLE</div>
                  <div className="col-url">VIDEO URL</div>
                  <div className="col-act"></div>
                </div>
                <div className="adm-ep-list">
                  {(form.episodes || []).map((ep) => (
                    <div key={ep.id} className="adm-ep-row">
                      <input className="adm-input col-s" type="number" min="1" value={ep.s} onChange={e => handleUpdateEpisode(ep.id, 's', Number(e.target.value))} />
                      <input className="adm-input col-e" type="number" min="1" value={ep.e} onChange={e => handleUpdateEpisode(ep.id, 'e', Number(e.target.value))} />
                      <input className="adm-input col-title" value={ep.title} onChange={e => handleUpdateEpisode(ep.id, 'title', e.target.value)} placeholder="Episode Title" />
                      <input className="adm-input col-url" value={ep.videoUrl} onChange={e => handleUpdateEpisode(ep.id, 'videoUrl', e.target.value)} placeholder="Video URL" />
                      <EpisodeUploadBtn onUrlReady={(url) => handleUpdateEpisode(ep.id, 'videoUrl', url)} />
                      <button type="button" className="adm-btn adm-btn-danger adm-btn-sm col-act" onClick={() => handleRemoveEpisode(ep.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="adm-form-group">
            <label className="adm-form-label">Genre</label>
            <input className="adm-input" value={form.genre} onChange={set('genre')} placeholder="Action, Drama…" />
          </div>
          <div className="adm-form-group">
            <label className="adm-form-label">Country</label>
            <input className="adm-input" value={form.country} onChange={set('country')} placeholder="USA, India…" />
          </div>
          <div className="adm-form-group">
            <label className="adm-form-label">Year</label>
            <input className="adm-input" type="number" value={form.year} onChange={set('year')} min="1990" max="2030" />
          </div>
          <div className="adm-form-group full">
            <label className="adm-form-label">Description (Kinyarwanda)</label>
            <textarea className="adm-textarea" value={form.description} onChange={set('description')} placeholder="Inkuru ya filme…" />
          </div>

          <div className="adm-form-row full">
            <span className="adm-form-row-label">⭐ Featured (shown in Hero Banner)</span>
            <label className="adm-toggle">
              <input type="checkbox" checked={form.featured} onChange={set('featured')} />
              <span className="adm-toggle-track" />
            </label>
          </div>
          <div className="adm-form-row full">
            <span className="adm-form-row-label">🔥 Popular (shown in Popular row)</span>
            <label className="adm-toggle">
              <input type="checkbox" checked={form.popular} onChange={set('popular')} />
              <span className="adm-toggle-track" />
            </label>
          </div>

          <div className="full" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,.05)' }}>
            <h4 style={{ fontSize: '.85rem', color: '#888', marginBottom: '.75rem', textTransform: 'uppercase' }}>SEO & Meta Tags</h4>
            <div className="adm-form-group" style={{ marginBottom: '.75rem' }}>
              <label className="adm-form-label">SEO Title</label>
              <input className="adm-input" value={form.seoTitle} onChange={set('seoTitle')} placeholder="Optimized title for Google" />
            </div>
            <div className="adm-form-group" style={{ marginBottom: '.75rem' }}>
              <label className="adm-form-label">SEO Description</label>
              <textarea className="adm-textarea" style={{ minHeight: '60px' }} value={form.seoDesc} onChange={set('seoDesc')} placeholder="Meta description for search engines" />
            </div>
            <div className="adm-form-group">
              <label className="adm-form-label">Keywords</label>
              <input className="adm-input" value={form.seoKeywords} onChange={set('seoKeywords')} placeholder="movies, rwanda movies..." />
            </div>
          </div>
        </div>

        {toast && <div className={`adm-toast${toast.type === 'error' ? ' error' : ''}`}>{toast.msg}</div>}

        <div className="adm-form-actions">
          <button className="adm-btn adm-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="adm-btn adm-btn-primary" onClick={() => { 
            if (!form.title) return; 
            const finalForm = { ...form };
            if (finalForm.type === 'series' && finalForm.episodes) {
              finalForm.episodes = [...finalForm.episodes].sort((a, b) => a.s !== b.s ? a.s - b.s : a.e - b.e);
            }
            onSave(finalForm); 
          }}>
            <Check size={16}/> Save Movie
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Curate TMDB title (featured / popular) ─────── */
const CurateModal = ({ movie, onSave, onClose }) => {
  const [form, setForm] = useState({
    featured: !!movie.featured,
    popular: !!movie.popular,
    badge: movie.badge || 'HD',
  });
  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((p) => ({ ...p, [field]: val }));
  };

  return (
    <div className="adm-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal" style={{ maxWidth: 440 }}>
        <div className="adm-modal-header">
          <h2 className="adm-modal-title">Pin: {movie.title}</h2>
          <button className="adm-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <p style={{ color: '#888', fontSize: '.85rem', marginBottom: '1rem' }}>
          TMDB ID {movie.id} — metadata comes from TMDB. You can only curate how it appears on RebaFilme.
        </p>
        <div className="adm-form-group">
          <label className="adm-form-label">Badge</label>
          <input className="adm-input" value={form.badge} onChange={set('badge')} placeholder="HD, New, Top…" />
        </div>
        <div className="adm-form-row full">
          <span className="adm-form-row-label">Featured (Hero Banner)</span>
          <label className="adm-toggle">
            <input type="checkbox" checked={form.featured} onChange={set('featured')} />
            <span className="adm-toggle-track" />
          </label>
        </div>
        <div className="adm-form-row full">
          <span className="adm-form-row-label">Popular row</span>
          <label className="adm-toggle">
            <input type="checkbox" checked={form.popular} onChange={set('popular')} />
            <span className="adm-toggle-track" />
          </label>
        </div>
        <div className="adm-form-actions">
          <button className="adm-btn adm-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="adm-btn adm-btn-primary" onClick={() => onSave(form)}><Check size={16} /> Save Pin</button>
        </div>
      </div>
    </div>
  );
};

const DeleteConfirm = ({ movie, onConfirm, onCancel }) => (
  <div className="adm-modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
    <div className="adm-modal" style={{ maxWidth: 400 }}>
      <div className="adm-modal-header">
        <h2 className="adm-modal-title">Delete Movie</h2>
        <button className="adm-modal-close" onClick={onCancel}><X size={16}/></button>
      </div>
      <p style={{ color: '#aaa', fontSize: '.9rem', marginBottom: '1.5rem' }}>
        Are you sure you want to delete <strong style={{ color: '#fff' }}>"{movie.title}"</strong>? This cannot be undone.
      </p>
      <div className="adm-form-actions">
        <button className="adm-btn adm-btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="adm-btn adm-btn-danger" onClick={onConfirm}><Trash2 size={15}/> Delete</button>
      </div>
    </div>
  </div>
);

/* ─── Main Page ────────────────────────────────────── */
const AdminMovies = () => {
  const { allMovies, addMovie, updateMovie, deleteMovie, updateCurated, loading } = useMovies();
  const { toast, show } = useToast();

  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editMovie, setEditMovie] = useState(null);
  const [curateMovie, setCurateMovie] = useState(null);
  const [delMovie, setDelMovie] = useState(null);

  const filtered = useMemo(() =>
    allMovies.filter((m) =>
      !query || m.title.toLowerCase().includes(query.toLowerCase())
    ), [allMovies, query]);

  const handleAdd = (form) => {
    addMovie(form);
    setAddOpen(false);
    show('Custom movie added!');
  };

  const handleEdit = (form) => {
    updateMovie(editMovie.id, form);
    setEditMovie(null);
    show('Movie updated!');
  };

  const handleCurate = async (form) => {
    await updateCurated(curateMovie.id, form);
    setCurateMovie(null);
    show('Catalog pin saved!');
  };

  const handleDelete = () => {
    deleteMovie(delMovie.id);
    setDelMovie(null);
    show('Movie deleted.', 'error');
  };

  return (
    <AdminLayout>
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Catalog</h1>
          <p className="adm-page-subtitle">
            {loading ? 'Loading TMDB…' : `${allMovies.length} titles · auto-synced from TMDB`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="adm-search-bar">
            <Search size={15} color="#444" />
            <input type="text" placeholder="Search catalog…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <button className="adm-btn adm-btn-primary" onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Add Custom
          </button>
        </div>
      </div>

      <div className="adm-info-banner">
        <strong>TMDB is the main catalog.</strong> Watch uses YouTube trailers. Download redirects to videodownloader.site.
        Pin titles as <em>Featured</em> or <em>Popular</em> — custom uploads are optional extras only.
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Poster</th>
              <th>Title</th>
              <th>Type</th>
              <th>Year</th>
              <th>Badge</th>
              <th>Featured</th>
              <th>Source</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="adm-empty">
                    <Film size={36}/>
                    <p>No movies found</p>
                  </div>
                </td>
              </tr>
            ) : filtered.map(m => (
              <tr key={m.id}>
                <td>
                  {m.poster
                    ? <img src={m.poster} alt={m.title} className="adm-thumb" />
                    : <div className="adm-thumb-placeholder"><Film size={14}/></div>
                  }
                </td>
                <td style={{ fontWeight: 600, color: '#fff', maxWidth: 200 }}>{m.title}</td>
                <td><span className="adm-badge adm-badge-default">{m.type}</span></td>
                <td>{m.year || '—'}</td>
                <td>{m.badge || '—'}</td>
                <td>{m.featured ? '⭐' : m.popular ? '🔥' : '—'}</td>
                <td>
                  <span className={`adm-badge ${m.source === 'tmdb' ? 'adm-badge-default' : 'adm-badge-admin'}`}>
                    {m.source === 'tmdb' ? 'TMDB' : 'Custom'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '.4rem' }}>
                    {m.source === 'tmdb' ? (
                      <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setCurateMovie(m)} title="Pin / Feature">
                        <Pencil size={13} /> Pin
                      </button>
                    ) : (
                      <>
                        <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditMovie(m)} title="Edit">
                          <Pencil size={13} />
                        </button>
                        <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => setDelMovie(m)} title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {addOpen && (
        <MovieModal
          title="Add New Movie"
          initial={EMPTY_MOVIE}
          onSave={handleAdd}
          onClose={() => setAddOpen(false)}
        />
      )}
      {editMovie && (
        <MovieModal
          title={`Edit: ${editMovie.title}`}
          initial={editMovie}
          onSave={handleEdit}
          onClose={() => setEditMovie(null)}
        />
      )}
      {curateMovie && (
        <CurateModal
          movie={curateMovie}
          onSave={handleCurate}
          onClose={() => setCurateMovie(null)}
        />
      )}
      {delMovie && delMovie.source !== 'tmdb' && (
        <DeleteConfirm
          movie={delMovie}
          onConfirm={handleDelete}
          onCancel={() => setDelMovie(null)}
        />
      )}

      {toast && <div className={`adm-toast${toast.type === 'error' ? ' error' : ''}`}>{toast.msg}</div>}
    </AdminLayout>
  );
};

export default AdminMovies;
