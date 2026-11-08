import { SelectionCard, SelectionGroup, Text } from '@/components/ui';

import { type CheckInId, checkInOptions, type OnboardingAnswers } from '../onboarding.schema';

type CheckInStepProps = {
  answers: OnboardingAnswers;
  timeZone?: string;
  onSelect: (checkIn: CheckInId) => void;
};

export function CheckInStep({ answers, timeZone, onSelect }: CheckInStepProps) {
  return (
    <>
      <SelectionGroup label="When should I check in with you?" mode="single">
        {checkInOptions.map((option) => (
          <SelectionCard
            key={option.value}
            mode="single"
            title={option.label}
            selected={answers.checkIn === option.value}
            onPress={() => onSelect(option.value)}
          />
        ))}
      </SelectionGroup>
      {timeZone ? (
        <Text variant="caption" color="textTertiary">
          Times in {timeZone}
        </Text>
      ) : null}
    </>
  );
}
