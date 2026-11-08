import { Pressable, StyleSheet, View } from 'react-native';

import { SelectionCard, SelectionGroup, Text, TextField } from '@/components/ui';
import { radius, spacing, useTheme } from '@/design';

import {
  codePointLength,
  type FocusArea,
  focusAreaLabels,
  GOAL_TITLE_MAX_LENGTH,
  goalSuggestions,
  type OnboardingAnswers,
  textInputLimits,
} from '../onboarding.schema';

type GoalStepProps = {
  answers: OnboardingAnswers;
  errorText?: string;
  onChangeTitle: (value: string) => void;
  onChangeCategory: (area: FocusArea) => void;
  onSubmit: () => void;
};

export function GoalStep({
  answers,
  errorText,
  onChangeTitle,
  onChangeCategory,
  onSubmit,
}: GoalStepProps) {
  const { colors } = useTheme();
  const primaryArea = answers.focusAreas[0] ?? 'health';
  const suggestions = goalSuggestions[primaryArea];
  const length = codePointLength(answers.goalTitle);
  const showCounter = length >= 100;
  const showCategory = answers.focusAreas.length > 1;

  return (
    <>
      <TextField
        label="Your goal"
        value={answers.goalTitle}
        onChangeText={onChangeTitle}
        multiline
        maxLength={textInputLimits.goalTitle}
        returnKeyType="go"
        onSubmitEditing={onSubmit}
        errorText={errorText}
        helperText={showCounter ? `${length} of ${GOAL_TITLE_MAX_LENGTH} characters` : undefined}
      />

      <View style={styles.suggestions}>
        {suggestions.map((suggestion) => (
          <Pressable
            key={suggestion}
            role="button"
            aria-label={`Use suggestion: ${suggestion}`}
            onPress={() => onChangeTitle(suggestion)}
            style={[styles.chip, { backgroundColor: colors.primaryContainer }]}>
            <Text variant="bodySmall" color="onPrimaryContainer">
              {suggestion}
            </Text>
          </Pressable>
        ))}
      </View>

      {showCategory && (
        <SelectionGroup label="This goal is about" mode="single">
          {answers.focusAreas.map((area) => (
            <SelectionCard
              key={area}
              mode="single"
              title={focusAreaLabels[area]}
              selected={answers.goalCategory === area}
              onPress={() => onChangeCategory(area)}
            />
          ))}
        </SelectionGroup>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    justifyContent: 'center',
  },
});
