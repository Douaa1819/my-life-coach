import { type AndroidSymbol, type SFSymbol, SymbolView } from 'expo-symbols';
import { type ColorValue } from 'react-native';

/** Each icon maps to an SF Symbol (iOS) and a Material Symbol (Android and web). */
export const iconMap = {
  home: { ios: 'house', android: 'home' },
  goals: { ios: 'flag', android: 'flag' },
  habits: { ios: 'repeat', android: 'repeat' },
  coach: { ios: 'bubble.left.and.bubble.right', android: 'forum' },
  profile: { ios: 'person.crop.circle', android: 'person' },
  check: { ios: 'checkmark', android: 'check' },
  streak: { ios: 'flame', android: 'local_fire_department' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  arrowRight: { ios: 'arrow.right', android: 'arrow_forward' },
  sparkle: { ios: 'sparkles', android: 'auto_awesome' },
  clock: { ios: 'clock', android: 'schedule' },
  error: { ios: 'exclamationmark.circle', android: 'error' },
  empty: { ios: 'tray', android: 'inbox' },
  progress: { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up' },
  retry: { ios: 'arrow.clockwise', android: 'refresh' },
  settings: { ios: 'gearshape', android: 'settings' },
  mail: { ios: 'envelope', android: 'mail' },
  visible: { ios: 'eye', android: 'visibility' },
  hidden: { ios: 'eye.slash', android: 'visibility_off' },
  signOut: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' },
  verified: { ios: 'checkmark.seal', android: 'verified' },
  key: { ios: 'key', android: 'key' },
  info: { ios: 'info.circle', android: 'info' },
  chevronLeft: { ios: 'chevron.left', android: 'chevron_left' },
  health: { ios: 'heart.fill', android: 'favorite' },
  career: { ios: 'briefcase.fill', android: 'work' },
  learning: { ios: 'book.fill', android: 'menu_book' },
  finance: { ios: 'banknote.fill', android: 'payments' },
  relationships: { ios: 'person.2.fill', android: 'group' },
  personal: { ios: 'leaf.fill', android: 'spa' },
} as const satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol }>;

export type IconName = keyof typeof iconMap;

type IconProps = {
  name: IconName;
  size?: number;
  color: ColorValue;
};

/** Decorative by default: pair it with visible text or an aria-label on the parent. */
export function Icon({ name, size = 20, color }: IconProps) {
  const symbol = iconMap[name];
  return (
    <SymbolView
      name={{ ios: symbol.ios, android: symbol.android, web: symbol.android }}
      size={size}
      tintColor={color}
      aria-hidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
