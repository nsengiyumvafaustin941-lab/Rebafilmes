import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { 
  X, Download, Smartphone, Sparkles, CheckCircle2, 
  Compass, PlaySquare, Heart, User, Wifi, Battery, Share2
} from 'lucide-react';
import { useMovies } from '../contexts/MoviesContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { ALL_CONTENT } from '../data/mockData';
import logo from '../assets/logo.jpg';
import './InstallAppModal.css';

const InstallAppModal = ({ isOpen, onClose }) => {
  const { allMovies } = useMovies();
  const { isInstalled, installPWA } = usePWAInstall();
  const [activeTab, setActiveTab] = useState('home');

  if (!isOpen) return null;

  // Use movies from context if populated; otherwise fallback to ALL_CONTENT mock data
  const sourceMovies = (allMovies && allMovies.length >= 4) ? allMovies : ALL_CONTENT;
  const heroMovie = sourceMovies[0] || ALL_CONTENT[0];
  const gridMovies = sourceMovies.slice(0, 6);

  return (
    <div className="install-modal-backdrop" onClick={onClose}>
      <div className="install-modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Close Button */}
        <button className="install-modal-close" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        <div className="install-modal-grid">
          
          {/* 3D Smartphone Mockup Column */}
          <div className="phone-mockup-wrapper">
            <div className="phone-3d-body">
              {/* Notch / Speaker */}
              <div className="phone-notch">
                <span className="phone-speaker" />
                <span className="phone-camera" />
              </div>

              {/* Phone Screen Container */}
              <div className="phone-screen">
                
                {/* Phone Status Bar */}
                <div className="phone-status-bar">
                  <span className="phone-time">09:41</span>
                  <div className="phone-status-icons">
                    <Wifi size={11} />
                    <Battery size={11} />
                  </div>
                </div>

                {/* Phone App Header */}
                <div className="phone-app-header">
                  <div className="phone-brand">
                    <img src={logo} alt="Logo" className="phone-logo" />
                    <span>RebaFilme</span>
                  </div>
                  <span className="phone-badge">HD</span>
                </div>

                {/* Hero Mini Banner */}
                <div className="phone-hero-mini">
                  <img 
                    src={heroMovie?.backdrop || heroMovie?.poster || ALL_CONTENT[0].backdrop} 
                    alt="Hero" 
                    className="phone-hero-img"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = ALL_CONTENT[0].backdrop;
                    }}
                  />
                  <div className="phone-hero-overlay">
                    <span className="phone-hero-tag">TRENDING #1</span>
                    <span className="phone-hero-title">
                      {heroMovie?.title || heroMovie?.name || 'Fury In the Shadows'}
                    </span>
                  </div>
                </div>

                {/* Live Movie Grid in Mockup */}
                <div className="phone-grid-preview">
                  {gridMovies.map((m, idx) => (
                    <div key={m.id || idx} className="phone-card">
                      <div className="phone-card-poster">
                        <img 
                          src={m.poster || m.backdrop || ALL_CONTENT[idx % ALL_CONTENT.length].poster} 
                          alt={m.title || m.name} 
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = ALL_CONTENT[idx % ALL_CONTENT.length].poster;
                          }}
                        />
                        <span className="phone-card-tag">
                          {m.type === 'tv' || m.media_type === 'tv' ? 'SERIE' : (m.badge || 'HD')}
                        </span>
                      </div>
                      <span className="phone-card-title">{m.title || m.name}</span>
                    </div>
                  ))}
                </div>

                {/* Interactive Navigation Tab Bar Mockup */}
                <div className="phone-nav-bar">
                  <button 
                    className={`phone-tab ${activeTab === 'home' ? 'active' : ''}`}
                    onClick={() => setActiveTab('home')}
                  >
                    <Compass size={14} />
                    <span>Explore</span>
                  </button>
                  <button 
                    className={`phone-tab ${activeTab === 'movies' ? 'active' : ''}`}
                    onClick={() => setActiveTab('movies')}
                  >
                    <PlaySquare size={14} />
                    <span>Movies</span>
                  </button>
                  <button 
                    className={`phone-tab ${activeTab === 'saved' ? 'active' : ''}`}
                    onClick={() => setActiveTab('saved')}
                  >
                    <Heart size={14} />
                    <span>Saved</span>
                  </button>
                  <button 
                    className={`phone-tab ${activeTab === 'user' ? 'active' : ''}`}
                    onClick={() => setActiveTab('user')}
                  >
                    <User size={14} />
                    <span>Account</span>
                  </button>
                </div>

              </div>
              
              {/* Home bar indicator */}
              <div className="phone-home-bar" />
            </div>
          </div>

          {/* Details & Actions Column */}
          <div className="install-info-column">
            
            <div className="install-pill">
              <Sparkles size={14} className="sparkle-icon" />
              <span>Official RebaFilme Mobile App</span>
            </div>

            <h2 className="install-modal-title">
              MovieBox-Style Experience on Your Phone
            </h2>

            <p className="install-modal-desc">
              Get maximum streaming speed, 4K resolution, offline downloads, and zero ad popups on Android and desktop.
            </p>

            <ul className="install-features-list">
              <li>
                <CheckCircle2 size={16} className="feature-icon" />
                <span>Ultra-Fast HD & 4K Streaming Engine</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="feature-icon" />
                <span>One-Tap Offline Video Downloads</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="feature-icon" />
                <span>100% Free & No Registration Needed</span>
              </li>
            </ul>

            <div className="install-actions-wrapper">
              
              {/* 100% Reliable Vector QR Code (Smart hidden on mobile screens <= 820px) */}
              <div className="qr-code-box">
                <div className="qr-svg-wrapper">
                  <QRCode 
                    value="https://www.rebafilme.com/rebafilme.apk" 
                    size={110} 
                    bgColor="#ffffff" 
                    fgColor="#0c0d14" 
                    level="H" 
                  />
                </div>
                <div className="qr-text">
                  <span className="qr-title">Scan QR Code</span>
                  <span className="qr-sub">Instant APK Install</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="action-buttons-group">
                <a 
                  href="/rebafilme.apk" 
                  download="RebaFilme_v2.4.0.apk"
                  className="btn-download-apk"
                >
                  <Download size={18} />
                  <span>Direct APK Download (v2.4)</span>
                </a>

                <button 
                  onClick={installPWA} 
                  className={`btn-install-pwa ${isInstalled ? 'installed' : ''}`}
                >
                  <Smartphone size={18} />
                  <span>{isInstalled ? '✓ App Installed' : 'Add to Home Screen (PWA)'}</span>
                </button>

                <button 
                  className="btn-share-app"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'RebaFilme App',
                        text: 'Watch free HD movies on RebaFilme!',
                        url: window.location.origin
                      }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(window.location.origin);
                      alert('App link copied to clipboard!');
                    }
                  }}
                >
                  <Share2 size={16} />
                  <span>Share App</span>
                </button>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default InstallAppModal;
