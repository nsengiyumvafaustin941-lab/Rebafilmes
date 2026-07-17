import React, { useState, useMemo, useEffect } from 'react';
import { Search } from 'lucide-react';

import ContentGrid from '../components/ContentGrid';
import AdBanner from '../components/AdBanner';
import Footer from '../components/Footer';
import { useLanguage } from '../contexts/LanguageContext';
import { useMovies } from '../contexts/MoviesContext';
import { searchMovies } from '../utils/tmdb';
import './SearchPage.css';

const SearchPage = () => {
  const { t } = useLanguage();
  const { allMovies } = useMovies();
  const [query, setQuery] = useState('');
  const [yearFilter, setYearFilter] = useState(null);
  const [remoteResults, setRemoteResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const YEARS = useMemo(
    () => [...new Set(allMovies.map((m) => m.year).filter(Boolean))].sort((a, b) => b - a),
    [allMovies]
  );

  useEffect(() => {
    if (!query.trim()) {
      setRemoteResults(null);
      return;
    }

    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchMovies(query.trim());
        setRemoteResults(results);
      } catch (err) {
        console.warn('TMDB search failed', err);
        setRemoteResults(null);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(handle);
  }, [query]);

  const results = useMemo(() => {
    const base = remoteResults !== null
      ? remoteResults
      : allMovies.filter((item) => !query || item.title.toLowerCase().includes(query.toLowerCase()));

    return base.filter((item) => !yearFilter || item.year === yearFilter);
  }, [allMovies, query, yearFilter, remoteResults]);

  return (
    <div className="search-page page">
      <div className="bg-logo-pattern" />
      <div className="search-hero">
        <div className="search-input-wrap">
          <Search size={20} className="search-ico" />
          <input
            autoFocus
            type="text"
            className="search-input"
            placeholder={t('search_placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="search-layout">
        <aside className="search-filters">
          <div className="filter-group">
            <h4>{t('filter_year')}</h4>
            {YEARS.map((y) => (
              <button
                key={y}
                className={`filter-pill${yearFilter === y ? ' active' : ''}`}
                onClick={() => setYearFilter(yearFilter === y ? null : y)}
              >
                {y}
              </button>
            ))}
          </div>
        </aside>

        <div className="search-results">
          <p className="results-count">
            {searching ? 'Searching…' : `${results.length} ${t('search_results')}`}
          </p>
          {results.length > 0 ? (
            <ContentGrid items={results} />
          ) : (
            <div className="no-results">
              <Search size={48} />
              <p>{t('search_no_results')}</p>
            </div>
          )}
        </div>
      </div>
      <AdBanner position="search_page" />
      <Footer />
    </div>
  );
};

export default SearchPage;
