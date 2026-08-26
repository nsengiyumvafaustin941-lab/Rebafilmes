// src/hooks/useAdsQuery.js
// Custom React Hook for fetching and managing ad inventory and atomic metrics

import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { ADS_KEY } from '../utils/constants';

export function useAdsQuery() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAds = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get(ADS_KEY, []);
      setAds(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('[useAdsQuery] Error fetching ads:', err);
      setError(err.message || 'Failed to load ads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  const addAd = useCallback(async (newAd) => {
    const created = {
      ...newAd,
      id: `ad_${Date.now()}`,
      createdAt: new Date().toISOString(),
      active: true,
      priority: Number(newAd.priority) || 0,
    };
    const next = [...ads, created];
    setAds(next);
    await api.set(ADS_KEY, next, true);
    return created;
  }, [ads]);

  const updateAd = useCallback(async (id, updateData) => {
    const next = ads.map((a) => (a.id === id ? { ...a, ...updateData } : a));
    setAds(next);
    await api.set(ADS_KEY, next, true);
  }, [ads]);

  const deleteAd = useCallback(async (id) => {
    const next = ads.filter((a) => a.id !== id);
    setAds(next);
    await api.set(ADS_KEY, next, true);
  }, [ads]);

  const toggleAd = useCallback(async (id) => {
    const next = ads.map((a) => (a.id === id ? { ...a, active: !a.active } : a));
    setAds(next);
    await api.set(ADS_KEY, next, true);
  }, [ads]);

  const fetchAdMetrics = useCallback(async (adId) => {
    try {
      const res = await fetch(`/api/ads/track?id=${encodeURIComponent(adId)}`);
      if (!res.ok) return { impressions: 0, clicks: 0 };
      const data = await res.json();
      return {
        impressions: data.impressions || 0,
        clicks: data.clicks || 0,
      };
    } catch {
      return { impressions: 0, clicks: 0 };
    }
  }, []);

  return {
    ads,
    loading,
    error,
    addAd,
    updateAd,
    deleteAd,
    toggleAd,
    refetch: fetchAds,
    fetchAdMetrics,
  };
}

export default useAdsQuery;
