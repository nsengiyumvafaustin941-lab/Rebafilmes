import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../data/translations';

const LanguageContext = createContext();

// Languages that we have manual translations for in translations.js
const BUILT_IN_LANGS = ['rw', 'fr', 'en', 'sw', 'lg'];

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(localStorage.getItem('rebafilme_lang') || 'rw');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const setLang = (code) => {
    setLangState(code);
    localStorage.setItem('rebafilme_lang', code);

    if (BUILT_IN_LANGS.includes(code)) {
      // Clear google translate cookie
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=' + window.location.hostname + '; path=/;';
    } else {
      // For non-built-in, set Google Translate cookie (translating from rw to chosen language)
      // rw is our default base language in index.html <html lang="rw">
      document.cookie = `googtrans=/rw/${code}; path=/;`;
      document.cookie = `googtrans=/rw/${code}; domain=.${window.location.hostname}; path=/;`;
    }
    
    // Reload page to let Google Translate script pick up the new cookie
    window.location.reload();
  };

  const t = (key) => {
    // If it's a non-built-in language, we fallback to rw (Kinyarwanda) so Google Translate can translate it from rw to target
    const sourceLang = BUILT_IN_LANGS.includes(lang) ? lang : 'rw';
    return translations[sourceLang]?.[key] || translations['rw']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isModalOpen, setIsModalOpen }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
