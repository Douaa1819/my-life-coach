import { type Href } from 'expo-router';

import { type IconName } from '@/components/ui';

/**
 * The typed-routes generator omits "/" when it runs on Windows (it strips
 * "/index" before normalizing backslashes), so the root href is cast once here.
 */
export const rootHref = '/' as Href;

/** Android's Material tab bar allows at most five tabs. */
export const tabRoutes = [
  { name: 'index', href: rootHref, label: 'Today', icon: 'home' },
  { name: 'goals', href: '/goals', label: 'Goals', icon: 'goals' },
  { name: 'habits', href: '/habits', label: 'Habits', icon: 'habits' },
  { name: 'coach', href: '/coach', label: 'Coach', icon: 'coach' },
  { name: 'profile', href: '/profile', label: 'Profile', icon: 'profile' },
] as const satisfies readonly {
  name: string;
  href: Href;
  label: string;
  icon: IconName;
}[];
