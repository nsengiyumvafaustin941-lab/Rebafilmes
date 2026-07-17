import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import './AdminLayout.css';
import './AdminLogin.css';

const AdminLogin = () => {
  const { login, isAdmin, loginError, setLoginError } = useAdmin();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (isAdmin) navigate('/admin/dashboard', { replace: true });
  }, [isAdmin, navigate]);

  const handleChange = (e) => {
    setLoginError('');
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    login(form.username, form.password);
  };

  return (
    <div className="adm-login-page">
      <div className="adm-login-card">
        <div className="adm-login-icon">
          <Shield size={32} />
        </div>
        <h1 className="adm-login-title">Admin Panel</h1>
        <p className="adm-login-sub">RebaFilme — Restricted Access</p>

        <form onSubmit={handleSubmit} className="adm-login-form">
          <div className="adm-form-group">
            <label className="adm-form-label">Username</label>
            <input
              name="username"
              type="text"
              autoComplete="username"
              className={`adm-input${loginError ? ' adm-input-error' : ''}`}
              placeholder="admin"
              value={form.username}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>
          <div className="adm-form-group" style={{ position: 'relative' }}>
            <label className="adm-form-label">Password</label>
            <input
              name="password"
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              className={`adm-input${loginError ? ' adm-input-error' : ''}`}
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="adm-pw-toggle"
              onClick={() => setShowPw(p => !p)}
              tabIndex={-1}
            >
              {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
          </div>

          {loginError && <p className="adm-login-error">{loginError}</p>}

          <button type="submit" className="adm-btn adm-btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '.5rem' }}>
            Sign In
          </button>
        </form>

        <p className="adm-login-hint">This panel is for authorized administrators only.</p>
      </div>
    </div>
  );
};

export default AdminLogin;
