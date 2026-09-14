import { useState, useEffect } from 'react';
import { isVipEnabled, isMonetizationEnabled } from '../utils/settings';

export function useMonetizationEnabled() {
  const [enabled, setEnabled] = useState(() => {
    return isMonetizationEnabled();
  });

  useEffect(() => {
    const update = () => {
      setEnabled(isMonetizationEnabled());
    };

    window.addEventListener('storage', update);
    window.addEventListener('rebafilme_settings_updated', update);

    let bc = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('rebafilme_settings_channel');
        bc.onmessage = () => update();
      }
    } catch {}

    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener('rebafilme_settings_updated', update);
      if (bc) bc.close();
    };
  }, []);

  return enabled;
}

export function useVIPEnabled() {
  const [enabled, setEnabled] = useState(() => {
    return isVipEnabled();
  });

  useEffect(() => {
    const update = () => {
      setEnabled(isVipEnabled());
    };

    window.addEventListener('storage', update);
    window.addEventListener('rebafilme_settings_updated', update);

    let bc = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('rebafilme_settings_channel');
        bc.onmessage = () => update();
      }
    } catch {}

    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener('rebafilme_settings_updated', update);
      if (bc) bc.close();
    };
  }, []);

  return enabled;
}

export default useMonetizationEnabled;
