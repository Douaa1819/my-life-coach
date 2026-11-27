import { type iconMap } from './icon';

/**
 * One icon family: drawn on a 24 px grid with round caps and joins and a 2.2 stroke, so
 * every icon in the app has the same weight and softness. Each entry is one path.
 */
export const iconPaths = {
  home: 'M4 11 12 4l8 7M6 10v9a1 1 0 0 0 1 1h3.5v-5h3v5H17a1 1 0 0 0 1-1v-9',
  goals: 'M6 21V4M6 5h11l-2.5 4L17 13H6',
  habits: 'M17 3l3 3-3 3M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 0 1-3 3H4',
  coach:
    'M20 12a7.5 7.5 0 0 1-11 6.6L4 20l1.4-4.4A7.5 7.5 0 1 1 20 12ZM9 12h.01M12.5 12h.01M16 12h.01',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  streak:
    'M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2.3 1.2.9 1.9 1.7 2.2C11 8.5 11 5.5 12 3Z',
  chevronRight: 'M9 5l7 7-7 7',
  chevronLeft: 'M15 5l-7 7 7 7',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8ZM18.5 16v4M16.5 18h4',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v5l3 2',
  error: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 8v5M12 16.5h.01',
  empty:
    'M4 13l2.5-7h11L20 13M4 13v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5M4 13h4.5a3.5 3.5 0 0 0 7 0H20',
  progress: 'M4 17l5-5 4 4 7-8M15 8h5v5',
  retry: 'M20 12a8 8 0 1 1-2.5-5.8M20 4v5h-5',
  settings:
    'M4 8h9M17 8h3M4 16h3M11 16h9M15 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM9 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
  mail: 'M5 6h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1ZM4 7.5l8 6 8-6',
  visible:
    'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  hidden:
    'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM4 4l16 16',
  signOut: 'M10 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M15 8l4 4-4 4M19 12H9',
  verified: 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6ZM9 12l2.2 2.2L15.5 10',
  key: 'M8 11.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM10.5 13 19 4.5M16 7.5 18.5 10M14 9.5l2 2',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 11v5.5M12 7.5h.01',
  health:
    'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z',
  career: 'M4 8h16v11H4ZM9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M4 13h16',
  learning: 'M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5ZM12 6.5v13',
  finance:
    'M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2ZM3 9l11-4v2M16 14h2',
  relationships:
    'M9 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM3 19a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.5M18 14a6 6 0 0 1 3 5',
  personal: 'M5 19C5 10 10 5 20 5c0 10-5 14-12 14ZM5 19c2-4 5-7 9-9',
} as const satisfies Record<keyof typeof iconMap, string>;
