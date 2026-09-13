import { ADMIN_SESSION_KEY } from './constants';

export const api = {
  get: async (key, fallback) => {
    let apiData = null;
    let apiSuccess = false;
    
    try {
      const res = await fetch(`/api/data?key=${encodeURIComponent(key)}`, {
        credentials: 'include'
      });
      if (res.ok) {
        apiData = await res.json();
        apiSuccess = true;
      }
    } catch {
      console.warn("API GET failed, falling back to localStorage");
    }

    const sanitizeResult = (data) => {
      if (data === null || data === undefined) return fallback;
      // If server returned { found: false, ... }, treat as missing
      if (typeof data === 'object' && !Array.isArray(data) && data.found === false && data.data === null) {
        return fallback;
      }
      if (Array.isArray(fallback) && !Array.isArray(data)) {
        return fallback;
      }
      if (typeof fallback === 'object' && fallback !== null && !Array.isArray(fallback)) {
        if (typeof data !== 'object' || data === null || Array.isArray(data)) {
          return fallback;
        }
      }
      return data;
    };
    
    // Check if local data exists and is newer
    const localData = localStorage.getItem(key);
    let parsedLocal = null;
    if (localData) {
      try {
        parsedLocal = JSON.parse(localData);
      } catch {
        parsedLocal = localData;
      }
    }

    if (apiSuccess && apiData !== null && apiData !== undefined) {
      const sanitized = sanitizeResult(apiData);
      if (sanitized !== fallback || apiData === fallback) {
        // If local data has an updatedAt timestamp strictly newer than server data, prefer local.
        // This handles the window between a successful localStorage write and KV propagation.
        if (
          parsedLocal &&
          typeof parsedLocal === 'object' &&
          parsedLocal.updatedAt &&
          typeof sanitized === 'object' &&
          sanitized !== null &&
          (!sanitized.updatedAt || parsedLocal.updatedAt > sanitized.updatedAt)
        ) {
          return sanitizeResult(parsedLocal);
        }
        return sanitized;
      }
    }
    
    // Fallback to localStorage if API failed or returned null (empty KV)
    if (parsedLocal) {
      return sanitizeResult(parsedLocal);
    }
    
    return fallback;
  },
  
  set: async (key, value, isAdmin = false) => {
    // Save to localStorage immediately as fallback/optimistic update
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    if (typeof window !== 'undefined' && key === 'rebafilme_settings') {
      window.dispatchEvent(new CustomEvent('rebafilme_settings_updated', { detail: value }));
    }
    
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (isAdmin) {
        // Retrieve token from AdminContext/localStorage
        const adminData = JSON.parse(localStorage.getItem(ADMIN_SESSION_KEY) || '{}');
        if (adminData && adminData.token) {
          headers['x-admin-token'] = adminData.token;
        }
      }
      
      const res = await fetch(`/api/data`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ key, value })
      });
      
      if (!res.ok) {
        console.warn("API SET failed", res.statusText);
      }
    } catch (e) {
      console.warn("API SET failed, relying on localStorage", e);
    }
  }
};
