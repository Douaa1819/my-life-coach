import { type Ref, useRef } from 'react';
import { type TextInputInstance } from 'react-native';

import { TextField } from '@/components/ui';

import { type OnboardingAnswers, textInputLimits } from '../onboarding.schema';

type NameStepProps = {
  answers: OnboardingAnswers;
  errorText?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  inputRef?: Ref<TextInputInstance>;
};

export function NameStep({ answers, errorText, onChange, onSubmit, inputRef }: NameStepProps) {
  const fallbackRef = useRef<TextInputInstance>(null);
  const empty = answers.displayName.trim().length === 0;

  return (
    <TextField
      ref={inputRef ?? fallbackRef}
      label="First name"
      value={answers.displayName}
      onChangeText={onChange}
      autoComplete="given-name"
      autoCapitalize="words"
      autoCorrect={false}
      autoFocus={empty}
      maxLength={textInputLimits.displayName}
      returnKeyType="go"
      onSubmitEditing={onSubmit}
      errorText={errorText}
    />
  );
}
