import { type ColorSchemeName, type ColorTokens, palette } from './tokens';

export type Theme = {
  scheme: ColorSchemeName;
  colors: ColorTokens;
  shadows: {
    card: string;
    raised: string;
  };
};

function createShadows(scheme: ColorSchemeName): Theme['shadows'] {
  if (scheme === 'dark') {
    return { card: 'none', raised: '0px 8px 24px rgba(0, 0, 0, 0.45)' };
  }
  return {
    card: '0px 1px 2px rgba(27, 31, 29, 0.04), 0px 6px 16px rgba(27, 31, 29, 0.06)',
    raised: '0px 2px 4px rgba(27, 31, 29, 0.06), 0px 12px 28px rgba(27, 31, 29, 0.10)',
  };
}

export const themes: Record<ColorSchemeName, Theme> = {
  light: { scheme: 'light', colors: palette.light, shadows: createShadows('light') },
  dark: { scheme: 'dark', colors: palette.dark, shadows: createShadows('dark') },
};
