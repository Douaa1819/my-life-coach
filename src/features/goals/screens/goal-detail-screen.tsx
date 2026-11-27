import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import {
  Button,
  Chip,
  ErrorState,
  Icon,
  InlineMessage,
  LoadingState,
  Screen,
  Text,
} from '@/components/ui';
import { radius, spacing, useTheme } from '@/design';
import { useCelebration } from '@/features/celebration/celebration-store';

import { confirmGoalChange } from '../confirm-goal-change';
import { leaveScreen } from '../leave-screen';
import { goalHrefs } from '../goal-routes';
import { formatGoalDeadline, formatGoalHorizon, formatGoalStatus } from '../goal-progress';
import { goalCategoryLabels, type Goal } from '../goal.schema';
import { goalLoadErrorMessage, goalSaveErrorMessage } from '../goal-errors';
import { useDeleteGoal, useGoal, useUpdateGoalStatus } from '../use-goals';

export function GoalDetailScreen({ goalId }: { goalId: string }) {
  const goal = useGoal(goalId);

  if (goal.isPending) {
    return (
      <Screen scroll={false} topInset={false}>
        <LoadingState label="Loading this goal" />
      </Screen>
    );
  }

  if (goal.isError || !goal.data) {
    return (
      <Screen scroll={false} topInset={false}>
        <ErrorState
          message={goalLoadErrorMessage(goal.error)}
          onRetry={() => void goal.refetch()}
        />
      </Screen>
    );
  }

  return <GoalDetailBody goal={goal.data} />;
}

function GoalDetailBody({ goal }: { goal: Goal }) {
  const { colors } = useTheme();
  const statusMutation = useUpdateGoalStatus(goal.id);
  const deleteMutation = useDeleteGoal(goal.id);
  const deadline = formatGoalDeadline(goal.targetDate, goal.status);
  const busy = statusMutation.isPending || deleteMutation.isPending;

  const celebrate = useCelebration((state) => state.celebrate);

  function setStatus(status: Goal['status']) {
    statusMutation.mutate(status, {
      onSuccess: () => {
        if (status === 'completed') celebrate(goal.title);
      },
    });
  }

  return (
    <Screen topInset={false}>
      <View style={styles.hero}>
        <View style={[styles.badge, { backgroundColor: colors.primaryContainer }]}>
          <Icon name={goal.category} size={28} color={colors.brand} />
        </View>
        <Text variant="title" role="heading">
          {goal.title}
        </Text>
        <View style={styles.meta}>
          <Chip label={goalCategoryLabels[goal.category]} icon={goal.category} tone="primary" />
          <Chip label={formatGoalHorizon(goal.horizon)} tone="neutral" />
          <Chip
            label={formatGoalStatus(goal.status)}
            tone={
              goal.status === 'completed'
                ? 'success'
                : goal.status === 'paused'
                  ? 'warning'
                  : 'neutral'
            }
          />
        </View>
      </View>

      {goal.description ? (
        <View style={styles.block}>
          <Text variant="overline" color="textSecondary">
            Why it matters
          </Text>
          <Text>{goal.description}</Text>
        </View>
      ) : null}

      {deadline ? (
        <View style={styles.block}>
          <Text variant="overline" color="textSecondary">
            Deadline
          </Text>
          <Text>{deadline}</Text>
        </View>
      ) : null}

      {(statusMutation.isError || deleteMutation.isError) && (
        <InlineMessage
          tone="danger"
          message={goalSaveErrorMessage(statusMutation.error ?? deleteMutation.error)}
        />
      )}

      <View style={styles.actions}>
        <Button label="Edit" onPress={() => router.push(goalHrefs.edit(goal.id))} disabled={busy} />
        {goal.status === 'active' && (
          <>
            <Button
              label="Mark as reached"
              variant="tonal"
              disabled={busy}
              loading={statusMutation.isPending}
              onPress={() => setStatus('completed')}
            />
            <Button
              label="Pause"
              variant="ghost"
              disabled={busy}
              onPress={() => setStatus('paused')}
            />
          </>
        )}
        {goal.status === 'paused' && (
          <Button
            label="Resume"
            variant="tonal"
            disabled={busy}
            onPress={() => setStatus('active')}
          />
        )}
        {goal.status === 'completed' && (
          <Button
            label="Reopen"
            variant="ghost"
            disabled={busy}
            onPress={() => setStatus('active')}
          />
        )}
        {goal.status !== 'archived' && (
          <Button
            label="Archive"
            variant="ghost"
            disabled={busy}
            onPress={() =>
              confirmGoalChange({
                title: 'Archive this goal?',
                message: 'It will move out of your active list. You can restore it later.',
                confirmLabel: 'Archive',
                onConfirm: () => setStatus('archived'),
              })
            }
          />
        )}
        {goal.status === 'archived' && (
          <Button
            label="Restore"
            variant="tonal"
            disabled={busy}
            onPress={() => setStatus('active')}
          />
        )}
        <Button
          label="Delete"
          variant="destructive"
          disabled={busy}
          loading={deleteMutation.isPending}
          onPress={() =>
            confirmGoalChange({
              title: 'Delete this goal?',
              message: 'This cannot be undone.',
              confirmLabel: 'Delete',
              destructive: true,
              onConfirm: () => {
                deleteMutation.mutate(undefined, {
                  onSuccess: () => leaveScreen(goalHrefs.list),
                });
              },
            })
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.sm,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  block: {
    gap: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
});
