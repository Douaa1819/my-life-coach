import { Children, memo, type ReactNode, useEffect } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import {
  fadeTo,
  layout,
  motion,
  radius,
  spacing,
  springTo,
  useMotionPreference,
  usePressScale,
  useTheme,
} from '@/design';

import { Icon, type IconName } from './icon';
import { Text } from './text';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type SelectionMode = 'single' | 'multiple';

export type SelectionCardProps = {
  title: string;
  description?: string;
  icon?: IconName;
  selected: boolean;
  onPress: () => void;
  /** Single choice shows a radio, multiple choice a checkbox. */
  mode: SelectionMode;
  /** `tile` is the compact grid variant for short labels with an icon (focus areas). */
  variant?: 'row' | 'tile';
  disabled?: boolean;
  accessibilityHint?: string;
};

const INDICATOR_SIZE = 24;
const BADGE_SIZE = 40;

function SelectionCardView({
  title,
  description,
  icon,
  selected,
  onPress,
  mode,
  variant = 'row',
  disabled = false,
  accessibilityHint,
}: SelectionCardProps) {
  const { colors } = useTheme();
  const { reduceMotion } = useMotionPreference();
  const press = usePressScale(motion.cardPressedScale);

  const selection = useSharedValue(selected ? 1 : 0);
  const mark = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    const to = selected ? 1 : 0;
    selection.set(fadeTo(to, 'fast'));
    // The radio dot pops (playful); the check appears with the fill (fast).
    if (reduceMotion) mark.set(to);
    else mark.set(mode === 'single' && selected ? springTo(1, 'playful') : fadeTo(to, 'fast'));
  }, [selected, mode, reduceMotion, selection, mark]);

  const selectedLayerStyle = useAnimatedStyle(() => ({ opacity: selection.get() }));
  const markStyle = useAnimatedStyle(() => {
    const value = mark.get();
    return mode === 'single'
      ? { transform: [{ scale: value }] }
      : { opacity: Math.min(value, 1), transform: [{ scale: 0.6 + 0.4 * value }] };
  });

  const isTile = variant === 'tile';
  const label = description ? `${title}, ${description}` : title;

  return (
    <AnimatedPressable
      role={mode === 'single' ? 'radio' : 'checkbox'}
      aria-checked={selected}
      aria-disabled={disabled}
      aria-label={label}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      android_ripple={{ color: colors.ripple, foreground: true }}
      style={[
        styles.card,
        isTile ? styles.tile : styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border },
        disabled && styles.disabled,
        press.animatedStyle,
      ]}>
      {/* Selected look on its own layer, so border width and fill fade without a layout shift. */}
      <Animated.View
        testID="selection-card-selected-layer"
        pointerEvents="none"
        style={[
          styles.selectedLayer,
          { backgroundColor: colors.primaryContainer, borderColor: colors.brand },
          selectedLayerStyle,
        ]}
      />

      {icon && (
        <View
          style={[
            styles.badge,
            { backgroundColor: selected ? colors.surface : colors.primaryContainer },
          ]}>
          <Icon name={icon} size={20} color={colors.brand} />
        </View>
      )}

      <View style={[styles.copy, isTile && styles.tileCopy]}>
        <Text variant="bodyStrong">{title}</Text>
        {description && (
          <Text variant="bodySmall" color="textSecondary">
            {description}
          </Text>
        )}
      </View>

      <View style={isTile ? styles.tileIndicator : undefined}>
        {mode === 'single' ? (
          <View
            style={[
              styles.indicator,
              styles.radio,
              { borderColor: selected ? colors.primary : colors.borderStrong },
            ]}>
            <Animated.View
              testID="selection-card-mark"
              style={[styles.radioDot, { backgroundColor: colors.primary }, markStyle]}
            />
          </View>
        ) : (
          <View
            style={[
              styles.indicator,
              styles.checkbox,
              {
                borderColor: selected ? colors.primary : colors.borderStrong,
                backgroundColor: selected ? colors.primary : 'transparent',
              },
            ]}>
            <Animated.View testID="selection-card-mark" style={markStyle}>
              <Icon name="check" size={16} color={colors.onPrimary} />
            </Animated.View>
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

export const SelectionCard = memo(SelectionCardView);

type SelectionGroupProps = {
  /** Read by screen readers when entering the group; usually the question title. */
  label: string;
  mode: SelectionMode;
  children: ReactNode;
  /** Two columns for tiles; falls back to one above 130 % font scale. */
  columns?: 1 | 2;
};

/** Above this font scale, two-column grids no longer fit their labels. */
export const GRID_MAX_FONT_SCALE = 1.3;

export function SelectionGroup({ label, mode, children, columns = 1 }: SelectionGroupProps) {
  const { fontScale } = useWindowDimensions();
  const items = Children.toArray(children);
  const columnCount = columns === 2 && fontScale <= GRID_MAX_FONT_SCALE ? 2 : 1;

  const rows: ReactNode[][] = [];
  for (let index = 0; index < items.length; index += columnCount) {
    rows.push(items.slice(index, index + columnCount));
  }

  return (
    <View role={mode === 'single' ? 'radiogroup' : 'group'} aria-label={label} style={styles.group}>
      {columnCount === 1
        ? items
        : rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map((item, cellIndex) => (
                <View key={cellIndex} style={styles.gridCell}>
                  {item}
                </View>
              ))}
              {row.length < columnCount && <View style={styles.gridCell} />}
            </View>
          ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 64,
    minWidth: layout.minTouchTarget,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tile: {
    flex: 1,
    gap: spacing.sm,
  },
  selectedLayer: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: radius.lg,
    borderWidth: 2,
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  tileCopy: {
    flex: 0,
  },
  tileIndicator: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  indicator: {
    width: INDICATOR_SIZE,
    height: INDICATOR_SIZE,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radio: {
    borderRadius: radius.pill,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
  },
  checkbox: {
    borderRadius: radius.sm,
  },
  disabled: {
    opacity: 0.4,
  },
  group: {
    gap: spacing.sm,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  gridCell: {
    flex: 1,
    minWidth: 0,
  },
});
