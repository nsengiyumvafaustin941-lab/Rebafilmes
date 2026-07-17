import React, { useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import logo from '../assets/logo.jpg';
import './LanguageModal.css';

const LanguageModal = () => {
  const { lang, setLang, t, isModalOpen, setIsModalOpen } = useLanguage();

  useEffect(() => {
    const saved = localStorage.getItem('rebafilme_lang');
    if (!saved) setIsModalOpen(true);
  }, [setIsModalOpen]);

  const choose = (newLang) => {
    setLang(newLang);
    setIsModalOpen(false);
  };

  if (!isModalOpen) return null;

  return (
    <div className="lang-overlay">
      <div className="lang-modal">
        {localStorage.getItem('rebafilme_lang') && (
          <button className="lang-close" onClick={() => setIsModalOpen(false)}>✕</button>
        )}
        <div className="lang-logo">
          <img src={logo} alt="RebaFilme" className="lang-logo-img" />
          <span>RebaFilme</span>
        </div>
        <h2 className="lang-title">{t('choose_language')}</h2>
        <p className="lang-sub">{t('lang_sub')}</p>
        <div className="lang-buttons">
          <button className={`lang-btn ${lang === 'rw' ? 'active' : ''}`} onClick={() => choose('rw')}>
            <span className="lang-flag">🇷🇼</span>
            <span className="lang-name">{t('lang_rw')}</span>
            <span className="lang-desc">{t('lang_rw_desc')}</span>
          </button>
          <button className={`lang-btn ${lang === 'fr' ? 'active' : ''}`} onClick={() => choose('fr')}>
            <span className="lang-flag">🇫🇷</span>
            <span className="lang-name">{t('lang_fr')}</span>
            <span className="lang-desc">{t('lang_fr_desc')}</span>
          </button>
          <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => choose('en')}>
            <span className="lang-flag">🇬🇧</span>
            <span className="lang-name">{t('lang_en')}</span>
            <span className="lang-desc">{t('lang_en_desc')}</span>
          </button>
          <button className={`lang-btn ${lang === 'sw' ? 'active' : ''}`} onClick={() => choose('sw')}>
            <span className="lang-flag">🇹🇿</span>
            <span className="lang-name">{t('lang_sw')}</span>
            <span className="lang-desc">{t('lang_sw_desc')}</span>
          </button>
          <button className={`lang-btn ${lang === 'lg' ? 'active' : ''}`} onClick={() => choose('lg')}>
            <span className="lang-flag">🇺🇬</span>
            <span className="lang-name">{t('lang_lg')}</span>
            <span className="lang-desc">{t('lang_lg_desc')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LanguageModal;
