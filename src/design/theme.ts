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
  // Dark mode shows depth through lighter surfaces; only floating layers keep a shadow.
  if (scheme === 'dark') {
    return { card: 'none', raised: '0px 8px 24px rgba(0, 0, 0, 0.45)' };
  }
  return {
    card: '0px 1px 2px rgba(36, 34, 56, 0.04), 0px 4px 12px rgba(36, 34, 56, 0.05)',
    raised: '0px 2px 6px rgba(36, 34, 56, 0.06), 0px 12px 32px rgba(36, 34, 56, 0.12)',
  };
}

export const themes: Record<ColorSchemeName, Theme> = {
  light: { scheme: 'light', colors: palette.light, shadows: createShadows('light') },
  dark: { scheme: 'dark', colors: palette.dark, shadows: createShadows('dark') },
};
