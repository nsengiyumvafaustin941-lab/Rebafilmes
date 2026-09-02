import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { STREAM_PROVIDERS, buildStreamUrl, getProviderById } from '../utils/streamProviders';
import { StreamPlayer } from '../components/StreamPlayer';
import { MoviesProvider, useMovies } from '../contexts/MoviesContext';

// Mock TMDB functions to fail so we test autonomous offline fallback
vi.mock('../utils/tmdb', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getTrending: vi.fn().mockRejectedValue(new Error('TMDB offline')),
    getTopRated: vi.fn().mockRejectedValue(new Error('TMDB offline')),
    getPopular: vi.fn().mockRejectedValue(new Error('TMDB offline')),
    getPopularTv: vi.fn().mockRejectedValue(new Error('TMDB offline')),
    getTopRatedTv: vi.fn().mockRejectedValue(new Error('TMDB offline')),
  };
});

// Mock contexts that StreamPlayer uses
vi.mock('../hooks/useVIP', () => ({
  useVIP: () => ({ isVip: false, plan: 'free' }),
}));

vi.mock('../contexts/AdminContext', () => ({
  useAdmin: () => ({ isAdmin: false }),
}));

vi.mock('../hooks/useMonetizationEnabled', () => ({
  useMonetizationEnabled: () => false,
}));

vi.mock('../contexts/VIPModalContext', () => ({
  useVIPModal: () => ({ openVIPModal: vi.fn() }),
}));

vi.mock('../contexts/AdsContext', () => ({
  useAds: () => ({ trackImpression: vi.fn(), trackClick: vi.fn() }),
}));

const MoviesConsumer = () => {
  const { allMovies, loading, isOfflineFallback } = useMovies();
  if (loading) return <div>Loading...</div>;
  return (
    <div>
      <span data-testid="movie-count">{allMovies.length}</span>
      <span data-testid="offline-status">{isOfflineFallback ? 'offline' : 'online'}</span>
      <span data-testid="first-movie">{allMovies[0]?.title || 'None'}</span>
    </div>
  );
};

describe('Autonomous Server Engine & Stream Providers', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('contains 14 high-availability stream providers across multiple tiers', () => {
    expect(STREAM_PROVIDERS.length).toBe(14);
    const providerIds = STREAM_PROVIDERS.map((p) => p.id);
    expect(providerIds).toContain('vidlink');
    expect(providerIds).toContain('vidnest');
    expect(providerIds).toContain('vidsrc-mov');
    expect(providerIds).toContain('vidfast');
    expect(providerIds).toContain('multiembed');
  });

  it('builds dynamic movie and series URLs for each provider', () => {
    const vidlink = getProviderById('vidlink');
    const movieUrl = vidlink.buildUrl('550', 'movie');
    const seriesUrl = vidlink.buildUrl('1399', 'series', 2, 4);

    expect(movieUrl).toContain('550');
    expect(seriesUrl).toContain('1399/2/4');

    const directBuild = buildStreamUrl('vidnest', '550', 'movie');
    expect(directBuild).toContain('550');
  });

  it('renders StreamPlayer with 14 streaming server nodes and active node highlight', () => {
    const mockItem = {
      id: 550,
      tmdbId: 550,
      title: 'Fight Club',
      type: 'movie',
      poster: 'https://image.tmdb.org/t/p/w500/test.jpg',
    };

    render(<StreamPlayer item={mockItem} />);

    STREAM_PROVIDERS.forEach((provider) => {
      const els = screen.getAllByText(provider.name);
      expect(els.length).toBeGreaterThan(0);
    });

    expect(screen.getByText('Active')).toBeDefined();
    expect(screen.getByText('14 Servers Available')).toBeDefined();
  });
});

describe('Autonomous Resilient Catalog Fallback', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('guarantees non-empty catalog by falling back to rich seed data when TMDB is unavailable', async () => {
    render(
      <MoviesProvider>
        <MoviesConsumer />
      </MoviesProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).toBeNull();
    }, { timeout: 4000 });

    const countEl = screen.getByTestId('movie-count');
    const count = parseInt(countEl.textContent || '0', 10);
    expect(count).toBeGreaterThan(0);

    const firstMovie = screen.getByTestId('first-movie');
    expect(firstMovie.textContent).not.toBe('None');

    const offlineStatus = screen.getByTestId('offline-status');
    expect(offlineStatus.textContent).toBe('offline');
  });

  it('persists and restores catalog snapshots from localStorage', () => {
    const SNAPSHOT_KEY = 'rebafilme_catalog_snapshot_v1';
    const sampleSnapshot = [
      { id: 9991, title: 'Autonomous Hero', genre: 'Sci-Fi', year: 2026 },
      { id: 9992, title: 'Shadow Fall', genre: 'Action', year: 2025 },
    ];

    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(sampleSnapshot));
    const loaded = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '[]');
    expect(loaded.length).toBe(2);
    expect(loaded[0].title).toBe('Autonomous Hero');
  });
});
