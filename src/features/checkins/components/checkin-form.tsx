import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, InlineMessage, PillGroup, Text, TextField } from '@/components/ui';
import { spacing } from '@/design';

import {
  type Checkin,
  type CheckinKey,
  type CheckinWriteInput,
  CHECKIN_NOTE_MAX_LENGTH,
  checkinQuestions,
  checkinWriteSchema,
} from '../checkin.schema';

type CheckinFormProps = {
  initial?: Checkin | null;
  saving: boolean;
  errorMessage?: string;
  onSubmit: (input: CheckinWriteInput) => void;
  onCancel: () => void;
};

function startingAnswers(initial?: Checkin | null): Record<CheckinKey, number> {
  return {
    mood: initial?.mood ?? 0,
    energy: initial?.energy ?? 0,
    stress: initial?.stress ?? 0,
    sleepQuality: initial?.sleepQuality ?? 0,
    effortVsResults: initial?.effortVsResults ?? 0,
  };
}

/** Five optional questions and an optional note. Every one can be skipped. */
export function CheckinForm({
  initial,
  saving,
  errorMessage,
  onSubmit,
  onCancel,
}: CheckinFormProps) {
  const [answers, setAnswers] = useState(() => startingAnswers(initial));
  const [note, setNote] = useState(initial?.note ?? '');
  const [error, setError] = useState<string>();

  function submit() {
    const parsed = checkinWriteSchema.safeParse({ ...answers, note });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Answer one question, or skip today.');
      return;
    }
    setError(undefined);
    onSubmit(parsed.data);
  }

  return (
    <View style={styles.form}>
      <Text variant="caption" color="textSecondary">
        Only for you. Answer what you like and skip the rest.
      </Text>
      {checkinQuestions.map((question) => (
        <PillGroup
          key={question.key}
          label={question.label}
          options={[
            { value: 0, label: 'Skip' },
            ...question.labels.map((label, index) => ({ value: index + 1, label })),
          ]}
          selected={answers[question.key]}
          onSelect={(value) => {
            setAnswers((current) => ({ ...current, [question.key]: value }));
            setError(undefined);
          }}
        />
      ))}
      <TextField
        label="Anything to add? (optional)"
        value={note}
        onChangeText={setNote}
        maxLength={CHECKIN_NOTE_MAX_LENGTH}
        multiline
      />
      {(error || errorMessage) && (
        <InlineMessage tone="danger" message={error ?? errorMessage ?? ''} />
      )}
      <View style={styles.actions}>
        <Button label="Save check-in" onPress={submit} loading={saving} />
        <Button label="Not now" variant="ghost" onPress={onCancel} disabled={saving} />
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
