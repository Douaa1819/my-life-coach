import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from './text';
import { fontFamilies, layout, radius, spacing, useTheme } from '@/design';

type PillGroupProps<Value extends string | number> = {
  label: string;
  options: readonly { value: Value; label: string }[];
  selected: Value;
  onSelect: (value: Value) => void;
};

/** A small single-choice group. Each pill is a radio with a visible selected state. */
export function PillGroup<Value extends string | number>({
  label,
  options,
  selected,
  onSelect,
}: PillGroupProps<Value>) {
  const { colors } = useTheme();

  return (
    <View style={styles.group} role="radiogroup" aria-label={label}>
      <Text variant="label">{label}</Text>
      <View style={styles.row}>
        {options.map((option) => {
          const isSelected = option.value === selected;
          return (
            <Pressable
              key={String(option.value)}
              role="radio"
              aria-checked={isSelected}
              aria-label={option.label}
              onPress={() => onSelect(option.value)}
              style={[
                styles.pill,
                {
                  backgroundColor: isSelected ? colors.primaryContainer : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.borderStrong,
                },
              ]}>
              <Text
                variant="bodySmall"
                style={{
                  color: isSelected ? colors.onPrimaryContainer : colors.textSecondary,
                  fontFamily: isSelected ? fontFamilies.bold : fontFamilies.medium,
                }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pill: {
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 2,
    borderRadius: radius.pill,
  },
});
