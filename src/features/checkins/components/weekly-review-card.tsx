import { StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { spacing } from '@/design';

import { useDecideAdjustment, useWeeklyReview } from '../use-checkins';

/**
 * Last week, in plain words, and one suggestion the person can take or leave. It appears only
 * when there is an open suggestion; declining is a normal answer and changes nothing else.
 */
export function WeeklyReviewCard() {
  const weekly = useWeeklyReview();
  const decide = useDecideAdjustment();

  const adjustment = weekly.data?.adjustment;
  const review = weekly.data?.review;
  if (!adjustment || adjustment.status !== 'proposed' || !review) return null;

  return (
    <Card tone="accent">
      <View style={styles.stack}>
        <Text variant="headline" role="heading">
          Looking back at last week
        </Text>
        <Text variant="bodySmall" color="textSecondary">
          {review.completed} of {review.planned} steps done.
        </Text>
        <Text>{adjustment.reason}</Text>
        <View style={styles.row}>
          <Button
            label="Sounds good"
            variant="tonal"
            onPress={() => decide.mutate({ id: adjustment.id, accept: true })}
            loading={decide.isPending}
          />
          <Button
            label="No thanks"
            variant="ghost"
            onPress={() => decide.mutate({ id: adjustment.id, accept: false })}
            disabled={decide.isPending}
          />
        </View>
        {decide.isError && (
          <Text variant="caption" color="textSecondary">
            That didn&apos;t go through. Please try again.
          </Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
