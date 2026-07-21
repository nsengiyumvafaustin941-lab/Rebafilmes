import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, AlertCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useMovies } from '../contexts/MoviesContext';
import logo from '../assets/logo.jpg';
import './LoginPage.css';

const LoginPage = () => {
  const { t } = useLanguage();
  const { login, register } = useAuth();
  const [showPw, setShowPw] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', code: '', newPassword: '', confirmPassword: '' });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (isRegister && !termsAccepted) {
      setError('You must accept the terms and conditions.');
      return;
    }

    setIsLoading(true);

    try {
      if (isForgot) {
        const identifier = formData.email || formData.phone;
        if (!identifier) {
          throw new Error('Please enter your email or phone number.');
        }
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to send recovery code.');
        
        setError(data.message);
        setIsForgot(false);
        setIsReset(true);
      } else if (isReset) {
        const identifier = formData.email || formData.phone;
        if (!formData.code || !formData.newPassword || !formData.confirmPassword) {
          throw new Error('Please fill in all fields.');
        }
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier,
            code: formData.code,
            newPassword: formData.newPassword
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to reset password.');
        
        setIsReset(false);
        setIsRegister(false);
        setError('Password reset successfully! Please log in.');
      } else if (isRegister) {
        if (!formData.password || formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        if (!formData.email && !formData.phone) {
          throw new Error('Please fill in either Email or Phone Number.');
        }
        if (formData.email && formData.phone) {
          throw new Error('Please fill in either Email or Phone Number, not both.');
        }
        await register({
          name: formData.name || (formData.email ? formData.email.split('@')[0] : formData.phone),
          email: formData.email,
          phone: formData.phone,
          password: formData.password
        });
      } else {
        const identifier = formData.email || formData.phone;
        if (!identifier || !formData.password) {
          throw new Error('Please enter your email or phone number, and password.');
        }
        await login(identifier, formData.password);
      }
      if (!isForgot && !isReset) {
        navigate('/account');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  // Build poster collage from mock data
  const { allMovies } = useMovies();
  const posters = [...allMovies, ...allMovies].slice(0, 12);

  return (
    <div className="login-page">
      <div className="bg-logo-pattern" />
      {/* Left — movie collage */}
      <div className="login-collage">
        <div className="collage-overlay" />
        <div className="collage-grid">
          {posters.map((m, i) => (
            <div key={i} className="collage-poster">
              <img src={m.poster} alt={m.title} />
            </div>
          ))}
        </div>
        <div className="collage-brand">
          <img src={logo} alt="RebaFilme" className="collage-logo-img" />
          <h2>RebaFilme</h2>
        
        </div>
      </div>

      {/* Right — login form */}
      <div className="login-form-side">
        {/* Close */}
        <Link to="/" className="login-close">✕</Link>

        <div className="login-form-wrap">
          <div className="login-logo">
            <img src={logo} alt="RebaFilme" className="login-logo-img" />
          </div>

          <h1 className="login-title">
            {isForgot ? 'Forgot Password' : isReset ? 'Reset Password' : isRegister ? t('register_title') : t('login_title')}
          </h1>
          <p className="login-sub">
            {isForgot ? 'Enter your details to get a recovery code.' : isReset ? 'Enter code and choose a new password.' : isRegister ? t('register_sub') : t('login_sub')}
          </p>

          {error && (
            <div className="login-error" style={{ 
              background: error.includes('sent') || error.includes('success') ? 'rgba(76,175,80,0.1)' : 'rgba(239,68,68,0.1)', 
              border: error.includes('sent') || error.includes('success') ? '1px solid rgba(76,175,80,0.3)' : '1px solid rgba(239,68,68,0.3)', 
              padding: '0.75rem', borderRadius: '8px', 
              color: error.includes('sent') || error.includes('success') ? '#4caf50' : '#ef4444', 
              fontSize: '0.85rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' 
            }}>
              <AlertCircle size={16} />
              <span style={{ flex: 1 }}>{error}</span>
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit} autoComplete="off">
            {/* Hidden inputs to trick aggressive browser autofill */}
            <input type="text" name="fakeusernameremembered" style={{display: 'none'}} aria-hidden="true" autoComplete="username" />
            <input type="password" name="fakepasswordremembered" style={{display: 'none'}} aria-hidden="true" autoComplete="current-password" />
            
            {!isReset ? (
              <>
                {isRegister && (
                  <div className="form-field">
                    <User size={16} className="field-icon" />
                    <input name="name" type="text" value={formData.name} placeholder={t('name_placeholder') || 'Full Name'} className="login-input" onChange={handleChange} required={isRegister} autoComplete="off" />
                  </div>
                )}

                <div className="form-field">
                  <Mail size={16} className="field-icon" />
                  <input name="email" type="text" value={formData.email} placeholder={t('email_placeholder')} className="login-input" onChange={handleChange} autoComplete="off" />
                </div>

                <div className="login-or"><span>cyangwa</span></div>

                <div className="form-field phone-field">
                  <div className="phone-prefix">
                    <span className="flag">🇷🇼</span>
                    <span>+250</span>
                    <span className="prefix-divider">›</span>
                  </div>
                  <input name="phone" type="tel" value={formData.phone} placeholder={t('phone_placeholder') || 'Phone Number'} className="login-input phone-input" onChange={handleChange} autoComplete="off" />
                </div>

                {!isForgot && (
                  <div className="form-field">
                    <Lock size={16} className="field-icon" />
                      <input
                        name="password"
                        value={formData.password}
                        type={showPw ? 'text' : 'password'}
                        placeholder={t('password_placeholder') || 'Password (min. 6 characters)'}
                        className="login-input"
                        onChange={handleChange}
                        required
                        minLength={6}
                        autoComplete="new-password"
                      />
                    <button
                      type="button"
                      className="toggle-pw"
                      onClick={() => setShowPw(s => !s)}
                    >
                      {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="form-field">
                  <Lock size={16} className="field-icon" />
                  <input name="code" type="text" placeholder="Recovery Code (123456)" className="login-input" onChange={handleChange} required />
                </div>
                <div className="form-field">
                  <Lock size={16} className="field-icon" />
                  <input name="newPassword" type="password" placeholder="New Password" className="login-input" onChange={handleChange} required minLength={6} />
                </div>
                <div className="form-field">
                  <Lock size={16} className="field-icon" />
                  <input name="confirmPassword" type="password" placeholder="Confirm New Password" className="login-input" onChange={handleChange} required minLength={6} />
                </div>
              </>
            )}

            {isRegister && !isForgot && !isReset && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#fff' }}>
                <input 
                  type="checkbox" 
                  id="terms" 
                  checked={termsAccepted} 
                  onChange={(e) => setTermsAccepted(e.target.checked)} 
                />
                <label htmlFor="terms" style={{ fontSize: '0.85rem' }}>
                  {t('terms_accept_pre')}
                  <Link to="/terms" style={{color: '#e50914'}}>{t('terms_accept_link')}</Link>
                </label>
              </div>
            )}

            <div className="login-actions">
              {(isForgot || isReset) ? (
                <button type="button" className="btn btn-ghost forgot-btn" onClick={() => { setIsForgot(false); setIsReset(false); setError(''); }}>
                  Back to Login
                </button>
              ) : (
                <button type="button" className="btn btn-ghost forgot-btn" onClick={() => { setIsForgot(true); setError(''); }}>
                  {t('forgot_password')}
                </button>
              )}
              <button type="submit" className="btn btn-primary login-submit" disabled={isLoading} style={{ opacity: isLoading ? 0.7 : 1 }}>
                {isLoading ? 'Wait...' : isForgot ? 'Send Code' : isReset ? 'Reset Password' : isRegister ? t('register_title') : t('login_title')}
              </button>
            </div>
          </form>

          <div className="login-switch">
            {!isForgot && !isReset && (
              isRegister ? (
                <p>{t('have_account')} <button onClick={() => { setIsRegister(false); setError(''); }}>{t('login_title')}</button></p>
              ) : (
                <p>{t('no_account')} <button onClick={() => { setIsRegister(true); setError(''); }}>{t('register_title')}</button></p>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
