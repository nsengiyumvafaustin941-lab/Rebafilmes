import React, { useState, useMemo } from 'react';
import HeroBanner from '../components/HeroBanner';
import FilterTabs from '../components/FilterTabs';
import ScrollRow from '../components/ScrollRow';
import ContentGrid from '../components/ContentGrid';
import AdBanner from '../components/AdBanner';
import Footer from '../components/Footer';
import { useMovies } from '../contexts/MoviesContext';
import { useLanguage } from '../contexts/LanguageContext';

/* ─── Read localStorage progress ─────────────────── */
const getInProgressItems = (allMovies) => {
  try {
    const raw = localStorage.getItem('rebafilme_progress');
    if (!raw) return [];
    const progress = JSON.parse(raw);
    return allMovies
      .filter(c => progress[c.id] && progress[c.id].percent > 1 && progress[c.id].percent < 98)
      .map(c => ({ ...c, _progress: progress[c.id].percent }));
  } catch {
    return [];
  }
};

const HomePage = () => {
  const [tab, setTab] = useState(0);
  const { t } = useLanguage();
  const { allMovies, loading } = useMovies();

  const filtered   = useMemo(() =>
    tab === 0 ? allMovies
    : tab === 1 ? allMovies.filter(m => m.type === 'movie')
    : allMovies.filter(m => m.type === 'series'),
  [allMovies, tab]);

  const latest     = useMemo(() => [...filtered].sort((a, b) => b.year - a.year).slice(0, 10), [filtered]);
  const recentlyAdded = useMemo(() => [...filtered].sort((a, b) => b.id - a.id).slice(0, 10), [filtered]);
  const popularF   = useMemo(() => filtered.filter(m => m.popular), [filtered]);
  const featured   = useMemo(() => filtered.filter(m => m.featured || m.popular), [filtered]);
  const inProgress = useMemo(() => getInProgressItems(allMovies), [allMovies]);

  if (loading) {
    return (
      <div className="page" style={{ padding: '4rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading movies from TMDB…
      </div>
    );
  }

  return (
    <div>
      <HeroBanner items={featured.length ? featured : allMovies} />
      <AdBanner position="home_top" />
      <FilterTabs activeTab={tab} onChange={setTab} />

      {inProgress.length > 0 && (
        <ScrollRow title={t('continue_watching')} items={inProgress} viewAllTo="/saved" />
      )}

      {recentlyAdded.length > 0 && (
        <ScrollRow title={t('btn_recently_added')} items={recentlyAdded} />
      )}
      {latest.length > 0 && (
        <ScrollRow title={t('btn_latest')} items={latest} />
      )}
      <AdBanner position="home_mid" />
      {popularF.length > 0 && (
        <ScrollRow title={t('btn_popular')} items={popularF} />
      )}
      {filtered.length > 0 && (
        <ContentGrid title={t('btn_all')} items={filtered} />
      )}
      <Footer />
    </div>
  );
};

export default HomePage;
