import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  User, Package, Bell, CreditCard, ChevronRight,
  Home, Crown, Mail, Phone, Lock, CheckCircle, LogOut
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo.jpg';
import './AccountPage.css';

/* ─── Sub-panels ─────────────────────────────────────────── */

const ProfilePanel = () => {
  const { t } = useLanguage();
  const { user, updateUser } = useAuth();
  
  // Split name for UI if possible
  const nameParts = (user?.name || '').split(' ');
  const initialFirstName = nameParts[0] || '';
  const initialLastName = nameParts.slice(1).join(' ') || '';

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Password change states
  const [showPwModal, setShowPwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmNewPw, setConfirmNewPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fullName, phone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      updateUser({ name: fullName, phone });
      setMessage('Profile updated successfully!');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    setPwError('');
    setPwSuccess('');
    if (!currentPw || !newPw || !confirmNewPw) {
      setPwError('Please fill in all fields');
      return;
    }
    if (newPw.length < 6) {
      setPwError('New password must be at least 6 characters');
      return;
    }
    if (newPw !== confirmNewPw) {
      setPwError('New passwords do not match');
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      setPwSuccess('Password changed successfully!');
      setCurrentPw('');
      setNewPw('');
      setConfirmNewPw('');
      setTimeout(() => {
        setShowPwModal(false);
        setPwSuccess('');
      }, 1500);
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="panel">
      {/* Profile card */}
      <div className="profile-card">
        <div className="profile-avatar">
          <img src={logo} alt="RebaFilme Logo" className="profile-avatar-img" />
        </div>
        <div>
          <h3 className="profile-name">{user?.name || 'RebaFilme'}</h3>
          <p className="profile-email"><Mail size={13} /> {user?.email || 'info@rebafilme.com'}</p>
        </div>
      </div>

      {/* Personal info form */}
      <div className="form-section">
        <h4 className="form-title">{t('acc_personal_info')}</h4>
        {message && <p style={{color: message.includes('success') ? '#4caf50' : '#f44336', marginBottom: '1rem'}}>{message}</p>}
        <div className="form-grid">
          <div className="form-group">
            <label><User size={13}/> {t('acc_first_name')}</label>
            <input type="text" placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} className="form-input" />
          </div>
          <div className="form-group">
            <label><User size={13}/> {t('acc_last_name')}</label>
            <input type="text" placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} className="form-input" />
          </div>
          <div className="form-group full">
            <label><Phone size={13}/> {t('acc_phone')}</label>
            <input type="tel" placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} className="form-input" />
          </div>
          <div className="form-group full">
            <label><Mail size={13}/> {t('acc_email')}</label>
            <input type="email" defaultValue={user?.email || ''} disabled className="form-input" style={{ opacity: 0.6 }} />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button className="btn btn-primary" style={{ flex: 1, display: 'flex', justifyContent: 'center' }} onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button className="btn btn-ghost" style={{ flex: 1, display: 'flex', justifyContent: 'center' }} onClick={() => setShowPwModal(true)}>
            <Lock size={15}/> {t('acc_change_pw')}
          </button>
        </div>
      </div>

      {/* Password Change Modal Overlay */}
      {showPwModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div style={{
            background: '#121217', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px',
            padding: '2rem', maxWidth: '400px', width: '100%', display: 'flex',
            flexDirection: 'column', gap: '1rem'
          }}>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '1.25rem', fontWeight: 600 }}>Change Password</h3>
            
            {pwError && <p style={{ color: '#ef4444', margin: 0, fontSize: '0.85rem', background: 'rgba(239,68,68,0.1)', padding: '0.5rem', borderRadius: '4px' }}>{pwError}</p>}
            {pwSuccess && <p style={{ color: '#4caf50', margin: 0, fontSize: '0.85rem', background: 'rgba(76,175,80,0.1)', padding: '0.5rem', borderRadius: '4px' }}>{pwSuccess}</p>}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.75rem', color: '#aaa' }}>Current Password</label>
              <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className="form-input" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.75rem', color: '#aaa' }}>New Password (min. 6 chars)</label>
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="form-input" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.75rem', color: '#aaa' }}>Confirm New Password</label>
              <input type="password" value={confirmNewPw} onChange={e => setConfirmNewPw(e.target.value)} className="form-input" />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setShowPwModal(false); setPwError(''); setPwSuccess(''); }}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handlePasswordChange} disabled={pwLoading}>
                {pwLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SubscriptionPanel = () => {
  const { t } = useLanguage();
  return (
    <div className="panel">
      <p className="panel-subtitle">{t('acc_manage_sub')}</p>
      <div className="sub-card">
        <div className="sub-card-header">
          <div className="sub-card-left">
            <div className="sub-icon"><Crown size={20}/></div>
            <div>
              <h3 className="sub-plan-name">Free Plan</h3>
              <span className="sub-current">{t('acc_current_sub')}</span>
            </div>
          </div>
          <span className="sub-active-badge"><CheckCircle size={14}/> ACTIVE</span>
        </div>
        <div className="sub-stats">
          <div className="sub-stat">
            <span className="stat-label">📅 {t('acc_started')}</span>
            <span className="stat-value">{t('acc_unlimited')}</span>
          </div>
          <div className="sub-stat">
            <span className="stat-label">⏰ {t('acc_ends')}</span>
            <span className="stat-value">{t('acc_unlimited')}</span>
          </div>
        </div>
        <button className="btn-cancel">
          <span>⊗</span> {t('acc_cancel_sub')}
        </button>
      </div>

      {/* History */}
      <div className="history-section">
        <h4 className="form-title"><span>⏱</span> {t('acc_history')}</h4>
        <div className="history-empty">
          <span className="history-icon">⏱</span>
          <p>{t('acc_no_history')}</p>
        </div>
      </div>
    </div>
  );
};

const NotificationsPanel = () => {
  const { t } = useLanguage();
  return (
    <div className="panel">
      <h2 className="panel-heading">{t('acc_notif_title')}</h2>
      <p className="panel-subtitle">{t('acc_notif_sub')}</p>
      <div className="notif-empty">
        <div className="notif-icon-wrap"><Mail size={32}/></div>
        <p className="notif-title">No Notifications</p>
        <p className="notif-sub">{t('acc_no_notif')}</p>
      </div>
    </div>
  );
};

const BuyPlanPanel = () => {
  const { t } = useLanguage();
  return (
    <div className="panel">
      <h2 className="panel-heading">{t('account_buy')}</h2>
      <p className="panel-subtitle">{t('acc_buy_sub_sub')}</p>
      <div className="plan-options">
        {[
          { name: 'Basic', price: '2,000 RWF', period: t('acc_month'), features: [t('acc_quality_hd'), t('acc_no_ads'), t('acc_new_episodes')] },
          { name: 'Premium', price: '5,000 RWF', period: t('acc_month'), features: [t('acc_quality_4k'), t('acc_no_ads'), t('acc_new_episodes'), t('acc_downloads'), t('acc_support')], highlight: true },
        ].map(plan => (
          <div key={plan.name} className={`plan-option${plan.highlight ? ' highlighted' : ''}`}>
            <div className="plan-option-header">
              <Crown size={18} />
              <h3>{plan.name}</h3>
              {plan.highlight && <span className="plan-popular">Popular</span>}
            </div>
            <div className="plan-price">{plan.price}<span>{plan.period}</span></div>
            <ul className="plan-option-features">
              {plan.features.map(f => <li key={f}>✅ {f}</li>)}
            </ul>
            <button className={`btn ${plan.highlight ? 'btn-primary' : 'btn-ghost'} full-btn`}>
              <CreditCard size={15}/> {t('account_buy')} {plan.name}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Main Account Page ───────────────────────────────────── */

const AccountPage = () => {
  const { t } = useLanguage();
  const { user, isLoggedIn, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  const TABS = [
    { id: 'profile',       icon: User,       label: t('account_profile') },
    { id: 'subscription',  icon: Package,    label: t('account_subscription') },
    { id: 'notifications', icon: Bell,       label: t('account_notifications') },
    { id: 'buy',           icon: CreditCard, label: t('account_buy') },
  ];

  const renderPanel = () => {
    switch (activeTab) {
      case 'profile':       return <ProfilePanel />;
      case 'subscription':  return <SubscriptionPanel />;
      case 'notifications': return <NotificationsPanel />;
      case 'buy':           return <BuyPlanPanel />;
      default:              return <ProfilePanel />;
    }
  };

  return (
    <div className="account-layout">
      <div className="bg-logo-pattern" />
      {/* Left sidebar */}
      <aside className="account-sidebar">
        <Link to="/" className="back-home-btn">
          <Home size={14}/> {t('account_back_home')}
        </Link>

        {/* Plan card */}
        <div className="account-plan-card">
          <div className="account-plan-row">
            <span className="plan-name">Free Plan</span>
            <span className="plan-badge active">ACTIVE</span>
          </div>
          <div className="account-plan-stat">
            <span>{t('acc_started')}</span> <strong>{t('acc_unlimited')}</strong>
          </div>
          <div className="account-plan-stat">
            <span>{t('acc_ends')}</span> <strong>{t('acc_unlimited')}</strong>
          </div>
        </div>

        {/* Navigation */}
        <nav className="account-nav">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              className={`account-nav-item${activeTab === id ? ' active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={16}/>
              <span>{label}</span>
              <ChevronRight size={15} className="chevron"/>
            </button>
          ))}
        </nav>

        <div className="account-sidebar-footer">
          {isLoggedIn ? (
            <>
              <p className="acc-user-name">{t('acc_logged_in_as')} <strong>{user?.name}</strong></p>
              <button className="btn btn-ghost full-btn" onClick={logout}>
                <LogOut size={15}/> {t('logout')}
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary injira-btn">{t('account_login')}</Link>
          )}
          <span className="web-version">Web Version</span>
        </div>
      </aside>

      {/* Right content */}
      <div className="account-content">
        {renderPanel()}
      </div>
    </div>
  );
};

export default AccountPage;
