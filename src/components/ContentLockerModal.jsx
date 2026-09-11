import React, { useState, useEffect } from 'react';
import { 
  X, Lock, Unlock, Download, ShieldCheck, Zap, 
  ExternalLink, CheckCircle2, Clock, Server, FileVideo, Crown
} from 'lucide-react';
import { useContentLocker } from '../contexts/ContentLockerContext';
import { useVIPModal } from '../contexts/VIPModalContext';
import { getSettings, getContentLockerUrl } from '../utils/settings';
import { fireSmartLink } from '../hooks/useSmartLinks';
import './ContentLockerModal.css';

export const ContentLockerModal = () => {
  const { isOpen, activeItem, closeContentLocker } = useContentLocker();
  const { openVIPModal } = useVIPModal();

  const [stage, setStage] = useState('locked'); // 'locked' | 'verifying' | 'unlocked'
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [progressPercent, setProgressPercent] = useState(0);

  const settings = getSettings();
  const countdownDuration = Math.max(5, Number(settings.contentLockerTimer) || 10);
  const ppdUrl = getContentLockerUrl();

  // Reset state whenever modal opens or activeItem changes
  useEffect(() => {
    if (isOpen) {
      setStage('locked');
      setSecondsLeft(countdownDuration);
      setProgressPercent(0);
    }
  }, [isOpen, activeItem, countdownDuration]);

  // Countdown timer logic during 'verifying' stage
  useEffect(() => {
    if (stage !== 'verifying') return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setStage('unlocked');
          setProgressPercent(100);
          return 0;
        }
        const remaining = prev - 1;
        const elapsed = countdownDuration - remaining;
        setProgressPercent(Math.min(100, Math.round((elapsed / countdownDuration) * 100)));
        return remaining;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [stage, countdownDuration]);

  if (!isOpen || !activeItem) return null;

  const handleStartTask = () => {
    // Open PPD sponsor link in a new tab if configured
    if (ppdUrl) {
      window.open(ppdUrl, '_blank', 'noopener,noreferrer');
      try {
        fireSmartLink('download');
      } catch {}
    }

    // Telemetry tracking for task start
    try {
      fetch('/api/ads/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'content_locker_started',
          title: activeItem?.title,
          ppdUrl: ppdUrl || 'direct_countdown',
        }),
      }).catch(() => {});
    } catch {}

    setStage('verifying');
    setSecondsLeft(countdownDuration);
    setProgressPercent(5);
  };

  const handleDirectDownload = () => {
    if (activeItem.downloadUrl) {
      // Telemetry tracking for download completion
      try {
        fetch('/api/ads/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'content_locker_completed',
            title: activeItem?.title,
          }),
        }).catch(() => {});
      } catch {}

      window.open(activeItem.downloadUrl, '_blank', 'noopener,noreferrer');
      closeContentLocker();
    }
  };

  const handleUpgradeToVIP = () => {
    try {
      fetch('/api/ads/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'content_locker_vip_click',
          title: activeItem?.title,
        }),
      }).catch(() => {});
    } catch {}

    closeContentLocker();
    openVIPModal();
  };

  const isSeries = activeItem.isSeries || activeItem.type === 'series' || activeItem.type === 'tv';
  const displayTitle = activeItem.title || 'Selected Media';
  const episodeTag = isSeries && activeItem.season && activeItem.episode
    ? `Season ${activeItem.season} • Episode ${activeItem.episode}`
    : isSeries ? 'TV Series Episode' : 'Full Movie (1080p)';

  return (
    <div className="locker-modal-overlay" onClick={(e) => e.target === e.currentTarget && closeContentLocker()}>
      <div className="locker-modal-card">
        {/* Top Header */}
        <div className="locker-modal-header">
          <div className="locker-badge">
            <Lock size={13} className="locker-badge-icon" />
            <span>PPD Content Protection</span>
          </div>
          <button 
            className="locker-close-btn" 
            onClick={closeContentLocker}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Media Preview Details Card */}
        <div className="locker-media-card">
          <div className="locker-media-thumb">
            <img 
              src={activeItem.poster || activeItem.backdrop || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80'} 
              alt={displayTitle} 
            />
            <span className="locker-hd-pill">1080p FHD</span>
          </div>

          <div className="locker-media-info">
            <h3 className="locker-media-title">{displayTitle}</h3>
            <div className="locker-media-sub">{episodeTag}</div>
            
            <div className="locker-specs-grid">
              <div className="locker-spec-item">
                <FileVideo size={12} />
                <span>~1.45 GB (MP4)</span>
              </div>
              <div className="locker-spec-item">
                <Server size={12} />
                <span>CDN Node #4 (Fast)</span>
              </div>
              <div className="locker-spec-item">
                <ShieldCheck size={12} />
                <span>Verified Virus-Free</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Action Section */}
        <div className="locker-action-area">
          {stage === 'locked' && (
            <div className="locker-step-box">
              <div className="locker-step-title">
                <span>Free Download Verification</span>
                <span className="step-tag">Step 1 of 1</span>
              </div>
              <p className="locker-step-desc">
                To maintain our free high-speed video servers, please complete 1 quick sponsor verification step to unlock your direct file download.
              </p>

              <button 
                className="btn-locker-unlock"
                onClick={handleStartTask}
              >
                <Unlock size={17} />
                <span>Unlock High-Speed Download</span>
                <ExternalLink size={14} className="ext-icon" />
              </button>
            </div>
          )}

          {stage === 'verifying' && (
            <div className="locker-verifying-box">
              <div className="verifying-spinner-row">
                <Clock size={20} className="verifying-clock-icon" />
                <span className="verifying-text">
                  Verifying sponsor task completion... ({secondsLeft}s)
                </span>
              </div>

              <div className="locker-progress-track">
                <div 
                  className="locker-progress-fill" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <p className="verifying-hint">
                Please keep the sponsor tab open for a few moments. Your download will unlock automatically.
              </p>

              <button 
                className="btn-locker-skip"
                onClick={() => {
                  setStage('unlocked');
                  setProgressPercent(100);
                }}
              >
                Already completed the sponsor step? Click here
              </button>
            </div>
          )}

          {stage === 'unlocked' && (
            <div className="locker-unlocked-box">
              <div className="unlocked-header">
                <CheckCircle2 size={24} color="#00e676" />
                <div>
                  <h4>Verification Successful!</h4>
                  <p>Your high-speed download link has been unlocked.</p>
                </div>
              </div>

              <button 
                className="btn-locker-download-ready"
                onClick={handleDirectDownload}
              >
                <Download size={18} />
                <span>Start Direct Download (1080p HD)</span>
              </button>
            </div>
          )}
        </div>

        {/* VIP Instant Bypass Option (Monetization Upsell) */}
        <div className="locker-vip-banner">
          <div className="locker-vip-info">
            <Crown size={18} color="#ffd700" />
            <div>
              <strong>Skip All Lockers with VIP Pass</strong>
              <small>Unlimited 1-click downloads with zero ads &amp; zero waiting</small>
            </div>
          </div>
          <button 
            className="btn-locker-vip-action"
            onClick={handleUpgradeToVIP}
          >
            <Zap size={14} />
            <span>Get VIP</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default ContentLockerModal;
