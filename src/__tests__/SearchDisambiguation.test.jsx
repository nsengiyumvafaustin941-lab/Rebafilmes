import { describe, it, expect, vi, beforeEach } from 'vitest';
import { moviePath, parseMovieId, parseMovieSlugTitle, getMovieOrTv } from '../utils/tmdb';

describe('Search and Media Type Disambiguation Engine', () => {
  it('correctly appends ?type=series to moviePath for series while keeping movies clean', () => {
    const seriesUrl = moviePath(1396, 'Breaking Bad', 'series');
    expect(seriesUrl).toBe('/movie/breaking-bad-1396?type=series');

    const tvUrl = moviePath(1396, 'Breaking Bad', 'tv');
    expect(tvUrl).toBe('/movie/breaking-bad-1396?type=series');

    const movieUrl = moviePath(1396, 'The Thin Red Line', 'movie');
    expect(movieUrl).toBe('/movie/the-thin-red-line-1396');

    const defaultUrl = moviePath(1396, 'The Thin Red Line');
    expect(defaultUrl).toBe('/movie/the-thin-red-line-1396');
  });

  it('accurately parses numeric ID even when query strings or slugs are attached', () => {
    expect(parseMovieId('breaking-bad-1396?type=series')).toBe(1396);
    expect(parseMovieId('squid-game-93405')).toBe(93405);
    expect(parseMovieId('1396')).toBe(1396);
    expect(parseMovieId(1396)).toBe(1396);
    expect(parseMovieId('avatar-19995#watch')).toBe(19995);
  });

  it('extracts slug title accurately for fuzzy disambiguation', () => {
    expect(parseMovieSlugTitle('breaking-bad-1396?type=series')).toBe('breaking bad');
    expect(parseMovieSlugTitle('the-thin-red-line-1396')).toBe('the thin red line');
    expect(parseMovieSlugTitle('loki-84958')).toBe('loki');
  });

  it('honors hintedType when fetching movie or tv show', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      const urlStr = String(url);
      if (urlStr.includes('/tv/1396')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 1396,
            name: 'Breaking Bad',
            media_type: 'tv',
            overview: 'Chemistry teacher turns kingpin',
            seasons: [{ season_number: 1, name: 'Season 1' }],
          }),
        });
      }
      if (urlStr.includes('/movie/1396')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 1396,
            title: 'The Thin Red Line',
            media_type: 'movie',
            overview: 'WWII Guadalcanal drama',
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    });

    const series = await getMovieOrTv(1396, 'series');
    expect(series).toBeDefined();
    expect(series.type).toBe('series');
    expect(series.title).toBe('Breaking Bad');

    const movie = await getMovieOrTv(1396, 'movie');
    expect(movie).toBeDefined();
    expect(movie.type).toBe('movie');
    expect(movie.title).toBe('The Thin Red Line');
  });

  it('disambiguates between overlapping movie and tv IDs using the slug title', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      const urlStr = String(url);
      if (urlStr.includes('/tv/1396')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 1396,
            name: 'Breaking Bad',
            media_type: 'tv',
            popularity: 90,
            vote_average: 8.9,
          }),
        });
      }
      if (urlStr.includes('/movie/1396')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 1396,
            title: 'The Thin Red Line',
            media_type: 'movie',
            popularity: 20,
            vote_average: 7.4,
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    });

    // When someone searches Breaking Bad and clicks /movie/breaking-bad-1396 (without ?type=series)
    const resultFromTvSlug = await getMovieOrTv('breaking-bad-1396');
    expect(resultFromTvSlug.type).toBe('series');
    expect(resultFromTvSlug.title).toBe('Breaking Bad');

    // When someone clicks /movie/the-thin-red-line-1396
    const resultFromMovieSlug = await getMovieOrTv('the-thin-red-line-1396');
    expect(resultFromMovieSlug.type).toBe('movie');
    expect(resultFromMovieSlug.title).toBe('The Thin Red Line');
  });
});
