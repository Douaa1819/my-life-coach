import { createInitialAnswers, type OnboardingAnswers } from '../onboarding.schema';

export const USER_A = '11111111-1111-4111-8111-111111111111';
export const USER_B = '22222222-2222-4222-8222-222222222222';

export function completeAnswers(overrides: Partial<OnboardingAnswers> = {}): OnboardingAnswers {
  return {
    ...createInitialAnswers('Sara'),
    focusAreas: ['health', 'career'],
    goalTitle: 'Run 5 km',
    goalCategory: 'health',
    motivation: 'More energy for my kids',
    checkIn: 'morning',
    coachTone: 'gentle',
    ...overrides,
  };
}
