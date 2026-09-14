import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import logo from '../assets/logo.jpg';
import './PwaInstallBanner.css';

const SNOOZE_KEY = 'rebafilme_pwa_dismissed';
const SNOOZE_DAYS = 7;

export const PwaInstallBanner = ({ onOpenFullModal }) => {
  const { isInstallable, isInstalled, installPWA } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // 1. Guard against standalone / already installed mode
    const isStandalone = 
      isInstalled || 
      (typeof window !== 'undefined' && (
        window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true
      ));

    if (isStandalone) return;

    // 2. Guard against admin routes
    if (location.pathname.startsWith('/admin')) return;

    // 3. Guard against Smart TV
    if (typeof window !== 'undefined') {
      const isTv = 
        window.location.search.includes('tv=1') || 
        /smart-tv|googletv|appletv|hbbtv|pov_tv|netcast/i.test(navigator.userAgent);
      if (isTv) return;
    }

    // 4. Check 7-day dismissal snooze
    try {
      const dismissedUntil = localStorage.getItem(SNOOZE_KEY);
      if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
        setIsDismissed(true);
        return;
      }
    } catch {
      // Storage unavailable or blocked
    }

    // 5. 4-second initial delay before sliding in
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 4000);

    return () => clearTimeout(timer);
  }, [isInstalled, location.pathname]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    try {
      const expireTime = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem(SNOOZE_KEY, String(expireTime));
    } catch {
      // Storage unavailable or blocked
    }
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await installPWA();
      if (success) {
        setIsVisible(false);
      }
    } else {
      // Browser without beforeinstallprompt (e.g. iOS Safari): open existing full guide modal
      if (onOpenFullModal) {
        onOpenFullModal();
      }
      setIsVisible(false);
    }
  };

  if (!isVisible || isDismissed) {
    return null;
  }

  return (
    <div className="pwa-banner-wrapper" role="region" aria-label="Install app banner">
      <div className="pwa-banner-card">
        <div className="pwa-banner-content">
          <img src={logo} alt="RebaFilme" className="pwa-banner-logo" />
          <div className="pwa-banner-text">
            <h4 className="pwa-banner-title">Install RebaFilmes App</h4>
            <p className="pwa-banner-desc">
              Add our app to your home screen for a faster, full-screen experience.
            </p>
          </div>
          <button 
            type="button" 
            className="pwa-banner-close" 
            onClick={handleDismiss} 
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <button 
          type="button" 
          className="pwa-banner-btn" 
          onClick={handleInstallClick}
        >
          Install app
        </button>
      </div>
    </div>
  );
};

export default PwaInstallBanner;
