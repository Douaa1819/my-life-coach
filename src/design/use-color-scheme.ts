import { useColorScheme as useSystemColorScheme } from 'react-native';

import { type ColorSchemeName } from './tokens';

export function useColorScheme(): ColorSchemeName {
  return useSystemColorScheme() === 'dark' ? 'dark' : 'light';
}
