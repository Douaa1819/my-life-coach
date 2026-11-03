import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { layout, motion, radius, spacing, type Theme, useTheme } from '@/design';

import { Icon, type IconName } from './icon';
import { Text } from './text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
};

function variantColors(variant: ButtonVariant, colors: Theme['colors']) {
  switch (variant) {
    case 'primary':
      return { background: colors.primary, foreground: colors.onPrimary, border: colors.primary };
    case 'secondary':
      return { background: colors.surface, foreground: colors.text, border: colors.border };
    case 'ghost':
      return { background: 'transparent', foreground: colors.primary, border: 'transparent' };
  }
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  accessibilityHint,
}: ButtonProps) {
  const { colors } = useTheme();
  const palette = variantColors(variant, colors);
  const isInactive = disabled || loading;

  return (
    <Pressable
      role="button"
      aria-label={label}
      aria-disabled={isInactive}
      aria-busy={loading}
      accessibilityHint={accessibilityHint}
      disabled={isInactive}
      onPress={onPress}
      android_ripple={{ color: colors.ripple, foreground: true }}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.large : styles.medium,
        fullWidth && styles.fullWidth,
        { backgroundColor: palette.background, borderColor: palette.border },
        pressed && !isInactive && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={palette.foreground} size="small" />
        ) : (
          icon && <Icon name={icon} size={18} color={palette.foreground} />
        )}
        <Text variant="label" style={{ color: palette.foreground }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  medium: {
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.lg,
  },
  large: {
    minHeight: 56,
    paddingHorizontal: spacing.xl,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pressed: {
    opacity: motion.pressedOpacity,
    transform: [{ scale: motion.pressedScale }],
  },
  disabled: {
    opacity: 0.5,
  },
});
