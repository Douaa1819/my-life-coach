import { type ReactNode } from 'react';
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { motion, radius, spacing, usePressFeedback, useTheme } from '@/design';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type CardTone = 'surface' | 'muted' | 'primary' | 'accent';

/** Default card padding: between `md` and `lg`, per the design system. */
const DEFAULT_PADDING = 20;

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
  padding,
  style,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: CardProps) {
  const { colors, shadows } = useTheme();
  const press = usePressFeedback(motion.cardPressedScale);

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

  const containerStyle: StyleProp<ViewStyle>[] = [
    styles.base,
    toneStyle,
    { padding: padding ? spacing[padding] : DEFAULT_PADDING },
  ];
  if (style) containerStyle.push(style);

  if (!onPress) {
    return <View style={containerStyle}>{children}</View>;
  }

  return (
    <AnimatedPressable
      role="button"
      aria-label={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      android_ripple={{ color: colors.ripple, foreground: true }}
      style={[containerStyle, press.animatedStyle]}>
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
