import { Platform, type TextStyle } from 'react-native';

/**
 * Palette: warm paper neutrals, one growth green, one amber accent for streaks.
 * Text pairs (text / textSecondary on background and surface) meet WCAG AA (4.5:1).
 * textTertiary is for decorative or non-essential text only.
 */
const light = {
  background: '#F7F6F2',
  surface: '#FFFFFF',
  surfaceMuted: '#EFEDE7',
  border: '#E3E0D8',
  text: '#1B1F1D',
  textSecondary: '#545C57',
  textTertiary: '#858C88',
  primary: '#2F6B57',
  primaryPressed: '#245544',
  onPrimary: '#FFFFFF',
  primaryContainer: '#E2EEE8',
  onPrimaryContainer: '#163A2E',
  accent: '#B86E22',
  accentContainer: '#F6E9DA',
  onAccentContainer: '#5C3510',
  danger: '#B3261E',
  dangerContainer: '#F9DEDC',
  onDangerContainer: '#5F120D',
  ripple: 'rgba(27, 31, 29, 0.08)',
  shadow: 'rgba(27, 31, 29, 1)',
} as const;

export type ColorTokens = { [Key in keyof typeof light]: string };

const dark: ColorTokens = {
  background: '#111413',
  surface: '#1A1E1C',
  surfaceMuted: '#232826',
  border: '#2E3431',
  text: '#F1F3F1',
  textSecondary: '#AEB6B1',
  textTertiary: '#7D8581',
  primary: '#86C9AD',
  primaryPressed: '#A3D8C1',
  onPrimary: '#0D241B',
  primaryContainer: '#1D3A2F',
  onPrimaryContainer: '#CDEADC',
  accent: '#E6A866',
  accentContainer: '#3A2A18',
  onAccentContainer: '#F6DDBF',
  danger: '#F2B8B5',
  dangerContainer: '#4A1D1A',
  onDangerContainer: '#F9DEDC',
  ripple: 'rgba(241, 243, 241, 0.12)',
  shadow: 'rgba(0, 0, 0, 1)',
};

export const palette = { light, dark } as const;

export type ColorSchemeName = keyof typeof palette;

/** 4-point spacing scale. */
export const spacing = {
  none: 0,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

const fontFamily = Platform.select({ ios: 'System', android: 'sans-serif', default: undefined });

export const typography = {
  display: { fontFamily, fontSize: 32, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5 },
  title: { fontFamily, fontSize: 24, lineHeight: 32, fontWeight: '700', letterSpacing: -0.3 },
  headline: { fontFamily, fontSize: 20, lineHeight: 28, fontWeight: '600' },
  body: { fontFamily, fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontFamily, fontSize: 16, lineHeight: 24, fontWeight: '600' },
  label: { fontFamily, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontFamily, fontSize: 13, lineHeight: 18, fontWeight: '400' },
  overline: {
    fontFamily,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

export const layout = {
  screenPadding: spacing.lg,
  maxContentWidth: 640,
  /** Minimum interactive size (Material and WCAG 2.5.5). */
  minTouchTarget: 48,
} as const;

export const motion = {
  pressedOpacity: 0.88,
  pressedScale: 0.98,
} as const;
