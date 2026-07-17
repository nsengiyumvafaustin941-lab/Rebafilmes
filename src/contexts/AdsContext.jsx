import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../utils/api';

const AdsContext = createContext();
const ADS_KEY = 'rebafilme_ads';

function isActive(ad) {
  if (!ad.active) return false;
  const now = new Date();
  if (ad.startsAt) {
    const start = new Date(ad.startsAt);
    start.setHours(0, 0, 0, 0);
    if (start > now) return false;
  }
  if (ad.expiresAt) {
    const expiry = new Date(ad.expiresAt);
    expiry.setHours(23, 59, 59, 999);
    if (expiry < now) return false;
  }
  return true;
}

export const AdsProvider = ({ children }) => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAds = async () => {
      const fetchedAds = await api.get(ADS_KEY, []);
      setAds(fetchedAds);
      setLoading(false);
    };
    fetchAds();
  }, []);

  const mutate = useCallback((fn) => {
    setAds((prev) => {
      const next = fn(prev);
      api.set(ADS_KEY, next, true);
      return next;
    });
  }, []);

  const addAd = useCallback((ad) => {
    mutate((prev) => [...prev, {
      ...ad,
      id: `ad_${Date.now()}`,
      createdAt: new Date().toISOString(),
      active: true,
      impressions: 0,
      clicks: 0,
      priority: Number(ad.priority) || 0,
    }]);
  }, [mutate]);

  const updateAd = useCallback((id, data) => {
    mutate((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
  }, [mutate]);

  const deleteAd = useCallback((id) => {
    mutate((prev) => prev.filter((a) => a.id !== id));
  }, [mutate]);

  const toggleAd = useCallback((id) => {
    mutate((prev) => prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a)));
  }, [mutate]);

  const trackClick = useCallback((id) => {
    mutate((prev) => prev.map((a) => (a.id === id ? { ...a, clicks: (a.clicks || 0) + 1 } : a)));
  }, [mutate]);

  const trackImpression = useCallback((id) => {
    if (Math.random() > 0.3) return;
    mutate((prev) => prev.map((a) => (a.id === id ? { ...a, impressions: (a.impressions || 0) + 1 } : a)));
  }, [mutate]);

  const getAdsByPosition = useCallback((position) => {
    return ads
      .filter((a) => a.position === position && isActive(a))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }, [ads]);

  return (
    <AdsContext.Provider value={{
      ads, addAd, updateAd, deleteAd, toggleAd, trackClick, trackImpression, getAdsByPosition, loading,
    }}>
      {children}
    </AdsContext.Provider>
  );
};

export const useAds = () => useContext(AdsContext);
