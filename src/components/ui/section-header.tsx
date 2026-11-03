import { Pressable, StyleSheet, View } from 'react-native';

import { layout, motion, spacing, useTheme } from '@/design';

import { Text } from './text';

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function SectionHeader({ title, actionLabel, onActionPress }: SectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <Text variant="headline" role="heading">
        {title}
      </Text>
      {actionLabel && onActionPress && (
        <Pressable
          role="button"
          aria-label={`${actionLabel}: ${title}`}
          onPress={onActionPress}
          hitSlop={spacing.xs}
          style={({ pressed }) => [styles.action, pressed && { opacity: motion.pressedOpacity }]}>
          <Text variant="label" style={{ color: colors.primary }}>
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  action: {
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxs,
  },
});
