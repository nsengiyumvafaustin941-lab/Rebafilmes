import React, { createContext, useContext, useState, useCallback } from 'react';
import { ADMIN_SESSION_KEY } from '../utils/constants';

const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(() => {
    try { return Boolean(localStorage.getItem(ADMIN_SESSION_KEY)); } catch { return false; }
  });
  const [loginError, setLoginError] = useState('');

  const adminLoginWithGoogle = useCallback(async (credential) => {
    setLoginError('');
    try {
      const res = await fetch('/api/admin/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoginError(data.error || 'Google admin sign-in failed');
        return false;
      }
      localStorage.setItem(
        ADMIN_SESSION_KEY,
        JSON.stringify({ username: data.user || 'admin', token: 'google_session', at: Date.now() })
      );
      setIsAdmin(true);
      return true;
    } catch {
      setLoginError('Network error. Please try again.');
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        window.google.accounts.id.disableAutoSelect();
      }
    } catch (e) {
      console.warn('Google auto-select reset error:', e);
    }
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setIsAdmin(false);
    setLoginError('');
  }, []);

  return (
    <AdminContext.Provider value={{ isAdmin, adminLoginWithGoogle, logout, loginError, setLoginError }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => useContext(AdminContext);

