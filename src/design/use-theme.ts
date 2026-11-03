import { themes, type Theme } from './theme';
import { useColorScheme } from './use-color-scheme';

export function useTheme(): Theme {
  return themes[useColorScheme()];
}
