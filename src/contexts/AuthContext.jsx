// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('auth_error');
        return res.json();
      })
      .then((data) => {
        setUser(data.user);
        setIsOffline(false);
      })
      .catch((err) => {
        if (err.message === 'Failed to fetch') {
          setIsOffline(true);
          // Preserve existing user state if offline
        } else {
          setUser(null);
          setIsOffline(false);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setUser(data.user);
    return data.user;
  }

  async function register({ email, password, name, phone }) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, name, phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  }

  function updateUser(newData) {
    setUser((prev) => ({ ...prev, ...newData }));
  }

  const isLoggedIn = Boolean(user);

  return (
    <AuthContext.Provider value={{ user, loading, isLoggedIn, isOffline, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
