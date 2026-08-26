import { useState, useEffect } from 'react';
import { getSettings } from '../utils/settings';

export function useMonetizationEnabled() {
  const [enabled, setEnabled] = useState(() => {
    return getSettings().disableMonetization !== true;
  });

  useEffect(() => {
    const update = () => {
      setEnabled(getSettings().disableMonetization !== true);
    };

    // Update on storage / window focus / custom event
    window.addEventListener('storage', update);
    window.addEventListener('rebafilme_settings_updated', update);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener('rebafilme_settings_updated', update);
    };
  }, []);

  return enabled;
}

export default useMonetizationEnabled;
