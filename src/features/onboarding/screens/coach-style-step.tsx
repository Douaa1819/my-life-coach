import { CoachBubble, SelectionCard, SelectionGroup } from '@/components/ui';

import { firstName } from '../onboarding-copy';
import { type CoachTone, coachToneOptions, type OnboardingAnswers } from '../onboarding.schema';

type CoachStyleStepProps = {
  answers: OnboardingAnswers;
  onSelect: (tone: CoachTone) => void;
};

export function CoachStyleStep({ answers, onSelect }: CoachStyleStepProps) {
  const name = firstName(answers.displayName) || 'there';
  const selected = coachToneOptions.find((option) => option.value === answers.coachTone);

  return (
    <>
      <SelectionGroup label="How should I coach you?" mode="single">
        {coachToneOptions.map((option) => (
          <SelectionCard
            key={option.value}
            mode="single"
            title={option.label}
            description={option.description}
            selected={answers.coachTone === option.value}
            onPress={() => onSelect(option.value)}
          />
        ))}
      </SelectionGroup>
      {selected && <CoachBubble message={selected.preview(name)} live />}
    </>
  );
}
