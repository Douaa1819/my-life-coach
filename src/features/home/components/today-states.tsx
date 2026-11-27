import { StyleSheet, View } from 'react-native';

import { Pebble } from '@/components/brand';
import { Button, Card, Icon, Skeleton, Text } from '@/components/ui';
import { radius, spacing, useTheme } from '@/design';

/** First day: no goals yet. Pebble leans in, one clear action. */
export function TodayEmpty({ onAdd }: { onAdd: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.blob, { backgroundColor: colors.primaryContainer }]}>
        <Pebble size={164} mood="encourage" accessibilityLabel="Pebble, leaning forward" />
      </View>
      <View style={styles.copy}>
        <Text variant="title" align="center" role="heading">
          What is one goal you would love to reach?
        </Text>
        <Text color="textSecondary" align="center">
          Big or small, both count. Start with one and take the first step together.
        </Text>
      </View>
      <Button label="Add your first goal" size="lg" fullWidth onPress={onAdd} />
    </View>
  );
}

/** Goals could not be loaded. An icon, not Pebble: errors should not ask anyone to cheer up. */
export function TodayError({ onRetry }: { onRetry: () => void }) {
  const { colors } = useTheme();
  return (
    <Card>
      <View style={styles.error} role="alert">
        <View style={[styles.errorBadge, { backgroundColor: colors.dangerContainer }]}>
          <Icon name="error" size={30} color={colors.dangerIcon} />
        </View>
        <View style={styles.copy}>
          <Text variant="headline" align="center">
            We could not load your goals
          </Text>
          <Text color="textSecondary" align="center">
            Check your connection and try again. Nothing was lost; your goals are safe.
          </Text>
        </View>
        <Button label="Try again" size="lg" fullWidth onPress={onRetry} />
      </View>
    </Card>
  );
}

/** Placeholder shapes that match the real layout, so nothing jumps when the data arrives. */
export function TodaySkeleton() {
  return (
    <View
      style={styles.skeleton}
      accessible
      aria-busy
      role="progressbar"
      aria-label="Loading your day"
      accessibilityLabel="Loading your day">
      <View style={styles.skeletonGroup}>
        <Skeleton width={84} height={12} />
        <Card tone="primary">
          <View style={styles.skeletonFocus}>
            <Skeleton width="78%" height={26} tone="primary" />
            <Skeleton width="62%" height={14} tone="primary" />
            <Skeleton height={14} tone="primary" />
            <Skeleton height={56} cornerRadius={radius.button} tone="primary" />
          </View>
        </Card>
      </View>
      <View style={styles.skeletonGroup}>
        <Skeleton width={120} height={20} />
        {[0, 1].map((row) => (
          <Card key={row} padding="md">
            <View style={styles.skeletonRow}>
              <Skeleton width={44} height={44} cornerRadius={radius.md} />
              <View style={styles.skeletonLines}>
                <Skeleton width={row === 0 ? '60%' : '72%'} height={14} />
                <Skeleton width="34%" height={11} />
              </View>
            </View>
          </Card>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
  },
  blob: {
    width: 232,
    height: 232,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    gap: spacing.xs,
    maxWidth: 320,
  },
  error: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  errorBadge: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeleton: {
    gap: spacing.lg,
  },
  skeletonGroup: {
    gap: spacing.sm,
  },
  skeletonFocus: {
    gap: spacing.sm,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  skeletonLines: {
    flex: 1,
    gap: spacing.xs,
  },
});
