import { type ReactNode } from 'react';
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { motion, radius, spacing, useTheme } from '@/design';

type CardTone = 'surface' | 'muted' | 'primary' | 'accent';

export type CardProps = {
  children: ReactNode;
  tone?: CardTone;
  padding?: keyof typeof spacing;
  style?: StyleProp<ViewStyle>;
  /** When set, the whole card becomes a single button. */
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export function Card({
  children,
  tone = 'surface',
  padding = 'lg',
  style,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: CardProps) {
  const { colors, shadows } = useTheme();

  const toneStyle: ViewStyle = {
    surface: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      boxShadow: shadows.card,
    },
    muted: { backgroundColor: colors.surfaceMuted, borderColor: 'transparent' },
    primary: { backgroundColor: colors.primaryContainer, borderColor: 'transparent' },
    accent: { backgroundColor: colors.accentContainer, borderColor: 'transparent' },
  }[tone];

  const containerStyle = [styles.base, toneStyle, { padding: spacing[padding] }, style];

  if (!onPress) {
    return <View style={containerStyle}>{children}</View>;
  }

  return (
    <Pressable
      role="button"
      aria-label={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      android_ripple={{ color: colors.ripple, foreground: true }}
      style={({ pressed }) => [containerStyle, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  pressed: {
    opacity: motion.pressedOpacity,
  },
});
