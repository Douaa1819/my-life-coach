import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import {
  BottomBar,
  Button,
  InlineMessage,
  SelectionCard,
  SelectionGroup,
  Text,
  TextField,
} from '@/components/ui';
import { layout, radius, spacing, useTheme } from '@/design';
import { getFieldErrors } from '@/lib/forms/use-zod-form';

import { horizonEndDate } from '../goal-progress';
import {
  clampToCodePoints,
  codePointLength,
  GOAL_DESCRIPTION_MAX_LENGTH,
  GOAL_TITLE_MAX_LENGTH,
  type Goal,
  type GoalCategory,
  type GoalHorizon,
  type GoalWriteInput,
  goalCategories,
  goalCategoryLabels,
  goalHorizonOptions,
  goalSuggestions,
  goalWriteSchema,
} from '../goal.schema';

type GoalFormValues = {
  title: string;
  description: string;
  category: GoalCategory;
  horizon: GoalHorizon;
  targetDate: string;
};

const defaultValues: GoalFormValues = {
  title: '',
  description: '',
  category: 'personal',
  horizon: '6_months',
  targetDate: '',
};

function valuesFromGoal(goal: Goal): GoalFormValues {
  return {
    title: goal.title,
    description: goal.description ?? '',
    category: goal.category,
    horizon: goal.horizon,
    targetDate: goal.targetDate ?? '',
  };
}

type GoalFormProps = {
  initial?: Goal;
  submitLabel: string;
  submitting?: boolean;
  errorMessage?: string | null;
  onSubmit: (input: GoalWriteInput) => void;
};

export function GoalForm({
  initial,
  submitLabel,
  submitting = false,
  errorMessage,
  onSubmit,
}: GoalFormProps) {
  const { colors } = useTheme();
  const [values, setValues] = useState<GoalFormValues>(() =>
    initial ? valuesFromGoal(initial) : defaultValues,
  );
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const parsed = goalWriteSchema.safeParse(values);
  const errors =
    hasSubmitted && !parsed.success ? getFieldErrors<keyof GoalFormValues>(parsed.error) : {};
  const titleLength = codePointLength(values.title);
  const descriptionLength = codePointLength(values.description);
  const suggestions = useMemo(() => goalSuggestions[values.category], [values.category]);

  function setValue<Field extends keyof GoalFormValues>(
    field: Field,
    value: GoalFormValues[Field],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function submit() {
    setHasSubmitted(true);
    if (!parsed.success || submitting) return;
    onSubmit(parsed.data);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.fill, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <View style={styles.content}>
          <TextField
            label="Your goal"
            value={values.title}
            onChangeText={(value) =>
              setValue('title', clampToCodePoints(value, GOAL_TITLE_MAX_LENGTH))
            }
            multiline
            maxLength={GOAL_TITLE_MAX_LENGTH}
            errorText={errors.title}
            helperText={
              titleLength >= 100
                ? `${titleLength} of ${GOAL_TITLE_MAX_LENGTH} characters`
                : undefined
            }
            returnKeyType="next"
          />

          <View style={styles.suggestions}>
            {suggestions.map((suggestion) => (
              <Pressable
                key={suggestion}
                role="button"
                aria-label={`Use suggestion: ${suggestion}`}
                onPress={() => setValue('title', suggestion)}
                style={[styles.suggestion, { backgroundColor: colors.primaryContainer }]}>
                <Text variant="bodySmall" color="onPrimaryContainer">
                  {suggestion}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextField
            label="Why it matters"
            value={values.description}
            onChangeText={(value) =>
              setValue('description', clampToCodePoints(value, GOAL_DESCRIPTION_MAX_LENGTH))
            }
            multiline
            maxLength={GOAL_DESCRIPTION_MAX_LENGTH}
            errorText={errors.description}
            helperText={
              descriptionLength >= 240
                ? `${descriptionLength} of ${GOAL_DESCRIPTION_MAX_LENGTH} characters`
                : 'Optional. This stays private.'
            }
          />

          <SelectionGroup label="This goal is about" mode="single" columns={2}>
            {goalCategories.map((category) => (
              <SelectionCard
                key={category}
                mode="single"
                variant="tile"
                icon={category}
                title={goalCategoryLabels[category]}
                selected={values.category === category}
                onPress={() => setValue('category', category)}
              />
            ))}
          </SelectionGroup>

          <SelectionGroup label="When would you like to get there?" mode="single">
            {goalHorizonOptions.map((option) => (
              <SelectionCard
                key={option.value}
                mode="single"
                title={option.label}
                description={option.description}
                selected={values.horizon === option.value}
                onPress={() => setValue('horizon', option.value)}
              />
            ))}
          </SelectionGroup>
          {errors.horizon && (
            <Text variant="bodySmall" color="danger">
              {errors.horizon}
            </Text>
          )}
          {errors.category && (
            <Text variant="bodySmall" color="danger">
              {errors.category}
            </Text>
          )}

          <View style={styles.deadline}>
            <Text variant="label">Deadline</Text>
            <Text variant="bodySmall" color="textSecondary">
              Optional. A date to aim for, not a score.
            </Text>
            <TextField
              label="Date"
              value={values.targetDate}
              onChangeText={(value) => setValue('targetDate', value)}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              errorText={errors.targetDate}
            />
            <Button
              label="Use the end of this horizon"
              variant="ghost"
              onPress={() => setValue('targetDate', horizonEndDate(values.horizon))}
            />
            {values.targetDate ? (
              <Button
                label="Clear date"
                variant="ghost"
                onPress={() => setValue('targetDate', '')}
              />
            ) : null}
          </View>

          {errorMessage && <InlineMessage tone="danger" message={errorMessage} />}
        </View>
      </ScrollView>
      <BottomBar>
        <Button label={submitLabel} size="lg" fullWidth loading={submitting} onPress={submit} />
      </BottomBar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: spacing.lg,
  },
  content: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.screenPadding,
    gap: spacing.lg,
    paddingTop: spacing.md,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: -spacing.sm,
  },
  suggestion: {
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    justifyContent: 'center',
  },
  deadline: {
    gap: spacing.xs,
  },
});
