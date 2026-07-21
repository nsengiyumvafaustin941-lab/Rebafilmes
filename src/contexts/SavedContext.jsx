// src/contexts/SavedContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import { SAVED_KEY } from '../utils/constants';

const SavedContext = createContext();

export const useSaved = () => useContext(SavedContext);

export const SavedProvider = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const [savedIds, setSavedIds] = useState([]);

  // Load from local storage initially (for guests or quick load)
  useEffect(() => {
    try {
      const localData = localStorage.getItem(SAVED_KEY);
      if (localData) {
        setSavedIds(JSON.parse(localData));
      }
    } catch (e) {
      console.error('Failed to load saved items', e);
    }
  }, []);

  // If logged in, fetch from Cloudflare API and merge
  useEffect(() => {
    if (!isLoggedIn) return;
    
    fetch('/api/saved', { credentials: 'include' })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setSavedIds(prev => {
          // Merge local and remote
          const merged = Array.from(new Set([...prev, ...data.map(String), ...data.map(Number)]));
          localStorage.setItem(SAVED_KEY, JSON.stringify(merged));
          return merged;
        });
      })
      .catch(console.error);
  }, [isLoggedIn]);

  const toggleSaved = async (id) => {
    // Optimistic UI update for both guests and logged-in users
    setSavedIds(prev => {
      const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      return next;
    });

    // Sync with Cloudflare backend if logged in
    if (isLoggedIn) {
      try {
        await fetch('/api/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ movieId: id })
        });
      } catch (error) {
        console.error('Failed to sync saved state to server', error);
      }
    }
  };

  const isSaved = (id) => savedIds.includes(String(id)) || savedIds.includes(Number(id));

  return (
    <SavedContext.Provider value={{ savedIds, toggleSaved, isSaved }}>
      {children}
    </SavedContext.Provider>
  );
};
