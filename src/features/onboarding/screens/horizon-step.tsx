import { SelectionCard, SelectionGroup } from '@/components/ui';

import { type GoalHorizon } from '@/features/goals/goal.schema';

import { horizonOptions, type OnboardingAnswers } from '../onboarding.schema';

type HorizonStepProps = {
  answers: OnboardingAnswers;
  onSelect: (horizon: GoalHorizon) => void;
};

export function HorizonStep({ answers, onSelect }: HorizonStepProps) {
  return (
    <SelectionGroup label="When would you like to get there?" mode="single">
      {horizonOptions.map((option) => (
        <SelectionCard
          key={option.value}
          mode="single"
          title={option.label}
          description={option.description}
          selected={answers.horizon === option.value}
          onPress={() => onSelect(option.value)}
        />
      ))}
    </SelectionGroup>
  );
}
