import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Search, Film, Bookmark, Globe, ChevronRight, Newspaper, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import logo from '../assets/logo.jpg';
import './Sidebar.css';

const Sidebar = () => {
  const { t, setIsModalOpen } = useLanguage();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true);
  const [searchQ, setSearchQ] = useState('');

  const NAV = [
    { to: '/',          icon: Home,      label: t('nav_home')   },
    { to: '/movies',    icon: Film,      label: t('nav_movies') },
    { to: '/search',    icon: Search,    label: t('nav_search') },
    { to: '/saved',     icon: Bookmark,  label: t('nav_saved')  },
    { to: '/newsfeeds', icon: Newspaper, label: 'Newsfeeds'     },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQ.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQ.trim())}`);
      setSearchQ('');
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
              onChange={(e) => setSearchQ(e.target.value)}
            />
            {searchQ && (
              <button type="button" className="sidebar-search-clear" onClick={() => setSearchQ('')}>
                <X size={12} />
              </button>
            )}
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

        {/* Settings section */}
        <div className="sidebar-section-label">Settings</div>
        <div className="sidebar-nav">
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
            <span>© 2025 RebaFilme</span>
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
        <button className="bottom-link bottom-lang-btn" onClick={() => setIsModalOpen(true)}>
          <span className="bottom-icon-wrap"><Globe size={21} /></span>
          <span>Lang</span>
        </button>
      </nav>
    </>
  );
};

export default Sidebar;
