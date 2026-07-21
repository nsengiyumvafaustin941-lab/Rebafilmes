import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Film, Megaphone, Plus, Send, Star, Download } from 'lucide-react';
import { useMovies } from '../../contexts/MoviesContext';
import { useAds } from '../../contexts/AdsContext';
import { useAnnouncements } from '../../contexts/AnnouncementsContext';
import AdminLayout from './AdminLayout';
import './AdminLayout.css';

const StatCard = ({ icon: Icon, value, label, color = '#e50914' }) => (
  <div className="adm-stat-card">
    <div className="adm-stat-icon" style={{ background: `${color}18`, color }}>
      <Icon size={20} />
    </div>
    <div className="adm-stat-value">{value}</div>
    <div className="adm-stat-label">{label}</div>
  </div>
);

const AdminDashboard = () => {
  const { allMovies, loading, error } = useMovies();
  const { ads } = useAds();
  const { broadcast, activeAnnouncement } = useAnnouncements();

  const [annMessage, setAnnMessage] = useState(activeAnnouncement?.message || '');
  const [annType, setAnnType] = useState(activeAnnouncement?.type || 'info');
  const [annLink, setAnnLink] = useState(activeAnnouncement?.linkUrl || '');

  const handleBroadcast = () => {
    broadcast(annMessage, annType, annLink);
    alert(annMessage ? 'Announcement broadcasted!' : 'Announcement cleared.');
  };

  const stats = useMemo(() => ({
    catalogSize: allMovies.length,
    featured: allMovies.filter((m) => m.featured).length,
    activeSponsors: ads.filter((a) => a.active).length,
    totalSponsors: ads.length,
  }), [allMovies, ads]);

  const featuredMovies = useMemo(
    () => allMovies.filter((m) => m.featured).slice(0, 5),
    [allMovies]
  );

  const liveSponsors = useMemo(
    () => ads.filter((a) => a.active).slice(0, 5),
    [ads]
  );

  return (
    <AdminLayout>
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Dashboard</h1>
          <p className="adm-page-subtitle">
            TMDB catalog · trailers · videodownloader redirects
            {loading && ' — loading catalog…'}
            {error && ` — fallback mode (${error})`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.75rem' }}>
          <Link to="/admin/movies" className="adm-btn adm-btn-primary">
            <Star size={16} /> Pin Featured
          </Link>
          <Link to="/admin/ads" className="adm-btn adm-btn-ghost">
            <Plus size={16} /> Add Sponsor
          </Link>
        </div>
      </div>

      <div className="adm-stats">
        <StatCard icon={Film} value={stats.catalogSize} label="TMDB Catalog" color="#e50914" />
        <StatCard icon={Star} value={stats.featured} label="Featured Pins" color="#f59e0b" />
        <StatCard icon={Megaphone} value={stats.activeSponsors} label="Live Sponsors" color="#22c55e" />
        <StatCard icon={Download} value="→" label="Download via videodownloader" color="#3b82f6" />
      </div>

      <div className="adm-info-banner">
        <strong>How the site works now</strong>
        <ul>
          <li>Movies load automatically from TMDB trending</li>
          <li>Watch plays YouTube trailers</li>
          <li>Download sends users to videodownloader.site with the movie title</li>
          <li>Use <em>Sponsors</em> to add paid banner campaigns when brands sign up</li>
        </ul>
      </div>

      <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#13131a', borderRadius: '12px', border: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <Megaphone size={18} color="#3b82f6" />
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Global Announcement</h2>
        </div>
        <div className="adm-form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div className="adm-form-group" style={{ gridColumn: '1 / 3' }}>
            <input className="adm-input" placeholder="Message for all users…" value={annMessage} onChange={(e) => setAnnMessage(e.target.value)} />
          </div>
          <div className="adm-form-group">
            <select className="adm-select" value={annType} onChange={(e) => setAnnType(e.target.value)}>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="danger">Danger</option>
            </select>
          </div>
          <div className="adm-form-group" style={{ gridColumn: '1 / 3' }}>
            <input className="adm-input" placeholder="Link URL (optional)" value={annLink} onChange={(e) => setAnnLink(e.target.value)} />
          </div>
          <div className="adm-form-group">
            <button className="adm-btn adm-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleBroadcast}>
              <Send size={15} /> {annMessage ? 'Broadcast' : 'Clear'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <div className="adm-page-header" style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Featured in Hero</h2>
          <Link to="/admin/movies" className="adm-btn adm-btn-ghost adm-btn-sm">Manage Catalog</Link>
        </div>
        {featuredMovies.length === 0 ? (
          <div className="adm-empty">
            <Star size={36} />
            <p>No featured pins yet. Open Catalog and mark titles as Featured.</p>
          </div>
        ) : (
          <div className="adm-recent-list">
            {featuredMovies.map((m) => (
              <div key={m.id} className="adm-recent-item">
                {m.poster ? <img src={m.poster} alt={m.title} className="adm-thumb" /> : <div className="adm-thumb-placeholder"><Film size={16} /></div>}
                <div className="adm-recent-title">{m.title}</div>
                <span className="adm-badge adm-badge-active">Featured</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <div className="adm-page-header" style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Live Sponsors ({stats.activeSponsors}/{stats.totalSponsors})</h2>
          <Link to="/admin/ads" className="adm-btn adm-btn-ghost adm-btn-sm">Manage Sponsors</Link>
        </div>
        {liveSponsors.length === 0 ? (
          <div className="adm-empty">
            <Megaphone size={36} />
            <p>No live sponsor ads. <Link to="/admin/ads" style={{ color: '#e50914' }}>Create your first campaign →</Link></p>
          </div>
        ) : (
          <div className="adm-recent-list">
            {liveSponsors.map((ad) => (
              <div key={ad.id} className="adm-recent-item">
                <span className="adm-badge adm-badge-active">LIVE</span>
                <div className="adm-recent-title">{ad.sponsorName || ad.title}</div>
                <span className="adm-recent-meta">{ad.position}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
