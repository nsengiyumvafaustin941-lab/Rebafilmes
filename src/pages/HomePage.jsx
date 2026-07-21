import React, { useState, useMemo } from 'react';
import HeroBanner from '../components/HeroBanner';
import FilterTabs from '../components/FilterTabs';
import ScrollRow from '../components/ScrollRow';
import CuratedRow from '../components/CuratedRow';
import ContentGrid from '../components/ContentGrid';
import AdBanner from '../components/AdBanner';
import Footer from '../components/Footer';
import UpcomingRow from '../components/UpcomingRow';
import { useMovies } from '../contexts/MoviesContext';
import { useLanguage } from '../contexts/LanguageContext';
import { HOME_SECTIONS, UPCOMING_CALENDAR } from '../data/homeSectionsData';

/* ─── Read localStorage progress ─────────────────── */
const getInProgressItems = (allMovies) => {
  try {
    const raw = localStorage.getItem('rebafilme_progress');
    if (!raw) return [];
    const progress = JSON.parse(raw);
    return allMovies
      .filter((c) => progress[c.id] && progress[c.id].percent > 1 && progress[c.id].percent < 98)
      .map((c) => ({ ...c, _progress: progress[c.id].percent }));
  } catch {
    return [];
  }
};

const HomePage = () => {
  const [tab, setTab] = useState(0);
  const { t } = useLanguage();
  const { allMovies, loading } = useMovies();

  const filtered = useMemo(
    () =>
      tab === 0
        ? allMovies
        : tab === 1
        ? allMovies.filter((m) => m.type === 'movie')
        : allMovies.filter((m) => m.type === 'series'),
    [allMovies, tab]
  );

  const latest       = useMemo(() => [...filtered].sort((a, b) => b.year - a.year).slice(0, 12), [filtered]);
  const recentlyAdded = useMemo(() => [...filtered].sort((a, b) => b.id - a.id).slice(0, 12), [filtered]);
  const popularF     = useMemo(() => filtered.filter((m) => m.popular), [filtered]);
  const featured     = useMemo(() => filtered.filter((m) => m.featured || m.popular), [filtered]);
  const inProgress   = useMemo(() => getInProgressItems(allMovies), [allMovies]);

  if (loading) {
    return (
      <div className="page" style={{ padding: '4rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading…
      </div>
    );
  }

  return (
    <div>
      {/* ── Hero Banner (uses real featured/popular TMDB items) ── */}
      <HeroBanner items={featured.length ? featured : allMovies} />

      <AdBanner position="home_top" />
      <FilterTabs activeTab={tab} onChange={setTab} />

      {/* Continue Watching */}
      {inProgress.length > 0 && (
        <ScrollRow title={t('continue_watching')} items={inProgress} viewAllTo="/saved" />
      )}

      {/* Recently Added (live TMDB) */}
      {recentlyAdded.length > 0 && (
        <ScrollRow title={t('btn_recently_added')} items={recentlyAdded} />
      )}

      {/* 1. Epic Fantasy */}
      <CuratedRow title={HOME_SECTIONS[0].title} queries={HOME_SECTIONS[0].queries} />

      {/* 2. Action & Thriller */}
      <CuratedRow title={HOME_SECTIONS[1].title} queries={HOME_SECTIONS[1].queries} />

      {/* 3. Teen Romance */}
      <CuratedRow title={HOME_SECTIONS[2].title} queries={HOME_SECTIONS[2].queries} />

      {/* 4. K-Drama */}
      <CuratedRow title={HOME_SECTIONS[3].title} queries={HOME_SECTIONS[3].queries} />

      {/* 5. Superhero Series */}
      <CuratedRow title={HOME_SECTIONS[4].title} queries={HOME_SECTIONS[4].queries} />

      <AdBanner position="home_mid" />

      {/* 6. Sitcom */}
      <CuratedRow title={HOME_SECTIONS[5].title} queries={HOME_SECTIONS[5].queries} />

      {/* 7. Upcoming Calendar */}
      <UpcomingRow title="Upcoming Calendar" items={UPCOMING_CALENDAR} />

      {/* 8. Gangster */}
      <CuratedRow title={HOME_SECTIONS[6].title} queries={HOME_SECTIONS[6].queries} />

      {/* 9. BET+ */}
      <CuratedRow title={HOME_SECTIONS[7].title} queries={HOME_SECTIONS[7].queries} />

      {/* 10. Adult Animation */}
      <CuratedRow title={HOME_SECTIONS[8].title} queries={HOME_SECTIONS[8].queries} />

      {/* Latest from TMDB */}
      {latest.length > 0 && <ScrollRow title={t('btn_latest')} items={latest} />}

      {/* Popular from TMDB */}
      {popularF.length > 0 && <ScrollRow title={t('btn_popular')} items={popularF} />}

      {/* All content grid */}
      {filtered.length > 0 && <ContentGrid title={t('btn_all')} items={filtered} />}

      <Footer />
    </div>
  );
};

export default HomePage;
