import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  layout,
  motion,
  radius,
  spacing,
  type Theme,
  useMotionPreference,
  usePressFeedback,
  useTheme,
} from '@/design';

import { Icon, type IconName } from './icon';
import { Text } from './text';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Height of the solid base under a pressable button. */
const EDGE = 4;

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

/** `edge` is the solid base under a pressable button; variants without one press by scaling. */
function variantColors(variant: ButtonVariant, colors: Theme['colors']) {
  switch (variant) {
    case 'primary':
      return {
        background: colors.primary,
        pressed: colors.primaryPressed,
        foreground: colors.onPrimary,
        border: 'transparent',
        edge: colors.primaryEdge,
      };
    case 'secondary':
      return {
        background: colors.surface,
        pressed: colors.surfaceMuted,
        foreground: colors.primary,
        border: colors.border,
        edge: colors.border,
      };
    case 'tonal':
      return {
        background: colors.primaryContainer,
        pressed: colors.primaryContainer,
        foreground: colors.onPrimaryContainer,
        border: 'transparent',
        edge: undefined,
      };
    case 'ghost':
      return {
        background: 'transparent',
        pressed: colors.primaryContainer,
        foreground: colors.primary,
        border: 'transparent',
        edge: undefined,
      };
    case 'destructive':
      return {
        background: colors.danger,
        pressed: colors.danger,
        foreground: colors.onDanger,
        border: 'transparent',
        edge: colors.dangerEdge,
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
  const { reduceMotion } = useMotionPreference();
  const edge = palette.edge;
  // Edged buttons press down into their base instead of scaling.
  const press = usePressFeedback(edge ? 1 : motion.pressedScale);
  const showPressed = press.pressed && !isInactive;
  const edgeStyle = edge
    ? showPressed && !reduceMotion
      ? { borderBottomWidth: 0, marginTop: EDGE }
      : {
          borderBottomWidth: EDGE,
          borderBottomColor: showPressed ? palette.pressed : edge,
        }
    : undefined;

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
        edgeStyle,
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
    borderWidth: 2,
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
