import React, { useState, useEffect } from 'react';
import { Search, Menu, X } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container navbar-container">
        <div className="navbar-left">
          <a href="/" className="logo">
            <span className="text-gradient">Agasoba</span>Stream
          </a>
          <ul className="nav-links desktop-only">
            <li><a href="#" className="active">Home</a></li>
            <li><a href="#">Movies</a></li>
            <li><a href="#">TV Series</a></li>
            <li><a href="#">Trending</a></li>
            <li><a href="#">Top IMDb</a></li>
          </ul>
        </div>

        <button 
          className="mobile-menu-btn mobile-only"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="search-box mobile-search">
          <Search size={18} className="search-icon" />
          <input type="text" placeholder="Search..." />
        </div>
        <ul className="mobile-nav-links">
          <li><a href="#" className="active">Home</a></li>
          <li><a href="#">Movies</a></li>
          <li><a href="#">TV Series</a></li>
          <li><a href="#">Trending</a></li>
          <li><a href="#">Top IMDb</a></li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
