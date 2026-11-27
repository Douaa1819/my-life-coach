import { StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { fontFamilies, radius, spacing, useTheme } from '@/design';

/**
 * Daily missions and streaks are not built yet. One quiet line says so, instead of a
 * large empty card or made-up data.
 */
export function MissionsPlaceholder() {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, { borderColor: colors.primaryBorder }]}>
      <View style={[styles.badge, { backgroundColor: colors.primaryContainer }]}>
        <Icon name="check" size={18} color={colors.primary} />
      </View>
      <Text variant="bodySmall" color="onPrimaryContainer" style={styles.copy}>
        <Text variant="bodySmall" color="text" style={styles.strong}>
          Daily missions are on their way.
        </Text>{' '}
        For now, your goal is the plan.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
  strong: {
    fontFamily: fontFamilies.bold,
  },
});
