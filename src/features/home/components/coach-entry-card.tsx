import { StyleSheet, View } from 'react-native';

import { Button, Card, Icon, Text } from '@/components/ui';
import { radius, spacing, useTheme } from '@/design';

type CoachEntryCardProps = {
  suggestion: string;
  onOpenCoach: () => void;
};

export function CoachEntryCard({ suggestion, onOpenCoach }: CoachEntryCardProps) {
  const { colors } = useTheme();

  return (
    <Card tone="primary">
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Icon name="sparkle" size={18} color={colors.onPrimary} />
        </View>
        <Text variant="label" style={{ color: colors.onPrimaryContainer }}>
          Your coach
        </Text>
      </View>
      <Text variant="headline" style={[styles.suggestion, { color: colors.onPrimaryContainer }]}>
        {suggestion}
      </Text>
      <Button label="Talk it through" icon="coach" onPress={onOpenCoach} />
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestion: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
});
