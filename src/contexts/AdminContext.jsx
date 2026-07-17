import React, { createContext, useContext, useState, useCallback } from 'react';

const AdminContext = createContext();

const ADMIN_SESSION_KEY = 'rebafilme_admin_session';
const ADMIN_CREDENTIALS  = { username: 'admin', password: 'rebafilme2026' };

export const AdminProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(() => {
    try { return Boolean(localStorage.getItem(ADMIN_SESSION_KEY)); } catch { return false; }
  });
  const [loginError, setLoginError] = useState('');

  const login = useCallback((username, password) => {
    if (
      username.trim() === ADMIN_CREDENTIALS.username &&
      password        === ADMIN_CREDENTIALS.password
    ) {
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ username, token: password, at: Date.now() }));
      setIsAdmin(true);
      setLoginError('');
      return true;
    }
    setLoginError('Invalid username or password');
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setIsAdmin(false);
  }, []);

  return (
    <AdminContext.Provider value={{ isAdmin, login, logout, loginError, setLoginError }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => useContext(AdminContext);
