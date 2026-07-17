import React from 'react';
import { Bookmark } from 'lucide-react';

import ContentGrid from '../components/ContentGrid';
import Footer from '../components/Footer';
import { useLanguage } from '../contexts/LanguageContext';
import { useMovies } from '../contexts/MoviesContext';
import { useSaved } from '../contexts/SavedContext';
import './SavedPage.css';

const SavedPage = () => {
  const { t } = useLanguage();
  const { allMovies } = useMovies();
  const { isSaved } = useSaved();
  const savedItems = allMovies.filter(item => isSaved(item.id));

  return (
    <div className="saved-page page">
      <div className="bg-logo-pattern" />
      <div className="saved-header">
        <Bookmark size={32} style={{ color: 'var(--accent)' }} />
        <h2>{t('nav_saved')}</h2>
      </div>

      {savedItems.length > 0 ? (
        <div className="saved-results">
          <ContentGrid items={savedItems} />
        </div>
      ) : (
        <div className="saved-empty">
          <Bookmark size={48} />
          <p>{t('search_no_results')}</p>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default SavedPage;
