import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Flame,
  Zap,
  Ghost,
  Rocket,
  Sparkles,
  Smile,
  Heart,
  Globe,
  Trophy,
  Clapperboard,
  Shield,
  Compass,
} from "lucide-react";
import HeroBanner from "../components/HeroBanner";
import FilterTabs from "../components/FilterTabs";
import Top10Row from "../components/Top10Row";
import ScrollRow from "../components/ScrollRow";
import CuratedRow from "../components/CuratedRow";
import ContentGrid from "../components/ContentGrid";
import AdBanner from "../components/AdBanner";
import Footer from "../components/Footer";
import UpcomingRow from "../components/UpcomingRow";
import { useMovies } from "../contexts/MoviesContext";
import { useLanguage } from "../contexts/LanguageContext";
import { HOME_SECTIONS } from "../data/homeSectionsData";
import { PROGRESS_KEY } from "../utils/constants";

/* ─── Quick-Access Discovery Chips ─────────────────── */
const QUICK_CHIPS = [
  { icon: Flame, label: 'Trending Now', to: '/search?sort=popularity.desc' },
  { icon: Zap, label: 'Action', to: '/search?genre=28' },
  { icon: Ghost, label: 'Horror', to: '/search?genre=27' },
  { icon: Rocket, label: 'Sci-Fi', to: '/search?genre=878' },
  { icon: Sparkles, label: 'Drama', to: '/search?genre=18' },
  { icon: Smile, label: 'Comedy', to: '/search?genre=35' },
  { icon: Heart, label: 'Romance', to: '/search?genre=10749' },
  { icon: Globe, label: 'K-Drama', to: '/search?q=korean&type=series' },
  { icon: Trophy, label: 'Top Rated', to: '/search?sort=vote_average.desc' },
  { icon: Clapperboard, label: 'Documentary', to: '/search?genre=99' },
  { icon: Shield, label: 'War', to: '/search?genre=10752' },
  { icon: Compass, label: 'Western', to: '/search?genre=37' },
];

/* ─── Read localStorage progress ─────────────────── */
const getInProgressItems = (allMovies) => {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return [];
    const progress = JSON.parse(raw);
    return allMovies
      .filter(
        (c) =>
          progress[c.id] &&
          progress[c.id].percent > 1 &&
          progress[c.id].percent < 98,
      )
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
          ? allMovies.filter((m) => m.type === "movie")
          : allMovies.filter((m) => m.type === "series"),
    [allMovies, tab],
  );

  const latest = useMemo(
    () => [...filtered].sort((a, b) => b.year - a.year).slice(0, 24),
    [filtered],
  );
  const recentlyAdded = useMemo(
    () => [...filtered].sort((a, b) => b.id - a.id).slice(0, 24),
    [filtered],
  );
  const popularF = useMemo(() => filtered.filter((m) => m.popular).slice(0, 24), [filtered]);
  const featured = useMemo(
    () => filtered.filter((m) => m.featured || m.popular),
    [filtered],
  );
  const inProgress = useMemo(() => getInProgressItems(allMovies), [allMovies]);

  if (loading) {
    return (
      <div
        className="page"
        style={{
          padding: "4rem 1.5rem",
          textAlign: "center",
          color: "var(--text-secondary)",
        }}
      >
        Loading…
      </div>
    );
  }

  return (
    <div className="home-page page">
      <div className="bg-logo-pattern" />
      {/* ── Hero Banner (uses real featured/popular TMDB items) ── */}
      <HeroBanner items={featured.length ? featured : allMovies} />

      <AdBanner position="home_top" />
      <FilterTabs activeTab={tab} onChange={setTab} />

      {/* ── Quick-Access Genre/Discovery Chips ── */}
      <div className="quick-chips">
        {QUICK_CHIPS.map((chip) => {
          const Icon = chip.icon;
          return (
            <Link key={chip.to} to={chip.to} className="quick-chip">
              <Icon size={16} className="quick-chip-icon-3d" />
              <span className="quick-chip-label">{chip.label}</span>
            </Link>
          );
        })}
      </div>

      {/* ── Top 10 Billboard Row ── */}
      <Top10Row />

      {/* Continue Watching */}
      {inProgress.length > 0 && (
        <ScrollRow
          title={t("continue_watching")}
          items={inProgress}
          viewAllTo="/saved"
        />
      )}

      {/* Recently Added (live TMDB) */}
      {recentlyAdded.length > 0 && (
        <ScrollRow title={t("btn_recently_added")} items={recentlyAdded} />
      )}

      {/* 1. Epic Fantasy */}
      <CuratedRow
        title={HOME_SECTIONS[0].title}
        queries={HOME_SECTIONS[0].queries}
      />

      {/* 2. Action & Thriller */}
      <CuratedRow
        title={HOME_SECTIONS[1].title}
        queries={HOME_SECTIONS[1].queries}
      />

      {/* 3. Teen Romance */}
      <CuratedRow
        title={HOME_SECTIONS[2].title}
        queries={HOME_SECTIONS[2].queries}
      />

      {/* 4. K-Drama */}
      <CuratedRow
        title={HOME_SECTIONS[3].title}
        queries={HOME_SECTIONS[3].queries}
      />

      {/* 5. Superhero Series */}
      <CuratedRow
        title={HOME_SECTIONS[4].title}
        queries={HOME_SECTIONS[4].queries}
      />

      <AdBanner position="home_mid" />

      {/* 6. Sitcom */}
      <CuratedRow
        title={HOME_SECTIONS[5].title}
        queries={HOME_SECTIONS[5].queries}
      />

      {/* 7. Upcoming Calendar */}
      <UpcomingRow title="Upcoming Calendar" />

      {/* 8. Gangster */}
      <CuratedRow
        title={HOME_SECTIONS[6].title}
        queries={HOME_SECTIONS[6].queries}
      />

      {/* 9. BET+ */}
      <CuratedRow
        title={HOME_SECTIONS[7].title}
        queries={HOME_SECTIONS[7].queries}
      />

      {/* 10. Adult Animation */}
      <CuratedRow
        title={HOME_SECTIONS[8].title}
        queries={HOME_SECTIONS[8].queries}
      />

      {/* Latest from TMDB */}
      {latest.length > 0 && (
        <ScrollRow title={t("btn_latest")} items={latest} />
      )}

      {/* Popular from TMDB */}
      {popularF.length > 0 && (
        <ScrollRow title={t("btn_popular")} items={popularF} />
      )}

      {/* All content grid */}
      {filtered.length > 0 && (
        <ContentGrid title={t("btn_all")} items={filtered} />
      )}

      <Footer />
    </div>
  );
};

export default HomePage;
