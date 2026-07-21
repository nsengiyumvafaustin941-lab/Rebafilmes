import { ADMIN_SESSION_KEY } from './constants';

export const api = {
  get: async (key, fallback) => {
    let apiData = null;
    let apiSuccess = false;
    
    try {
      const res = await fetch(`/api/data?key=${encodeURIComponent(key)}`);
      if (res.ok) {
        apiData = await res.json();
        apiSuccess = true;
      }
    } catch {
      console.warn("API GET failed, falling back to localStorage");
    }
    
    if (apiSuccess && apiData !== null && apiData !== undefined) {
      return apiData;
    }
    
    // Fallback to localStorage if API failed or returned null (empty KV)
    const localData = localStorage.getItem(key);
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        // If the API succeeded but was empty, let's sync this local data UP to the KV!
        if (apiSuccess) {
           console.log(`Migrating local data for ${key} to Cloudflare KV...`);
           // We do a fire-and-forget sync (requires admin token if it's an admin key, 
           // but since we don't know here, we'll try with admin=true which will append the token if it exists)
           api.set(key, parsed, true);
        }
        return parsed;
      } catch {
        return localData;
      }
    }
    
    return fallback;
  },
  
  set: async (key, value, isAdmin = false) => {
    // Save to localStorage immediately as fallback/optimistic update
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    
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
