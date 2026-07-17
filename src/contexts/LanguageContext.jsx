import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../data/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(localStorage.getItem('rebafilme_lang') || 'rw');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('rebafilme_lang', lang);
  }, [lang]);

  const t = (key) => {
    return translations[lang]?.[key] || translations['rw']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isModalOpen, setIsModalOpen }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
