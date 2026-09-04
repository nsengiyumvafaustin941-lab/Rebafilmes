import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Search,
  Film,
  Tv,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  X,
  SlidersHorizontal,
  LayoutGrid,
  List,
  TrendingUp,
} from 'lucide-react';

import ContentGrid from '../components/ContentGrid';
import SearchListItem from '../components/SearchListItem';
import AdBanner from '../components/AdBanner';
import Footer from '../components/Footer';
import SearchAutocomplete from '../components/SearchAutocomplete';
import { useLanguage } from '../contexts/LanguageContext';
import { searchWithPagination, TMDB_GENRES } from '../utils/tmdb';
import './SearchPage.css';

const YEARS_LIST = [
  '2026', '2025', '2024', '2023', '2022', '2021', '2020',
  '2019', '2018', '2015', '2010', '2000', '1990',
];

const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Most Popular' },
  { value: 'vote_average.desc', label: 'Top Rated' },
  { value: 'primary_release_date.desc', label: 'Newest Release' },
  { value: 'original_title.asc', label: 'Title (A-Z)' },
];

const TRENDING_SEARCHES = [
  'Spider-Man', 'The Boys', 'Stranger Things', 'Squid Game',
  'Batman', 'Avatar', 'Breaking Bad', 'One Piece',
  'Deadpool', 'House of the Dragon', 'Peaky Blinders', 'Loki',
];

// Helper to generate compact page number lists e.g. [1, 2, 3, '...', 124]
const getPageNumbers = (current, total) => {
  const delta = 2;
  const range = [];
  const rangeWithDots = [];
  let l;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }

  for (const i of range) {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1);
      } else if (i - l !== 1) {
        rangeWithDots.push('...');
      }
    }
    rangeWithDots.push(i);
    l = i;
  }

  return rangeWithDots;
};

const SearchPage = () => {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();

  const urlQuery = params.get('q') || '';
  const urlType = params.get('type') || 'all';
  const urlGenre = params.get('genre') || '';
  const urlYear = params.get('year') || '';
  const urlSort = params.get('sort') || 'popularity.desc';
  const urlPage = Number(params.get('page')) || 1;

  const [query, setQuery] = useState(urlQuery);
  const [typeFilter, setTypeFilter] = useState(urlType);
  const [genreFilter, setGenreFilter] = useState(urlGenre);
  const [yearFilter, setYearFilter] = useState(urlYear);
  const [sortFilter, setSortFilter] = useState(urlSort);
  const [page, setPage] = useState(urlPage);

  const [results, setResults] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  const searchInputRef = useRef(null);
  const resultsTopRef = useRef(null);
  const searchSeqRef = useRef(0);

  useEffect(() => {
    setQuery(params.get('q') || '');
    setTypeFilter(params.get('type') || 'all');
    setGenreFilter(params.get('genre') || '');
    setYearFilter(params.get('year') || '');
    setSortFilter(params.get('sort') || 'popularity.desc');
    setPage(Number(params.get('page')) || 1);
  }, [params]);

  const syncParams = useCallback((newFilters) => {
    const updated = new URLSearchParams();
    if (newFilters.q?.trim()) updated.set('q', newFilters.q.trim());
    if (newFilters.type && newFilters.type !== 'all') updated.set('type', newFilters.type);
    if (newFilters.genre) updated.set('genre', newFilters.genre);
    if (newFilters.year) updated.set('year', newFilters.year);
    if (newFilters.sort && newFilters.sort !== 'popularity.desc') updated.set('sort', newFilters.sort);
    if (newFilters.page && newFilters.page > 1) updated.set('page', String(newFilters.page));
    setParams(updated, { replace: true });
  }, [setParams]);

  // Load single page of 20 items (replacing previous page items)
  const loadTitles = useCallback(async (targetPage = 1) => {
    const seq = ++searchSeqRef.current;
    setLoading(true);

    try {
      const response = await searchWithPagination({
        query,
        page: targetPage,
        type: typeFilter,
        genre: genreFilter,
        year: yearFilter,
        sort: sortFilter,
      });

      if (seq !== searchSeqRef.current) return;

      // Display ONLY the 20 titles for targetPage (previous page disappears)
      setResults(response.results || []);
      setPage(targetPage);
      setTotalPages(response.totalPages || 1);
      setTotalResults(response.totalResults || 0);
    } catch (err) {
      if (seq !== searchSeqRef.current) return;
      console.warn('TMDB search query failed', err);
      setResults([]);
    } finally {
      if (seq === searchSeqRef.current) {
        setLoading(false);
      }
    }
  }, [query, typeFilter, genreFilter, yearFilter, sortFilter]);

  // Load titles whenever filters or page change
  useEffect(() => {
    const timer = setTimeout(() => {
      loadTitles(page);
    }, 200);

    return () => clearTimeout(timer);
  }, [loadTitles, page]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === page || loading) return;
    setPage(newPage);
    syncParams({
      q: query,
      type: typeFilter,
      genre: genreFilter,
      year: yearFilter,
      sort: sortFilter,
      page: newPage,
    });

    // Smooth scroll up to results area
    if (resultsTopRef.current) {
      resultsTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleQueryChange = (val) => {
    setQuery(val);
    setPage(1);
    setShowAutocomplete(true);
    syncParams({ q: val, type: typeFilter, genre: genreFilter, year: yearFilter, sort: sortFilter, page: 1 });
  };

  const handleTypeChange = (newType) => {
    setTypeFilter(newType);
    setPage(1);
    syncParams({ q: query, type: newType, genre: genreFilter, year: yearFilter, sort: sortFilter, page: 1 });
  };

  const handleGenreChange = (genreId) => {
    const nextGenre = genreFilter === String(genreId) ? '' : String(genreId);
    setGenreFilter(nextGenre);
    setPage(1);
    syncParams({ q: query, type: typeFilter, genre: nextGenre, year: yearFilter, sort: sortFilter, page: 1 });
  };

  const handleYearChange = (yr) => {
    const nextYear = yearFilter === yr ? '' : yr;
    setYearFilter(nextYear);
    setPage(1);
    syncParams({ q: query, type: typeFilter, genre: genreFilter, year: nextYear, sort: sortFilter, page: 1 });
  };

  const handleSortChange = (e) => {
    const nextSort = e.target.value;
    setSortFilter(nextSort);
    setPage(1);
    syncParams({ q: query, type: typeFilter, genre: genreFilter, year: yearFilter, sort: nextSort, page: 1 });
  };

  const handleResetFilters = () => {
    setQuery('');
    setTypeFilter('all');
    setGenreFilter('');
    setYearFilter('');
    setSortFilter('popularity.desc');
    setPage(1);
    setParams({}, { replace: true });
  };

  const handleTrendingClick = (searchTerm) => {
    handleQueryChange(searchTerm);
    setShowAutocomplete(false);
  };

  const hasActiveFilters = Boolean(
    query.trim() || typeFilter !== 'all' || genreFilter || yearFilter || sortFilter !== 'popularity.desc'
  );

  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div className="search-page page" ref={resultsTopRef}>
      <div className="bg-logo-pattern" />
      <Helmet>
        <title>{query ? `"${query}" - Page ${page} | RebaFilme` : `Search Movies & TV Shows (Page ${page}) | RebaFilme`}</title>
        <meta
          name="description"
          content="Explore and stream millions of movies and TV shows indexed from TMDB on RebaFilme with 14 fast servers."
        />
      </Helmet>

      {/* ── Search Input & Autocomplete Hero ── */}
      <div className="search-hero">
        <div className="search-input-wrap">
          <Search size={22} className="search-ico" />
          <input
            ref={searchInputRef}
            autoFocus
            type="text"
            className="search-input"
            placeholder={t('search_placeholder') || 'Search all movies, TV series, actors, or genres on TMDB…'}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => setShowAutocomplete(true)}
          />
          {query && (
            <button
              className="search-clear-btn"
              onClick={() => handleQueryChange('')}
              aria-label="Clear search"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <SearchAutocomplete
          query={query}
          visible={showAutocomplete}
          onClose={() => setShowAutocomplete(false)}
        />
      </div>

      {/* ── Trending Searches (shown when search is empty) ── */}
      {!query.trim() && !hasActiveFilters && (
        <div className="trending-section">
          <h3 className="trending-heading">
            <TrendingUp size={18} /> Trending Searches
          </h3>
          <div className="trending-chips">
            {TRENDING_SEARCHES.map((term) => (
              <button
                key={term}
                className="trending-chip"
                onClick={() => handleTrendingClick(term)}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Layout: Filters Aside + Results Grid ── */}
      <div className="search-layout">
        <aside className="search-filters">
          <div className="filter-group-header">
            <span className="filter-group-title">
              <SlidersHorizontal size={14} />
              Filter & Discover
            </span>
            {hasActiveFilters && (
              <button
                className="reset-filters-btn"
                style={{ width: 'auto', padding: '0.2rem 0.5rem' }}
                onClick={handleResetFilters}
                title="Reset all filters"
              >
                <RotateCcw size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Reset
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div>
            <div className="filter-group-header">
              <span className="filter-group-title">Content Type</span>
            </div>
            <div className="filter-pills-wrap">
              <button
                className={`filter-pill ${typeFilter === 'all' ? 'active' : ''}`}
                onClick={() => handleTypeChange('all')}
              >
                All
              </button>
              <button
                className={`filter-pill ${typeFilter === 'movie' ? 'active' : ''}`}
                onClick={() => handleTypeChange('movie')}
              >
                <Film size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Movies
              </button>
              <button
                className={`filter-pill ${typeFilter === 'series' ? 'active' : ''}`}
                onClick={() => handleTypeChange('series')}
              >
                <Tv size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> TV Series
              </button>
            </div>
          </div>

          {/* Sort By Filter */}
          <div>
            <div className="filter-group-header">
              <span className="filter-group-title">Sort By</span>
            </div>
            <select
              className="filter-select"
              value={sortFilter}
              onChange={handleSortChange}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Genre Filter */}
          <div>
            <div className="filter-group-header">
              <span className="filter-group-title">Genres ({TMDB_GENRES.length})</span>
            </div>
            <div className="filter-pills-wrap">
              {TMDB_GENRES.map((g) => (
                <button
                  key={g.id}
                  className={`filter-pill ${genreFilter === String(g.id) ? 'active' : ''}`}
                  onClick={() => handleGenreChange(g.id)}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          {/* Release Year Filter */}
          <div>
            <div className="filter-group-header">
              <span className="filter-group-title">Release Year</span>
            </div>
            <div className="filter-pills-wrap">
              {YEARS_LIST.map((yr) => (
                <button
                  key={yr}
                  className={`filter-pill ${yearFilter === yr ? 'active' : ''}`}
                  onClick={() => handleYearChange(yr)}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Results Container ── */}
        <main className="search-results-area">
          <div className="results-header-bar">
            <span className="results-count-text">
              {loading ? (
                'Searching TMDB database…'
              ) : results.length > 0 ? (
                <>
                  Found <span className="results-count-highlight">{totalResults.toLocaleString()}</span> titles
                  {query && <> for "<span style={{ color: '#fff' }}>{query}</span>"</>}
                  <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>
                    (Showing page {page} of {totalPages})
                  </span>
                </>
              ) : (
                'No matching movies or TV shows found'
              )}
            </span>

            {/* Grid / List Toggle */}
            <div className="view-toggle">
              <button
                className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid view"
                aria-label="Grid view"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List view"
                aria-label="List view"
              >
                <List size={16} />
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Sparkles size={32} color="var(--accent, #e50914)" style={{ animation: 'spin 2s linear infinite' }} />
              <p style={{ marginTop: '1rem' }}>Loading Page {page}…</p>
            </div>
          ) : results.length > 0 ? (
            <>
              {viewMode === 'grid' ? (
                <ContentGrid items={results} />
              ) : (
                <div className="search-list-view">
                  {results.map((item) => (
                    <SearchListItem key={item.id} item={item} />
                  ))}
                </div>
              )}

              {/* ── Vertical Pagination Widget ── */}
              <div className="vertical-pagination-wrap">
                {/* 1. Large Next Page Action Button */}
                {page < totalPages && (
                  <button
                    className="pagination-primary-next-btn"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={loading}
                  >
                    <span>Next Page ({page + 1} of {totalPages})</span>
                    <ArrowRight size={18} />
                  </button>
                )}

                {/* 2. Numbered Navigation Bar */}
                {totalPages > 1 && (
                  <div className="pagination-nav-row">
                    <button
                      className="pagination-nav-btn"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1 || loading}
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={16} />
                      <span>Prev</span>
                    </button>

                    {pageNumbers.map((pNum, idx) =>
                      pNum === '...' ? (
                        <span key={`dots-${idx}`} className="pagination-ellipsis">…</span>
                      ) : (
                        <button
                          key={`page-${pNum}`}
                          className={`pagination-num-btn ${page === pNum ? 'active' : ''}`}
                          onClick={() => handlePageChange(pNum)}
                          disabled={loading}
                        >
                          {pNum}
                        </button>
                      )
                    )}

                    <button
                      className="pagination-nav-btn"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= totalPages || loading}
                      aria-label="Next page"
                    >
                      <span>Next</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}

                {/* 3. Status Summary */}
                <div className="pagination-info-text">
                  Showing 20 of {totalResults.toLocaleString()} titles · Page {page} of {totalPages}
                </div>
              </div>
            </>
          ) : (
            <div className="no-results">
              <Search size={48} color="var(--text-secondary)" />
              <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>
                {t('search_no_results') || 'No titles found matching your search.'}
              </p>
              <p style={{ fontSize: '0.9rem', maxWidth: '400px', margin: '0.5rem auto 1.5rem', lineHeight: '1.5' }}>
                Try searching for general keywords, adjusting spelling, or resetting active filters.
              </p>
              {hasActiveFilters && (
                <button className="btn btn-primary" onClick={handleResetFilters}>
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </main>
      </div>

      <AdBanner position="search_page" />
      <Footer />
    </div>
  );
};

export default SearchPage;
