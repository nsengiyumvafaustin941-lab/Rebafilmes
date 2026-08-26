import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Compass, PlaySquare, Search, Heart, Globe, 
  ChevronRight, Newspaper, X, Smartphone, Download, Crown, User
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useVIP } from '../hooks/useVIP';
import { useVIPModal } from '../contexts/VIPModalContext';
import { useAuth } from '../contexts/AuthContext';
import SearchAutocomplete from './SearchAutocomplete';
import logo from '../assets/logo.jpg';
import './Sidebar.css';

const Sidebar = ({ onOpenInstallModal }) => {
  const { t, setIsModalOpen } = useLanguage();
  const { isVip } = useVIP();
  const { openVIPModal } = useVIPModal();
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [showSuggest, setShowSuggest] = useState(false);

  const NAV = [
    { to: '/',          icon: Compass,    label: t('nav_home')   },
    { to: '/movies',    icon: PlaySquare, label: t('nav_movies') },
    { to: '/search',    icon: Search,     label: t('nav_search') },
    { to: '/saved',     icon: Heart,      label: t('nav_saved')  },
    { to: '/newsfeeds', icon: Newspaper,  label: 'Newsfeeds'     },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQ.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQ.trim())}`);
      setSearchQ('');
      setShowSuggest(false);
      setCollapsed(true);
    }
  };

  return (
    <>
      <aside className={`sidebar ${collapsed ? 'collapsed' : 'expanded'}`}>

        {/* Logo + collapse toggle */}
        <div className="sidebar-top">
          <NavLink to="/" className="sidebar-logo" onClick={() => setCollapsed(true)}>
            <img src={logo} alt="RebaFilme" className="sidebar-logo-img" />
            <span className="sidebar-brand">RebaFilme</span>
          </NavLink>
          <button
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          >
            <ChevronRight size={16} className={`collapse-icon ${collapsed ? '' : 'rotated'}`} />
          </button>
        </div>

        {/* Inline search (expanded only) */}
        {!collapsed && (
          <form className="sidebar-search-form" onSubmit={handleSearch}>
            <Search size={14} className="sidebar-search-ico" />
            <input
              autoFocus
              className="sidebar-search-input"
              placeholder="Search movies, shows…"
              value={searchQ}
              onChange={(e) => {
                setSearchQ(e.target.value);
                setShowSuggest(true);
              }}
              onFocus={() => setShowSuggest(true)}
            />
            {searchQ && (
              <button
                type="button"
                className="sidebar-search-clear"
                onClick={() => {
                  setSearchQ('');
                  setShowSuggest(false);
                }}
              >
                <X size={12} />
              </button>
            )}
            <SearchAutocomplete
              query={searchQ}
              visible={showSuggest && Boolean(searchQ.trim())}
              onClose={() => setShowSuggest(false)}
              onSelect={() => {
                setCollapsed(true);
                setSearchQ('');
                setShowSuggest(false);
              }}
            />
          </form>
        )}

        {/* Browse section */}
        <div className="sidebar-section-label">Browse</div>
        <nav className="sidebar-nav">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              title={collapsed ? label : undefined}
              onClick={() => setCollapsed(true)}
            >
              <span className="sidebar-icon-wrap"><Icon size={20} /></span>
              <span className="sidebar-label">{label}</span>
              {!collapsed && <ChevronRight size={12} className="sidebar-link-arrow" />}
            </NavLink>
          ))}
        </nav>

        {/* VIP Pass Section */}
        <div className="sidebar-section-label">Membership</div>
        <div className="sidebar-nav">
          <button
            className={`sidebar-link vip-sidebar-btn ${isVip ? 'is-vip-active' : ''}`}
            title={collapsed ? (isVip ? 'VIP Active 👑' : 'VIP Pass (Ad-Free)') : undefined}
            onClick={() => {
              openVIPModal();
              setCollapsed(true);
            }}
          >
            <span className="sidebar-icon-wrap vip-icon-glow">
              <Crown size={20} color="#ffd700" />
            </span>
            <span className="sidebar-label" style={{ color: '#ffd700', fontWeight: 700 }}>
              {isVip ? 'VIP Active 👑' : 'VIP Pass'}
            </span>
            {!collapsed && !isVip && (
              <span className="vip-badge-mini">Ad-Free</span>
            )}
          </button>
        </div>

        {/* Settings & Apps section */}
        <div className="sidebar-section-label">App &amp; Settings</div>
        <div className="sidebar-nav">
          <NavLink
            to={isLoggedIn ? "/account" : "/login"}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            title={collapsed ? (isLoggedIn ? (user?.name || "Konti") : "Injira / Login") : undefined}
            onClick={() => setCollapsed(true)}
          >
            <span className="sidebar-icon-wrap" style={{ color: isLoggedIn ? '#38bdf8' : 'inherit' }}>
              <User size={20} />
            </span>
            <span className="sidebar-label">
              {isLoggedIn ? (user?.name || 'Konti yawe') : 'Injira / Konti'}
            </span>
            {!collapsed && <ChevronRight size={12} className="sidebar-link-arrow" />}
          </NavLink>

          <button
            className="sidebar-link app-download-link"
            title={collapsed ? "Get Mobile App" : undefined}
            onClick={() => {
              if (onOpenInstallModal) onOpenInstallModal();
              setCollapsed(true);
            }}
          >
            <span className="sidebar-icon-wrap app-icon-glow"><Smartphone size={20} /></span>
            <span className="sidebar-label">Get App</span>
            {!collapsed && <Download size={14} style={{ marginLeft: 'auto', opacity: 0.7 }} />}
          </button>

          <button
            className="sidebar-link"
            title={collapsed ? t('choose_language') : undefined}
            onClick={() => { setIsModalOpen(true); setCollapsed(true); }}
          >
            <span className="sidebar-icon-wrap"><Globe size={20} /></span>
            <span className="sidebar-label">{t('choose_language')}</span>
          </button>
        </div>

        {!collapsed && (
          <div className="sidebar-footer">
            <span>© 2026 RebaFilme</span>
          </div>
        )}
      </aside>

      {/* Backdrop when expanded */}
      {!collapsed && (
        <div className="sidebar-backdrop" onClick={() => setCollapsed(true)} />
      )}

      {/* Mobile Bottom Tab Bar */}
      <nav className="bottom-nav">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `bottom-link${isActive ? ' active' : ''}`}
          >
            <span className="bottom-icon-wrap"><Icon size={21} /></span>
            <span>{label}</span>
          </NavLink>
        ))}
        <button 
          className="bottom-link bottom-vip-btn" 
          onClick={() => openVIPModal()}
          title="VIP Pass"
        >
          <span className="bottom-icon-wrap"><Crown size={21} color="#ffd700" /></span>
          <span style={{ color: '#ffd700', fontWeight: 700 }}>VIP</span>
        </button>
        <NavLink 
          to={isLoggedIn ? "/account" : "/login"}
          className={({ isActive }) => `bottom-link${isActive ? ' active' : ''}`}
          title="Account"
        >
          <span className="bottom-icon-wrap"><User size={21} /></span>
          <span>{isLoggedIn ? 'Konti' : 'Injira'}</span>
        </NavLink>
      </nav>

    </>
  );
};

export default Sidebar;


