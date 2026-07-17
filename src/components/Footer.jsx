import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { getSettings } from '../utils/settings';
import logo from '../assets/logo.jpg';
import './Footer.css';

const Footer = () => {
  const { t } = useLanguage();
  const socialsRef = useRef(null);
  const settings = getSettings();
  const whatsapp = settings.whatsapp || '250786934081';

  useEffect(() => {
    const el = socialsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-socials');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.unobserve(el);
  }, []);

  return (
    <footer className="footer">
      <div className="footer-top-badge">
        <div className="badge-inner">
          <img src={logo} alt="Reba Badge" />
        </div>
      </div>
      <div className="footer-container">
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            <img src={logo} alt="RebaFilme" className="footer-logo-img" />
            <span>RebaFilme</span>
          </Link>
          <p className="footer-desc">{t('footer_desc')}</p>
          <div className="footer-socials" ref={socialsRef}>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon" title="Facebook">
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 320 512" xmlns="http://www.w3.org/2000/svg">
                <path d="M80 299.3V512H196V299.3h86.5l18-97.8H196V166.9c0-51.7 20.3-71.5 72.7-71.5c16.3 0 29.4 .4 37 1.2V7.9C291.4 4 256.4 0 236.2 0C129.3 0 80 50.5 80 159.4v42.1H14v97.8H80z"/>
              </svg>
            </a>
            <a href="https://www.tiktok.com/@rebafilme" target="_blank" rel="noopener noreferrer" className="social-icon" title="TikTok">
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
                <path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z"/>
              </svg>
            </a>
            <a href="https://www.instagram.com/rebafilme/" target="_blank" rel="noopener noreferrer" className="social-icon" title="Instagram">
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
              </svg>
            </a>
            <a href="https://www.youtube.com/channel/UChYyt9FjirxFyJlgB1G7mlA" target="_blank" rel="noopener noreferrer" className="social-icon" title="YouTube">
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" xmlns="http://www.w3.org/2000/svg">
                <path d="M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.537V175.185l142.739 81.205-142.739 81.23z"/>
              </svg>
            </a>
            <a href="https://t.me" target="_blank" rel="noopener noreferrer" className="social-icon" title="Telegram">
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 496 512" xmlns="http://www.w3.org/2000/svg">
                <path d="M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm121.8 169.9l-40.7 191.8c-3 13.6-11.1 16.9-22.4 10.5l-62-45.7-29.9 28.8c-3.3 3.3-6.1 6.1-12.5 6.1l4.4-63.1 114.9-103.8c5-4.4-1.1-6.9-7.7-2.5l-142 89.4-61.2-19.1c-13.3-4.2-13.6-13.3 2.8-19.7l239.1-92.2c11.1-4 20.8 2.7 17.2 19.5z"/>
              </svg>
            </a>
          </div>
        </div>
        
        <div className="link-group">
          <h4>{t('footer_quick_links')}</h4>
          <ul>
            <li><Link to="/">{t('nav_home')}</Link></li>
            <li><Link to="/movies">{t('nav_movies')}</Link></li>
            <li><Link to="/movies">{t('nav_search')}</Link></li>
            <li><Link to="/saved">{t('nav_saved')}</Link></li>
          </ul>
        </div>
        
        <div className="link-group">
          <h4>{t('footer_support')}</h4>
          <ul>
            <li><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">{t('footer_faq')}</a></li>
            <li><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">{t('footer_contact')}</a></li>
            {settings.sponsorContactEmail && (
              <li><a href={`mailto:${settings.sponsorContactEmail}`}>Advertise / Sponsor</a></li>
            )}
            <li><Link to="/account">{t('footer_terms')}</Link></li>
            <li><Link to="/account">{t('footer_privacy')}</Link></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} RebaFilme. {t('footer_rights')}</p>
      </div>
    </footer>
  );
};

export default Footer;
