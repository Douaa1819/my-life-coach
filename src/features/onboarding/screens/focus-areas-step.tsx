import { SelectionCard, SelectionGroup, Text } from '@/components/ui';

import { focusAreaIcons } from '../onboarding-copy';
import {
  type FocusArea,
  focusAreaLabels,
  focusAreas,
  MAX_FOCUS_AREAS,
  type OnboardingAnswers,
} from '../onboarding.schema';

type FocusAreasStepProps = {
  answers: OnboardingAnswers;
  blocked: boolean;
  onToggle: (area: FocusArea) => void;
};

export function FocusAreasStep({ answers, blocked, onToggle }: FocusAreasStepProps) {
  const selected = answers.focusAreas.length;

  return (
    <>
      <SelectionGroup label="Focus areas" mode="multiple" columns={2}>
        {focusAreas.map((area) => (
          <SelectionCard
            key={area}
            mode="multiple"
            variant="tile"
            title={focusAreaLabels[area]}
            icon={focusAreaIcons[area]}
            selected={answers.focusAreas.includes(area)}
            onPress={() => onToggle(area)}
            accessibilityHint={
              selected >= MAX_FOCUS_AREAS && !answers.focusAreas.includes(area)
                ? 'You can pick up to three'
                : undefined
            }
          />
        ))}
      </SelectionGroup>
      <Text
        variant="bodySmall"
        color="textSecondary"
        accessibilityLiveRegion="polite"
        aria-live="polite">
        {blocked ? 'You can pick up to three' : `${selected} of ${MAX_FOCUS_AREAS} selected`}
      </Text>
    </>
  );
}
