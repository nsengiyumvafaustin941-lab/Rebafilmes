import { useState, useEffect, useCallback } from 'react';

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(() => window.deferredPwaPrompt || null);
  const [isInstallable, setIsInstallable] = useState(!!window.deferredPwaPrompt);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check standalone mode (PWA installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e) => {
      // Do NOT call e.preventDefault() so native browser address bar pill [ 🖥️ Install ] shows up naturally (WhatsApp Web style)
      window.deferredPwaPrompt = e;
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      window.deferredPwaPrompt = null;
      setIsInstallable(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Polling fallback for race conditions if React mounts after window event
    const pollInterval = setInterval(() => {
      if (window.deferredPwaPrompt && !deferredPrompt) {
        setDeferredPrompt(window.deferredPwaPrompt);
        setIsInstallable(true);
      }
    }, 500);

    const timeout = setTimeout(() => clearInterval(pollInterval), 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [deferredPrompt]);

  const installPWA = useCallback(async () => {
    const promptEvent = deferredPrompt || window.deferredPwaPrompt;
    if (!promptEvent) {
      return false;
    }
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      window.deferredPwaPrompt = null;
      return true;
    }
    return false;
  }, [deferredPrompt]);

  return {
    isInstallable,
    isInstalled,
    installPWA,
    deferredPrompt
  };
};

export default usePWAInstall;
