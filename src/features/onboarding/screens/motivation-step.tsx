import { TextField } from '@/components/ui';

import {
  codePointLength,
  MOTIVATION_MAX_LENGTH,
  type OnboardingAnswers,
  textInputLimits,
} from '../onboarding.schema';

type MotivationStepProps = {
  answers: OnboardingAnswers;
  errorText?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function MotivationStep({ answers, errorText, onChange, onSubmit }: MotivationStepProps) {
  const length = codePointLength(answers.motivation);
  const showCounter = length >= 240;

  return (
    <TextField
      label="Your reason"
      value={answers.motivation}
      onChangeText={onChange}
      placeholder="I want more energy for my kids"
      multiline
      maxLength={textInputLimits.motivation}
      returnKeyType="go"
      onSubmitEditing={onSubmit}
      errorText={errorText}
      helperText={showCounter ? `${length} of ${MOTIVATION_MAX_LENGTH} characters` : undefined}
    />
  );
}
