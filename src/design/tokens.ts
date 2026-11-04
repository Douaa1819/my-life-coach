import { Easing } from 'react-native-reanimated';
import { Platform, type TextStyle } from 'react-native';

/**
 * Soft Purple Playful Minimalism (docs/DESIGN_SYSTEM.md).
 * Every text token is measured at WCAG AA (4.5:1) on the surfaces it is used on.
 * `brand` (#7968E8) carries 4.24:1 with white, so it is never a text-on-fill color:
 * filled buttons use `primary` (Deep Violet). Status colors have separate text tokens.
 */
const light = {
  background: '#F8F7FC',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceMuted: '#F3F1F9',
  border: '#EAE7F3',
  borderStrong: '#8F8AA6',
  text: '#242238',
  textSecondary: '#6E6A85',
  textTertiary: '#777489',
  brand: '#7968E8',
  primary: '#5B4BC4',
  primaryPressed: '#4A3DB0',
  onPrimary: '#FFFFFF',
  primaryContainer: '#F0EDFF',
  onPrimaryContainer: '#3E3291',
  accent: '#F5B8A8',
  accentContainer: '#FDEDE8',
  onAccentContainer: '#8A4A38',
  success: '#238B69',
  successContainer: '#E3F4EC',
  successText: '#1E7A5C',
  warning: '#C8872B',
  warningContainer: '#FBF0DE',
  warningText: '#8A5A12',
  danger: '#B23A52',
  onDanger: '#FFFFFF',
  dangerIcon: '#D85B70',
  dangerContainer: '#FBE6EA',
  onDangerContainer: '#B23A52',
  focus: '#7968E8',
  scrim: 'rgba(19, 18, 32, 0.40)',
  ripple: 'rgba(91, 75, 196, 0.12)',
  shadow: 'rgba(36, 34, 56, 1)',
} as const;

export type ColorTokens = { [Key in keyof typeof light]: string };

/** Designed separately: ink canvas, depth by lightness, lighter and calmer purple. */
const dark: ColorTokens = {
  background: '#131220',
  surface: '#1C1A2C',
  surfaceRaised: '#242238',
  surfaceMuted: '#262339',
  border: '#2E2A4A',
  borderStrong: '#757190',
  text: '#F3F1FA',
  textSecondary: '#A9A5BE',
  textTertiary: '#8C88A3',
  brand: '#A99DF7',
  primary: '#A99DF7',
  primaryPressed: '#BDB3FA',
  onPrimary: '#15122E',
  primaryContainer: '#2D2754',
  onPrimaryContainer: '#E6E1FF',
  accent: '#F5B8A8',
  accentContainer: '#3A2A2E',
  onAccentContainer: '#F5B8A8',
  success: '#6FD1AE',
  successContainer: '#16302A',
  successText: '#6FD1AE',
  warning: '#EDB761',
  warningContainer: '#352A16',
  warningText: '#EDB761',
  danger: '#F2899C',
  onDanger: '#1C1A2C',
  dangerIcon: '#F2899C',
  dangerContainer: '#3A1E27',
  onDangerContainer: '#F2899C',
  focus: '#A99DF7',
  scrim: 'rgba(0, 0, 0, 0.60)',
  ripple: 'rgba(169, 157, 247, 0.16)',
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
  xxxl: 64,
} as const;

/** Nested corners stay concentric: inner radius = outer radius - padding. */
export const radius = {
  sm: 8,
  md: 12,
  button: 16,
  lg: 16,
  card: 20,
  xl: 24,
  pill: 999,
} as const;

const fontFamily = Platform.select({ ios: 'System', android: 'sans-serif', default: undefined });

/** Tracking tightens as size grows; small text gets a little extra room. */
export const typography = {
  display: { fontFamily, fontSize: 32, lineHeight: 40, fontWeight: '600', letterSpacing: -0.5 },
  title: { fontFamily, fontSize: 26, lineHeight: 32, fontWeight: '600', letterSpacing: -0.3 },
  headline: { fontFamily, fontSize: 20, lineHeight: 26, fontWeight: '600', letterSpacing: -0.1 },
  body: { fontFamily, fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontFamily, fontSize: 16, lineHeight: 24, fontWeight: '600' },
  bodySmall: { fontFamily, fontSize: 14, lineHeight: 20, fontWeight: '400', letterSpacing: 0.1 },
  label: { fontFamily, fontSize: 15, lineHeight: 20, fontWeight: '600', letterSpacing: 0.1 },
  labelLarge: { fontFamily, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  caption: { fontFamily, fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 0.2 },
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

/** Large headings stop growing at 1.5x so they keep fitting; everything else scales freely. */
export const maxFontScale: Partial<Record<TypographyVariant, number>> = {
  display: 1.5,
  title: 1.5,
};

export const layout = {
  screenPadding: spacing.lg,
  maxContentWidth: 640,
  /** Minimum interactive size (Material and WCAG 2.5.5). */
  minTouchTarget: 48,
  buttonHeight: 48,
  buttonHeightLarge: 56,
  fieldHeight: 52,
} as const;

/** docs/MOTION_GUIDELINES.md. Spring `duration` is perceptual: springs settle in about 1.5x. */
export const motion = {
  pressedScale: 0.97,
  cardPressedScale: 0.98,
  /** Text-only links have no fill to darken, so they dim instead. */
  pressedOpacity: 0.72,
  duration: {
    instant: 100,
    fast: 160,
    base: 240,
    moderate: 320,
    slow: 480,
    stagger: 50,
  },
  easing: {
    standard: Easing.bezier(0.2, 0, 0, 1),
    decelerate: Easing.bezier(0, 0, 0, 1),
    accelerate: Easing.bezier(0.3, 0, 1, 1),
  },
  spring: {
    press: { dampingRatio: 1, duration: 150 },
    default: { dampingRatio: 1, duration: 350 },
    sheet: { dampingRatio: 0.9, duration: 350 },
    momentum: { dampingRatio: 0.8, duration: 350 },
    playful: { dampingRatio: 0.6, duration: 400 },
  },
  /** Content travel for step and reveal transitions, in dp. */
  distance: {
    reveal: 8,
    step: 24,
  },
} as const;
