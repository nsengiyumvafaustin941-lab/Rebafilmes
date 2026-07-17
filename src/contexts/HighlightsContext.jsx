import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../utils/api';

const HighlightsContext = createContext(null);
const HIGHLIGHTS_KEY = 'rebafilme_highlights';

export const HighlightsProvider = ({ children }) => {
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch from Cloudflare KV on mount (shared across all users)
  useEffect(() => {
    const fetchHighlights = async () => {
      const fetched = await api.get(HIGHLIGHTS_KEY, []);
      setHighlights(fetched);
      setLoading(false);
    };
    fetchHighlights();
  }, []);

  // Helper: update state and persist to KV (admin-protected)
  const mutate = useCallback((fn) => {
    setHighlights(prev => {
      const next = fn(prev);
      api.set(HIGHLIGHTS_KEY, next, true); // true = requires admin token
      return next;
    });
  }, []);

  const addHighlight = useCallback((item) => {
    mutate(prev => [
      {
        ...item,
        id: `hl_${Date.now()}`,
        createdAt: new Date().toISOString(),
        active: true,
      },
      ...prev,
    ]);
  }, [mutate]);

  const deleteHighlight = useCallback((id) => {
    mutate(prev => prev.filter(h => h.id !== id));
  }, [mutate]);

  const toggleHighlight = useCallback((id) => {
    mutate(prev => prev.map(h => h.id === id ? { ...h, active: !h.active } : h));
  }, [mutate]);

  return (
    <HighlightsContext.Provider value={{ highlights, addHighlight, deleteHighlight, toggleHighlight, loading }}>
      {children}
    </HighlightsContext.Provider>
  );
};

export const useHighlights = () => {
  const ctx = useContext(HighlightsContext);
  if (!ctx) throw new Error('useHighlights must be used inside HighlightsProvider');
  return ctx;
};
