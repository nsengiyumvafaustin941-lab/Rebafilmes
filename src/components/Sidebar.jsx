import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, Search, Film, Bookmark, Globe, Clapperboard,
  MessageCircle, ChevronRight, Flame, Star, Tv, X
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import logo from '../assets/logo.jpg';
import './Sidebar.css';

const Sidebar = () => {
  const { t, setIsModalOpen } = useLanguage();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const searchRef = useRef(null);

  const NAV = [
    { to: '/',           icon: Home,        label: t('nav_home'),   badge: null },
    { to: '/movies',     icon: Film,        label: t('nav_movies'), badge: null },
    { to: '/search',     icon: Search,      label: t('nav_search'), badge: null },
    { to: '/saved',      icon: Bookmark,    label: t('nav_saved'),  badge: null },
    { to: '/highlights', icon: Clapperboard,label: 'Highlights',    badge: '🔥' },
  ];

  // Close sidebar on outside click (mobile)
  useEffect(() => {
    if (!collapsed) return;
    const handleKey = (e) => { if (e.key === 'Escape') setCollapsed(true); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [collapsed]);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQ.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQ.trim())}`);
      setSearchQ('');
      setSearchOpen(false);
      setCollapsed(true);
    }
  };

  return (
    <>
      {/* ── Desktop Sidebar ── */}
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

        {/* Inline search bar (expanded only) */}
        {!collapsed && (
          <form className="sidebar-search-form" onSubmit={handleSearch}>
            <Search size={14} className="sidebar-search-ico" />
            <input
              ref={searchRef}
              className="sidebar-search-input"
              placeholder="Search movies, shows…"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
            />
            {searchQ && (
              <button type="button" className="sidebar-search-clear" onClick={() => setSearchQ('')}>
                <X size={12} />
              </button>
            )}
          </form>
        )}

        {/* Section: Browse */}
        <div className="sidebar-section-label">Browse</div>
        <nav className="sidebar-nav">
          {NAV.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              title={collapsed ? label : undefined}
              onClick={() => setCollapsed(true)}
            >
              <span className="sidebar-icon-wrap">
                <Icon size={20} />
                {badge && <span className="sidebar-badge">{badge}</span>}
              </span>
              <span className="sidebar-label">{label}</span>
              {!collapsed && <ChevronRight size={12} className="sidebar-link-arrow" />}
            </NavLink>
          ))}
        </nav>

        {/* Section: More */}
        <div className="sidebar-section-label">More</div>
        <div className="sidebar-nav">
          <button
            className="sidebar-link"
            title={collapsed ? t('choose_language') : undefined}
            onClick={() => { setIsModalOpen(true); setCollapsed(true); }}
          >
            <span className="sidebar-icon-wrap"><Globe size={20} /></span>
            <span className="sidebar-label">{t('choose_language')}</span>
          </button>
          <a
            href="https://wa.me/250781344196"
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-link sidebar-whatsapp"
            title={collapsed ? t('request_movie') : undefined}
            onClick={() => setCollapsed(true)}
          >
            <span className="sidebar-icon-wrap">
              <MessageCircle size={20} />
            </span>
            <span className="sidebar-label">{t('request_movie')}</span>
          </a>
        </div>

        {/* Footer tag */}
        {!collapsed && (
          <div className="sidebar-footer">
            <span>© 2025 RebaFilme</span>
          </div>
        )}
      </aside>

      {/* Backdrop when expanded */}
      {!collapsed && (
        <div className="sidebar-backdrop" onClick={() => setCollapsed(true)} />
      )}

      {/* ── Mobile Bottom Tab Bar ── */}
      <nav className="bottom-nav">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `bottom-link${isActive ? ' active' : ''}`}
          >
            <span className="bottom-icon-wrap">
              <Icon size={21} />
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
        <button className="bottom-link bottom-lang-btn" onClick={() => setIsModalOpen(true)}>
          <span className="bottom-icon-wrap"><Globe size={21} /></span>
          <span>Lang</span>
        </button>
      </nav>
    </>
  );
};

export default Sidebar;
