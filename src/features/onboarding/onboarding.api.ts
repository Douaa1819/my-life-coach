import { type PostgrestError } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/lib/supabase/client';
import { type DataAccessErrorKind, toDataAccessError } from '@/lib/supabase/data-access-error';

import { firstInvalidStep } from './onboarding-flow';
import {
  type OnboardingAnswers,
  onboardingAnswersSchema,
  type QuestionStep,
} from './onboarding.schema';

/** Server validation messages raised by complete_onboarding, and the step that fixes each. */
const serverValidationSteps: Record<string, QuestionStep> = {
  invalid_display_name: 'name',
  invalid_focus_areas: 'focusAreas',
  invalid_goal_title: 'goal',
  invalid_goal_category: 'goal',
  invalid_goal_description: 'motivation',
  invalid_goal_horizon: 'horizon',
  invalid_daily_minutes: 'dailyTime',
  invalid_coach_tone: 'coachStyle',
};

/** Carries only a category and a step: never the answers or the server's text. */
export class OnboardingSubmitError extends Error {
  readonly kind: DataAccessErrorKind;
  readonly step: QuestionStep | null;

  constructor(kind: DataAccessErrorKind, step: QuestionStep | null = null) {
    super(`Onboarding submission failed (${kind})`);
    this.name = 'OnboardingSubmitError';
    this.kind = kind;
    this.step = step;
  }
}

function toSubmitError(error: Pick<PostgrestError, 'code' | 'message'>) {
  const step = error.code === '22023' ? serverValidationSteps[error.message] : undefined;
  return new OnboardingSubmitError(toDataAccessError(error).kind, step ?? null);
}

/**
 * Sends the validated answers to the trusted database function, which checks
 * them again, writes under the caller's id and sets onboarding_completed.
 */
export async function completeOnboarding(answers: OnboardingAnswers): Promise<void> {
  const parsed = onboardingAnswersSchema.safeParse(answers);
  if (!parsed.success) throw new OnboardingSubmitError('invalid', firstInvalidStep(answers));
  const submission = parsed.data;

  const { error } = await getSupabaseClient().rpc('complete_onboarding', {
    p_display_name: submission.displayName,
    p_focus_areas: submission.focusAreas,
    p_goal_title: submission.goalTitle,
    p_goal_category: submission.goalCategory,
    p_goal_horizon: submission.horizon,
    p_daily_minutes: submission.dailyMinutes,
    p_coach_tone: submission.coachTone,
    ...(submission.goalDescription !== null && { p_goal_description: submission.goalDescription }),
    ...(submission.reminderTime !== null && { p_reminder_time: submission.reminderTime }),
  });
  if (!error) return;
  // A retry after a lost response: the first call already succeeded.
  if (error.code === 'P0001' && error.message === 'already_completed') return;
  throw toSubmitError(error);
}
