import { StyleSheet, View } from 'react-native';

import { Chip, Text } from '@/components/ui';
import { spacing } from '@/design';

type HomeHeaderProps = {
  greeting: string;
  firstName: string;
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
        {greeting}, {firstName}
      </Text>
      {streakDays > 0 && <Chip tone="accent" icon="streak" label={`${streakDays}-day streak`} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
});
