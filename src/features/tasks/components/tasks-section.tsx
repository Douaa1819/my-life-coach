import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AnimatedCheck,
  Button,
  Card,
  Chip,
  InlineMessage,
  SectionHeader,
  Text,
} from '@/components/ui';
import { fontFamilies, radius, spacing, useTheme } from '@/design';
import { type Goal } from '@/features/goals/goal.schema';

import { type Task, UNDO_WINDOW_MS, taskEffortLabels, type TaskEffort } from '../task.schema';
import {
  useCompleteTask,
  useCreateTask,
  useDeleteTask,
  useSkipTask,
  useTasks,
  useUndoTask,
  useXpTotals,
} from '../use-tasks';
import { AddTaskForm } from './add-task-form';

type TasksSectionProps = {
  /** Today's date in the person's own time zone (YYYY-MM-DD). */
  taskDate: string;
  goals: readonly Goal[];
  now?: number;
};

const ACTION_ERROR = "That didn't go through. Please try again.";

function canUndo(task: Task, now: number) {
  if (task.status !== 'completed' || !task.completedAt) return false;
  return now - new Date(task.completedAt).getTime() < UNDO_WINDOW_MS;
}

function caption(task: Task) {
  const effort = taskEffortLabels[task.effort as TaskEffort] ?? 'Steady';
  if (task.status === 'skipped') return 'Skipped. No pressure.';
  const base = `${task.durationMinutes} min · ${effort}`;
  return task.status === 'completed' && task.xpAwarded > 0
    ? `${base} · +${task.xpAwarded} XP`
    : base;
}

/**
 * Today's plan: real steps the person chose, with XP that only the server awards. Nothing
 * here is invented: with no steps it says so and offers to add one.
 */
export function TasksSection({ taskDate, goals, now: fixedNow }: TasksSectionProps) {
  const { colors } = useTheme();
  const tasks = useTasks(taskDate);
  const xp = useXpTotals();
  const create = useCreateTask();
  const complete = useCompleteTask(taskDate);
  const undo = useUndoTask();
  const skip = useSkipTask();
  const remove = useDeleteTask();
  const [adding, setAdding] = useState(false);

  // The undo window is ten minutes, so the clock moves on while the screen stays open.
  const [clock, setClock] = useState(() => fixedNow ?? Date.now());
  useEffect(() => {
    if (fixedNow !== undefined) return;
    const timer = setInterval(() => setClock(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [fixedNow]);
  const now = fixedNow ?? clock;

  const list = tasks.data ?? [];
  const failed = complete.isError || undo.isError || skip.isError || remove.isError;
  const totalXp = xp.data?.totalXp ?? 0;

  const form = (
    <Card tone="muted">
      <AddTaskForm
        taskDate={taskDate}
        goals={goals}
        saving={create.isPending}
        errorMessage={create.isError ? "We couldn't add that step. Please try again." : undefined}
        onCancel={() => setAdding(false)}
        onSubmit={(input) =>
          create.mutate(input, {
            onSuccess: () => {
              create.reset();
              setAdding(false);
            },
          })
        }
      />
    </Card>
  );

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <SectionHeader title="Today's plan" />
        </View>
        {totalXp > 0 && xp.data && (
          <Chip tone="success" label={`Level ${xp.data.level} · ${totalXp} XP`} />
        )}
      </View>

      {tasks.isError ? (
        <InlineMessage
          tone="danger"
          message="We could not load today's steps. Your data is safe."
        />
      ) : list.length === 0 && !adding ? (
        <Card tone="muted">
          <View style={styles.empty}>
            <Text variant="bodyStrong">Nothing planned yet.</Text>
            <Text variant="bodySmall" color="textSecondary">
              One small step is enough for today.
            </Text>
            <Button
              label="Add a step"
              variant="tonal"
              icon="sparkle"
              onPress={() => setAdding(true)}
            />
          </View>
        </Card>
      ) : (
        <View style={styles.list}>
          {list.map((task) => {
            const done = task.status === 'completed';
            const skipped = task.status === 'skipped';
            const undoable = canUndo(task, now);
            return (
              <Card key={task.id} padding="md">
                <View style={styles.row}>
                  <AnimatedCheck
                    checked={done}
                    label={task.title}
                    disabled={skipped || (done && !undoable)}
                    onChange={(checked) => {
                      if (checked) complete.mutate(task.id);
                      else if (undoable) undo.mutate(task.id);
                    }}
                  />
                  <View style={styles.copy}>
                    <Text
                      variant="bodyStrong"
                      style={
                        done || skipped
                          ? { color: colors.textSecondary, textDecorationLine: 'line-through' }
                          : undefined
                      }>
                      {task.title}
                    </Text>
                    <Text
                      variant="caption"
                      style={{ color: done ? colors.successText : colors.textSecondary }}>
                      {caption(task)}
                    </Text>
                    {task.status === 'pending' && (
                      <View style={styles.actions}>
                        <TextAction label="Skip" onPress={() => skip.mutate(task.id)} />
                        <TextAction label="Remove" onPress={() => remove.mutate(task.id)} />
                      </View>
                    )}
                    {undoable && <TextAction label="Undo" onPress={() => undo.mutate(task.id)} />}
                  </View>
                </View>
              </Card>
            );
          })}
          {failed && <InlineMessage tone="danger" message={ACTION_ERROR} />}
          {adding ? (
            form
          ) : (
            <Button
              label="Add a step"
              variant="tonal"
              icon="sparkle"
              onPress={() => setAdding(true)}
            />
          )}
        </View>
      )}
    </View>
  );
}

function TextAction({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      role="button"
      aria-label={label}
      onPress={onPress}
      hitSlop={spacing.xs}
      style={styles.textAction}>
      <Text variant="bodySmall" style={{ color: colors.primary, fontFamily: fontFamilies.bold }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerTitle: {
    flexShrink: 1,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xxs,
  },
  textAction: {
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  empty: {
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
});
