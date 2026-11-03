import { useSyncExternalStore } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { type ColorSchemeName } from './tokens';

function subscribe() {
  return () => {};
}

/**
 * Static web rendering has no system color scheme, so the server snapshot
 * stays on light until the client has hydrated.
 */
export function useColorScheme(): ColorSchemeName {
  const hasHydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const systemScheme = useSystemColorScheme();

  return hasHydrated && systemScheme === 'dark' ? 'dark' : 'light';
}
