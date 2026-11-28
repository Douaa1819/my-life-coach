import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, InlineMessage, PillGroup, Text, TextField } from '@/components/ui';
import { fontFamilies, layout, radius, spacing, useTheme } from '@/design';
import { type Goal } from '@/features/goals/goal.schema';

import {
  type HabitCadence,
  type HabitWriteInput,
  type RestDays,
  cadenceLabels,
  dayLabels,
  habitCadences,
  habitTitleSchema,
  restDayOptions,
} from '../habit.schema';

const NO_GOAL = 'none';
const GOAL_CHOICES = 4;
const restLabels: Record<RestDays, string> = { 0: 'None', 1: 'One', 2: 'Two' };

type AddHabitFormProps = {
  goals: readonly Goal[];
  saving: boolean;
  errorMessage?: string;
  onSubmit: (input: HabitWriteInput) => void;
  onCancel: () => void;
};

/** A habit's name, how often, and how many rest days are built in. */
export function AddHabitForm({
  goals,
  saving,
  errorMessage,
  onSubmit,
  onCancel,
}: AddHabitFormProps) {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [cadence, setCadence] = useState<HabitCadence>('daily');
  const [days, setDays] = useState<number[]>([]);
  const [perWeek, setPerWeek] = useState(3);
  const [rest, setRest] = useState<RestDays>(1);
  const [goalId, setGoalId] = useState<string>(NO_GOAL);
  const [error, setError] = useState<string>();

  const choices = goals.filter((goal) => goal.status === 'active').slice(0, GOAL_CHOICES);

  function toggleDay(day: number) {
    setDays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day],
    );
    setError(undefined);
  }

  function submit() {
    const parsedTitle = habitTitleSchema.safeParse(title);
    if (!parsedTitle.success) {
      setError(parsedTitle.error.issues[0]?.message ?? 'Give the habit a name.');
      return;
    }
    if (cadence === 'custom' && days.length === 0) {
      setError('Pick at least one day.');
      return;
    }
    setError(undefined);
    onSubmit({
      title: parsedTitle.data,
      cadence,
      daysOfWeek: cadence === 'custom' ? days : [],
      targetPerPeriod: cadence === 'weekly' ? perWeek : 1,
      restDaysPerWeek: rest,
      goalId: goalId === NO_GOAL ? null : goalId,
    });
  }

  return (
    <View style={styles.form}>
      <TextField
        label="What is the habit?"
        value={title}
        onChangeText={(value) => {
          setTitle(value);
          if (error) setError(undefined);
        }}
        errorText={error}
        placeholder="Read for ten minutes"
        returnKeyType="done"
        onSubmitEditing={submit}
        maxLength={100}
      />
      <PillGroup
        label="How often?"
        options={habitCadences.map((value) => ({ value, label: cadenceLabels[value] }))}
        selected={cadence}
        onSelect={setCadence}
      />
      {cadence === 'weekly' && (
        <PillGroup
          label="How many days a week?"
          options={[1, 2, 3, 4, 5, 6, 7].map((value) => ({ value, label: String(value) }))}
          selected={perWeek}
          onSelect={setPerWeek}
        />
      )}
      {cadence === 'custom' && (
        <View style={styles.days} role="group" aria-label="Which days?">
          <Text variant="label">Which days?</Text>
          <View style={styles.dayRow}>
            {dayLabels.map((label, index) => {
              const selected = days.includes(index);
              return (
                <Pressable
                  key={label}
                  role="checkbox"
                  aria-checked={selected}
                  aria-label={label}
                  onPress={() => toggleDay(index)}
                  style={[
                    styles.day,
                    {
                      backgroundColor: selected ? colors.primaryContainer : colors.surface,
                      borderColor: selected ? colors.primary : colors.borderStrong,
                    },
                  ]}>
                  <Text
                    variant="bodySmall"
                    style={{
                      color: selected ? colors.onPrimaryContainer : colors.textSecondary,
                      fontFamily: selected ? fontFamilies.bold : fontFamilies.medium,
                    }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
      <PillGroup
        label="Rest days each week"
        options={restDayOptions.map((value) => ({ value, label: restLabels[value] }))}
        selected={rest}
        onSelect={setRest}
      />
      <Text variant="caption" color="textSecondary">
        Rest days are days you can skip without your streak starting over.
      </Text>
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
        <Button label="Add habit" onPress={submit} loading={saving} />
        <Button label="Cancel" variant="ghost" onPress={onCancel} disabled={saving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
  days: {
    gap: spacing.xs,
  },
  dayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  day: {
    minWidth: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderWidth: 2,
    borderRadius: radius.pill,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
});
