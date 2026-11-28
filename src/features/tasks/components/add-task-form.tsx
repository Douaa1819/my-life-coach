import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, InlineMessage, TextField } from '@/components/ui';
import { spacing } from '@/design';
import { type Goal } from '@/features/goals/goal.schema';

import {
  type TaskEffort,
  type TaskWriteInput,
  taskDurations,
  taskEffortLabels,
  taskEfforts,
  taskTitleSchema,
} from '../task.schema';
import { PillGroup } from './pill-group';

const NO_GOAL = 'none';
const GOAL_CHOICES = 4;

type AddTaskFormProps = {
  taskDate: string;
  /** Goals a step can belong to. Only active goals are offered. */
  goals: readonly Goal[];
  saving: boolean;
  errorMessage?: string;
  onSubmit: (input: TaskWriteInput) => void;
  onCancel: () => void;
};

/** One small step for today: a name, how long, how hard, and (optionally) which goal. */
export function AddTaskForm({
  taskDate,
  goals,
  saving,
  errorMessage,
  onSubmit,
  onCancel,
}: AddTaskFormProps) {
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState<number>(15);
  const [effort, setEffort] = useState<TaskEffort>(2);
  const [goalId, setGoalId] = useState<string>(NO_GOAL);
  const [titleError, setTitleError] = useState<string>();

  const choices = goals.filter((goal) => goal.status === 'active').slice(0, GOAL_CHOICES);

  function submit() {
    const parsed = taskTitleSchema.safeParse(title);
    if (!parsed.success) {
      setTitleError(parsed.error.issues[0]?.message ?? 'Give the step a name.');
      return;
    }
    setTitleError(undefined);
    onSubmit({
      title: parsed.data,
      durationMinutes: minutes,
      effort,
      taskDate,
      goalId: goalId === NO_GOAL ? null : goalId,
    });
  }

  return (
    <View style={styles.form}>
      <TextField
        label="What is one small step?"
        value={title}
        onChangeText={(value) => {
          setTitle(value);
          if (titleError) setTitleError(undefined);
        }}
        errorText={titleError}
        placeholder="Walk for 10 minutes"
        returnKeyType="done"
        onSubmitEditing={submit}
        maxLength={140}
      />
      <PillGroup
        label="How long?"
        options={taskDurations.map((value) => ({ value, label: `${value} min` }))}
        selected={minutes}
        onSelect={setMinutes}
      />
      <PillGroup
        label="How does it feel?"
        options={taskEfforts.map((value) => ({ value, label: taskEffortLabels[value] }))}
        selected={effort}
        onSelect={setEffort}
      />
      {choices.length > 0 && (
        <PillGroup
          label="Which goal is it for?"
          options={[
            { value: NO_GOAL, label: 'None' },
            ...choices.map((goal) => ({ value: goal.id, label: goal.title })),
          ]}
          selected={goalId}
          onSelect={setGoalId}
        />
      )}
      {errorMessage && <InlineMessage tone="danger" message={errorMessage} />}
      <View style={styles.actions}>
        <Button label="Add step" onPress={submit} loading={saving} />
        <Button label="Cancel" variant="ghost" onPress={onCancel} disabled={saving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
});
