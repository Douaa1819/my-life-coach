import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { layout, motion, radius, spacing, type Theme, usePressFeedback, useTheme } from '@/design';

import { Icon, type IconName } from './icon';
import { Text } from './text';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'ghost' | 'destructive';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  icon?: IconName;
  /** Icon after the label, for forward actions such as "Continue". */
  trailingIcon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
};

function variantColors(variant: ButtonVariant, colors: Theme['colors']) {
  switch (variant) {
    case 'primary':
      return {
        background: colors.primary,
        pressed: colors.primaryPressed,
        foreground: colors.onPrimary,
        border: 'transparent',
      };
    case 'secondary':
      return {
        background: colors.surface,
        pressed: colors.surfaceMuted,
        foreground: colors.text,
        border: colors.border,
      };
    case 'tonal':
      return {
        background: colors.primaryContainer,
        pressed: colors.primaryContainer,
        foreground: colors.onPrimaryContainer,
        border: 'transparent',
      };
    case 'ghost':
      return {
        background: 'transparent',
        pressed: colors.primaryContainer,
        foreground: colors.primary,
        border: 'transparent',
      };
    case 'destructive':
      return {
        background: colors.danger,
        pressed: colors.danger,
        foreground: colors.onDanger,
        border: 'transparent',
      };
  }
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  trailingIcon,
  loading = false,
  disabled = false,
  fullWidth = false,
  accessibilityHint,
}: ButtonProps) {
  const { colors } = useTheme();
  const palette = variantColors(variant, colors);
  const isInactive = disabled || loading;
  const isLarge = size === 'lg';
  const press = usePressFeedback(motion.pressedScale);
  const showPressed = press.pressed && !isInactive;

  return (
    <AnimatedPressable
      role="button"
      aria-label={label}
      aria-disabled={isInactive}
      aria-busy={loading}
      accessibilityHint={accessibilityHint}
      disabled={isInactive}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      android_ripple={{ color: colors.ripple, foreground: true }}
      style={[
        styles.base,
        isLarge ? styles.large : styles.medium,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: showPressed ? palette.pressed : palette.background,
          borderColor: palette.border,
        },
        disabled && styles.disabled,
        press.animatedStyle,
      ]}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={palette.foreground} size="small" />
        ) : (
          icon && <Icon name={icon} size={20} color={palette.foreground} />
        )}
        <Text variant={isLarge ? 'labelLarge' : 'label'} style={{ color: palette.foreground }}>
          {label}
        </Text>
        {trailingIcon && !loading && (
          <Icon name={trailingIcon} size={20} color={palette.foreground} />
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.button,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  medium: {
    minHeight: layout.buttonHeight,
    paddingHorizontal: spacing.lg,
  },
  large: {
    minHeight: layout.buttonHeightLarge,
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
  disabled: {
    opacity: 0.4,
  },
});
