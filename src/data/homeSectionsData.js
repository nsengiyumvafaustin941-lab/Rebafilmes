/**
 * Curated home-page sections.
 *
 * Each item stores only a `tmdbQuery` (search title) plus minimal metadata.
 * At render time the CuratedRow component searches TMDB by title and fills in
 * the real poster, backdrop, genre, year, etc. — so no hardcoded image URLs.
 */

export const HOME_SECTIONS = [
  {
    id: 'epic-fantasy',
    title: 'Epic Fantasy',
    queries: [
      'Game of Thrones',
      'House of the Dragon',
      'The Lord of the Rings: The Rings of Power',
      'The Witcher',
      'Wheel of Time',
      'Dune: Prophecy',
      'The Sandman',
      'Shadow and Bone',
    ],
  },
  {
    id: 'action-thriller',
    title: 'Action & Thriller',
    queries: [
      'The Day of the Jackal',
      'Citadel',
      'The Night Agent',
      'Reacher',
      'Jack Ryan',
      'The Recruit',
      'Trigger Warning',
      'Extraction',
    ],
  },
  {
    id: 'teen-romance',
    title: 'Teen Romance',
    queries: [
      'Euphoria',
      'XO Kitty',
      'Heartbreak High',
      'The Summer I Turned Pretty',
      'Never Have I Ever',
      'Outer Banks',
      'Elite',
      'Ginny and Georgia',
    ],
  },
  {
    id: 'k-drama',
    title: 'K-Drama',
    queries: [
      'Squid Game',
      'All of Us Are Dead',
      'Vincenzo',
      'My Name',
      'Crash Landing on You',
      'Itaewon Class',
      'Sweet Home',
      'Alchemy of Souls',
    ],
  },
  {
    id: 'superhero-series',
    title: 'Superhero Series',
    queries: [
      'The Boys',
      'Invincible',
      'Peacemaker',
      'Daredevil Born Again',
      'Loki',
      'The Falcon and the Winter Soldier',
      'Moon Knight',
      'Agatha All Along',
    ],
  },
  {
    id: 'sitcom',
    title: 'Sitcom',
    queries: [
      'Friends',
      'The Big Bang Theory',
      'Modern Family',
      'Shameless',
      'Young Sheldon',
      'Seinfeld',
      'Brooklyn Nine-Nine',
      'The Office',
    ],
  },
  {
    id: 'gangster',
    title: 'Gangster',
    queries: [
      'Snowfall',
      'Peaky Blinders',
      'Power',
      'Tulsa King',
      'The Sopranos',
      'Narcos',
      'Ozark',
      'Breaking Bad',
    ],
  },
  {
    id: 'bet-plus',
    title: 'BET+',
    queries: [
      'Sistas',
      'The Oval',
      'Zatima',
      'Ruthless',
      'All the Queens Men',
      'The Family Business',
      'Tyler Perry Bruh',
      'BMF',
    ],
  },
  {
    id: 'adult-animation',
    title: 'Adult Animation',
    queries: [
      'X-Men 97',
      'Rick and Morty',
      'Invincible',
      'Arcane',
      'Castlevania',
      'Inside Job',
      'Big Mouth',
      'Love Death and Robots',
    ],
  },
];

export const UPCOMING_CALENDAR = [
  { id: 'up-1', title: 'Chilling Romance',                  date: 'Jul 18', booked: 16953, query: 'Chilling Romance' },
  { id: 'up-2', title: 'Scary Movie',                       date: 'Jul 21', booked: 17273, query: 'Scary Movie' },
  { id: 'up-3', title: 'The Death of Robin Hood',           date: 'Jul 21', booked: 24188, query: 'The Death of Robin Hood' },
  { id: 'up-4', title: 'A Shop for Killers',                date: 'Jul 22', booked: 28135, query: 'A Shop for Killers' },
  { id: 'up-5', title: 'Star Trek: Strange New Worlds',     date: 'Jul 23', booked: 21064, query: 'Star Trek Strange New Worlds' },
  { id: 'up-6', title: 'Stuart Fails to Save the Universe', date: 'Jul 23', booked: 5039,  query: 'Stuart Fails to Save the Universe' },
  { id: 'up-7', title: 'Gone',                              date: 'Jul 23', booked: 6849,  query: 'Gone 2024' },
  { id: 'up-8', title: 'Arafta',                            date: 'Jul 23', booked: 7773,  query: 'Arafta' },
];
