import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Check, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import logo from '../assets/logo.jpg';
import './LanguageModal.css';

/* ─── All supported languages ───────────────────────────── */
const LANGUAGES = [
  // African (always first)
  { code: 'rw', flag: '🇷🇼', name: 'Kinyarwanda',    native: 'Ikinyarwanda',  region: 'Africa' },
  { code: 'lg', flag: '🇺🇬', name: 'Luganda',         native: 'Luganda',       region: 'Africa' },
  { code: 'sw', flag: '🇹🇿', name: 'Swahili',         native: 'Kiswahili',     region: 'Africa' },
  { code: 'yo', flag: '🇳🇬', name: 'Yoruba',          native: 'Yorùbá',        region: 'Africa' },
  { code: 'ha', flag: '🇳🇬', name: 'Hausa',           native: 'Hausa',         region: 'Africa' },
  { code: 'ig', flag: '🇳🇬', name: 'Igbo',            native: 'Igbo',          region: 'Africa' },
  { code: 'am', flag: '🇪🇹', name: 'Amharic',         native: 'አማርኛ',          region: 'Africa' },
  { code: 'so', flag: '🇸🇴', name: 'Somali',          native: 'Soomaali',      region: 'Africa' },
  { code: 'mg', flag: '🇲🇬', name: 'Malagasy',        native: 'Malagasy',      region: 'Africa' },
  { code: 'sn', flag: '🇿🇼', name: 'Shona',           native: 'chiShona',      region: 'Africa' },
  { code: 'ny', flag: '🇲🇼', name: 'Chichewa',        native: 'Chichewa',      region: 'Africa' },
  { code: 'zu', flag: '🇿🇦', name: 'Zulu',            native: 'isiZulu',       region: 'Africa' },
  { code: 'xh', flag: '🇿🇦', name: 'Xhosa',           native: 'isiXhosa',      region: 'Africa' },
  { code: 'st', flag: '🇱🇸', name: 'Sesotho',         native: 'Sesotho',       region: 'Africa' },

  // Global / Major
  { code: 'en', flag: '🇬🇧', name: 'English',         native: 'English',       region: 'Global' },
  { code: 'fr', flag: '🇫🇷', name: 'French',          native: 'Français',      region: 'Global' },
  { code: 'pt', flag: '🇵🇹', name: 'Portuguese',      native: 'Português',     region: 'Global' },
  { code: 'es', flag: '🇪🇸', name: 'Spanish',         native: 'Español',       region: 'Global' },
  { code: 'ar', flag: '🇸🇦', name: 'Arabic',          native: 'العربية',       region: 'Global' },
  { code: 'zh', flag: '🇨🇳', name: 'Chinese',         native: '中文',           region: 'Global' },
  { code: 'hi', flag: '🇮🇳', name: 'Hindi',           native: 'हिन्दी',          region: 'Global' },
  { code: 'ru', flag: '🇷🇺', name: 'Russian',         native: 'Русский',       region: 'Global' },
  { code: 'de', flag: '🇩🇪', name: 'German',          native: 'Deutsch',       region: 'Global' },
  { code: 'ja', flag: '🇯🇵', name: 'Japanese',        native: '日本語',          region: 'Global' },
  { code: 'ko', flag: '🇰🇷', name: 'Korean',          native: '한국어',          region: 'Global' },
  { code: 'tr', flag: '🇹🇷', name: 'Turkish',         native: 'Türkçe',        region: 'Global' },
  { code: 'id', flag: '🇮🇩', name: 'Indonesian',      native: 'Bahasa Indonesia',region:'Global'},
  { code: 'vi', flag: '🇻🇳', name: 'Vietnamese',      native: 'Tiếng Việt',    region: 'Global' },
  { code: 'th', flag: '🇹🇭', name: 'Thai',            native: 'ภาษาไทย',        region: 'Global' },
  { code: 'fa', flag: '🇮🇷', name: 'Persian',         native: 'فارسی',         region: 'Global' },
  { code: 'pl', flag: '🇵🇱', name: 'Polish',          native: 'Polski',        region: 'Global' },
  { code: 'nl', flag: '🇳🇱', name: 'Dutch',           native: 'Nederlands',    region: 'Global' },
  { code: 'it', flag: '🇮🇹', name: 'Italian',         native: 'Italiano',      region: 'Global' },
  { code: 'uk', flag: '🇺🇦', name: 'Ukrainian',       native: 'Українська',    region: 'Global' },
  { code: 'ms', flag: '🇲🇾', name: 'Malay',           native: 'Bahasa Melayu', region: 'Global' },
  { code: 'fil', flag: '🇵🇭', name: 'Filipino',       native: 'Filipino',      region: 'Global' },
  { code: 'bn', flag: '🇧🇩', name: 'Bengali',         native: 'বাংলা',          region: 'Global' },
  { code: 'ur', flag: '🇵🇰', name: 'Urdu',            native: 'اردو',          region: 'Global' },
];

const REGIONS = ['All', 'Africa', 'Global'];

const LanguageModal = () => {
  const { lang, setLang, t, isModalOpen, setIsModalOpen } = useLanguage();
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('All');

  useEffect(() => {
    const saved = localStorage.getItem('rebafilme_lang');
    if (!saved) setIsModalOpen(true);
  }, [setIsModalOpen]);

  // Reset search when modal opens
  useEffect(() => {
    if (isModalOpen) { setSearch(''); setRegion('All'); }
  }, [isModalOpen]);

  const choose = (code) => {
    setLang(code);
    setIsModalOpen(false);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return LANGUAGES.filter((l) => {
      const matchRegion = region === 'All' || l.region === region;
      const matchSearch = !q || l.name.toLowerCase().includes(q) || l.native.toLowerCase().includes(q) || l.code.includes(q);
      return matchRegion && matchSearch;
    });
  }, [search, region]);

  if (!isModalOpen) return null;

  return (
    <div className="lang-overlay" onClick={() => localStorage.getItem('rebafilme_lang') && setIsModalOpen(false)}>
      <div className="lang-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Close (only after first selection) */}
        {localStorage.getItem('rebafilme_lang') && (
          <button className="lang-close" onClick={() => setIsModalOpen(false)} aria-label="Close">
            <X size={16} />
          </button>
        )}

        {/* Header */}
        <div className="lang-logo">
          <img src={logo} alt="RebaFilme" className="lang-logo-img" />
          <span>RebaFilme</span>
        </div>
        <div className="lang-head-row">
          <Globe size={20} className="lang-globe-icon" />
          <h2 className="lang-title">Choose Your Language</h2>
        </div>
        <p className="lang-sub">Select the language you want to use.</p>

        {/* Region filter tabs */}
        <div className="lang-region-tabs">
          {REGIONS.map((r) => (
            <button
              key={r}
              className={`lang-region-tab${region === r ? ' active' : ''}`}
              onClick={() => setRegion(r)}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="lang-search-wrap">
          <Search size={14} className="lang-search-ico" />
          <input
            className="lang-search"
            placeholder="Search language…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="lang-search-clear" onClick={() => setSearch('')}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Language grid */}
        <div className="lang-grid">
          {filtered.length === 0 ? (
            <p className="lang-no-results">No languages found.</p>
          ) : (
            filtered.map((l) => (
              <button
                key={l.code}
                className={`lang-btn${lang === l.code ? ' active' : ''}`}
                onClick={() => choose(l.code)}
              >
                <span className="lang-flag">{l.flag}</span>
                <span className="lang-name">{l.name}</span>
                <span className="lang-native">{l.native}</span>
                {lang === l.code && <Check size={12} className="lang-check" />}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LanguageModal;
