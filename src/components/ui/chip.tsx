import { StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '@/design';

import { Icon, type IconName } from './icon';
import { Text } from './text';

type ChipProps = {
  label: string;
  tone?: 'neutral' | 'primary' | 'accent' | 'success' | 'warning';
  icon?: IconName;
};

export function Chip({ label, tone = 'neutral', icon }: ChipProps) {
  const { colors } = useTheme();
  const palette = {
    neutral: { background: colors.surfaceMuted, foreground: colors.textSecondary },
    primary: { background: colors.primaryContainer, foreground: colors.onPrimaryContainer },
    accent: { background: colors.accentContainer, foreground: colors.onAccentContainer },
    success: { background: colors.successContainer, foreground: colors.successText },
    warning: { background: colors.warningContainer, foreground: colors.warningText },
  }[tone];

  return (
    <View style={[styles.chip, { backgroundColor: palette.background }]}>
      {icon && <Icon name={icon} size={16} color={palette.foreground} />}
      <Text variant="bodySmall" style={[styles.label, { color: palette.foreground }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xxs,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
  label: {
    fontWeight: '600',
  },
});
