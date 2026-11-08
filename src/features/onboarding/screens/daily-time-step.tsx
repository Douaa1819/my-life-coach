import { SelectionCard, SelectionGroup } from '@/components/ui';

import {
  type DailyMinutes,
  dailyMinutesOptions,
  type OnboardingAnswers,
} from '../onboarding.schema';

type DailyTimeStepProps = {
  answers: OnboardingAnswers;
  onSelect: (minutes: DailyMinutes) => void;
};

export function DailyTimeStep({ answers, onSelect }: DailyTimeStepProps) {
  return (
    <SelectionGroup label="How much time can you give it on a normal day?" mode="single">
      {dailyMinutesOptions.map((option) => (
        <SelectionCard
          key={option.value}
          mode="single"
          title={option.label}
          description={option.description}
          selected={answers.dailyMinutes === option.value}
          onPress={() => onSelect(option.value)}
        />
      ))}
    </SelectionGroup>
  );
}
