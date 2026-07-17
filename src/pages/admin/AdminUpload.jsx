import React from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, ArrowRight, Image } from 'lucide-react';
import AdminLayout from './AdminLayout';
import './AdminLayout.css';

const AdminUpload = () => (
  <AdminLayout>
    <div className="adm-page-header">
      <div>
        <h1 className="adm-page-title">Media &amp; Assets</h1>
        <p className="adm-page-subtitle">Sponsor banners and optional custom content</p>
      </div>
    </div>

    <div className="adm-info-banner">
      <strong>Video upload is no longer the main workflow</strong>
      <ul>
        <li>Public site uses TMDB for movie data and YouTube for trailers</li>
        <li>Downloads redirect to videodownloader.site</li>
        <li>Upload sponsor banner images to your CDN / R2 and paste URLs in Sponsor Ads</li>
      </ul>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
      <div className="adm-settings-section">
        <Megaphone size={28} color="#f59e0b" style={{ marginBottom: '.75rem' }} />
        <h3 className="adm-settings-heading">Sponsor Campaigns</h3>
        <p style={{ color: '#888', fontSize: '.85rem', marginBottom: '1rem' }}>
          When a brand pays for placement, create a sponsor ad with banner image, click URL, and schedule.
        </p>
        <Link to="/admin/ads" className="adm-btn adm-btn-primary">
          Open Sponsor Ads <ArrowRight size={14} />
        </Link>
      </div>

      <div className="adm-settings-section">
        <Image size={28} color="#3b82f6" style={{ marginBottom: '.75rem' }} />
        <h3 className="adm-settings-heading">Banner Image Tips</h3>
        <p style={{ color: '#888', fontSize: '.85rem', marginBottom: '.5rem' }}>
          Recommended: 1200×300 px JPG/PNG/WebP. Host on Cloudflare R2 or any CDN, then paste the public URL in the ad form.
        </p>
        <p style={{ color: '#666', fontSize: '.78rem' }}>
          Placements: home top/mid, movie detail, search, trailer page top &amp; download area.
        </p>
      </div>
    </div>
  </AdminLayout>
);

export default AdminUpload;
