import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Film, Megaphone, Settings, LogOut, Shield, Users, Menu, X, PlayCircle, Image } from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import './AdminLayout.css';

const ADMIN_NAV = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/movies',    icon: Film,             label: 'Catalog'   },
  { to: '/admin/ads',       icon: Megaphone,        label: 'Sponsors'  },
  { to: '/admin/upload',   icon: Image,            label: 'Media'     },
  { to: '/admin/highlights', icon: PlayCircle,      label: 'Highlights' },
  { to: '/admin/users',     icon: Users,            label: 'Users'     },
  { to: '/admin/settings',  icon: Settings,         label: 'Settings'  },
];

const AdminLayout = ({ children }) => {
  const { logout } = useAdmin();
  const navigate   = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/admin/login'); };
  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <div className="adm-layout">
      {/* Mobile Header */}
      <div className="adm-mobile-header">
        <div className="adm-brand">
          <Shield size={20} />
          <div>
            <span className="adm-brand-name">RebaFilme</span>
            <span className="adm-brand-tag">ADMIN</span>
          </div>
        </div>
        <button className="adm-mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`adm-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="adm-brand desktop-only">
          <Shield size={20} />
          <div>
            <span className="adm-brand-name">RebaFilme</span>
            <span className="adm-brand-tag">ADMIN</span>
          </div>
        </div>

        <nav className="adm-nav">
          {ADMIN_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeMenu}
              className={({ isActive }) => `adm-link${isActive ? ' active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <button className="adm-logout" onClick={handleLogout}>
          <LogOut size={17} /> Logout
        </button>
      </aside>

      {/* Main */}
      <main className="adm-main">
        {children}
      </main>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="adm-sidebar-overlay" onClick={closeMenu}></div>
      )}
    </div>
  );
};

export default AdminLayout;
