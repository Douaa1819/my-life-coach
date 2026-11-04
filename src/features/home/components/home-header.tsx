import { StyleSheet, View } from 'react-native';

import { Chip, Text } from '@/components/ui';
import { spacing } from '@/design';

type HomeHeaderProps = {
  greeting: string;
  /** Null while the profile loads or if it cannot be read. */
  firstName: string | null;
  dateLabel: string;
  streakDays: number;
};

export function HomeHeader({ greeting, firstName, dateLabel, streakDays }: HomeHeaderProps) {
  return (
    <View style={styles.container}>
      <Text variant="overline" color="textSecondary">
        {dateLabel}
      </Text>
      <Text variant="display" role="heading">
        {firstName ? `${greeting}, ${firstName}` : greeting}
      </Text>
      {streakDays > 0 && <Chip tone="warning" icon="streak" label={`${streakDays}-day streak`} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
});
