import { z } from 'zod';

import {
  GOAL_DESCRIPTION_MAX_LENGTH,
  GOAL_TITLE_MAX_LENGTH,
  GOAL_TITLE_MIN_LENGTH,
  goalCategories,
  goalCategoryLabels,
  goalDescriptionSchema,
  goalHorizonOptions,
  goalHorizons,
  goalSuggestions,
  goalTitleSchema,
  type GoalCategory,
  type GoalHorizon,
} from '@/features/goals/goal.schema';
import { DISPLAY_NAME_MAX_LENGTH, displayNameSchema } from '@/features/profile/profile.schema';

export {
  GOAL_TITLE_MAX_LENGTH,
  GOAL_TITLE_MIN_LENGTH,
  goalHorizons,
  goalTitleSchema,
  type GoalHorizon,
};

/** Same allowed values as `public.goals.category` and onboarding focus areas. */
export const focusAreas = goalCategories;
export type FocusArea = GoalCategory;
export const MAX_FOCUS_AREAS = 3;
export const focusAreaLabels = goalCategoryLabels;
export const MOTIVATION_MAX_LENGTH = GOAL_DESCRIPTION_MAX_LENGTH;
export const motivationSchema = goalDescriptionSchema;
export const horizonOptions = goalHorizonOptions;
export { goalSuggestions };

export const dailyMinutesValues = [5, 15, 30, 60] as const;
export type DailyMinutes = (typeof dailyMinutesValues)[number];

export const dailyMinutesOptions: readonly {
  value: DailyMinutes;
  label: string;
  description: string;
}[] = [
  { value: 5, label: '5 minutes', description: 'Tiny steps' },
  { value: 15, label: '15 minutes', description: 'A short session' },
  { value: 30, label: '30 minutes', description: 'A real block' },
  { value: 60, label: 'An hour or more', description: 'Big days' },
];

export const checkInIds = ['morning', 'midday', 'evening', 'none'] as const;
export type CheckInId = (typeof checkInIds)[number];

/** `time` is the local reminder time sent to the database; null means no reminders. */
export const checkInOptions: readonly { value: CheckInId; label: string; time: string | null }[] = [
  { value: 'morning', label: 'Morning, around 8:00', time: '08:00' },
  { value: 'midday', label: 'Midday, around 12:30', time: '12:30' },
  { value: 'evening', label: 'Evening, around 20:00', time: '20:00' },
  { value: 'none', label: 'No reminders for now', time: null },
];

export const coachTones = ['gentle', 'direct', 'energetic'] as const;
export type CoachTone = (typeof coachTones)[number];

export const coachToneOptions: readonly {
  value: CoachTone;
  label: string;
  description: string;
  preview: (name: string) => string;
}[] = [
  {
    value: 'gentle',
    label: 'Gentle',
    description: 'Soft encouragement, no pressure.',
    preview: (name) => `No rush, ${name}. Even five minutes counts today.`,
  },
  {
    value: 'direct',
    label: 'Direct',
    description: 'Clear and to the point.',
    preview: () => 'Today: 15 minutes on your run plan. Let’s do it.',
  },
  {
    value: 'energetic',
    label: 'Energetic',
    description: 'Upbeat and motivating.',
    preview: () => 'New day, new step! Ready for your 15 minutes?',
  },
];

export const questionSteps = [
  'name',
  'focusAreas',
  'goal',
  'horizon',
  'motivation',
  'dailyTime',
  'checkIn',
  'coachStyle',
] as const;
export type QuestionStep = (typeof questionSteps)[number];

export const onboardingSteps = ['intro', ...questionSteps, 'review'] as const;
export type OnboardingStep = (typeof onboardingSteps)[number];

/** In-progress answers. Text fields hold what the user typed, not yet validated. */
export type OnboardingAnswers = {
  displayName: string;
  focusAreas: FocusArea[];
  goalTitle: string;
  goalCategory: FocusArea | null;
  horizon: GoalHorizon;
  motivation: string;
  dailyMinutes: DailyMinutes;
  checkIn: CheckInId | null;
  coachTone: CoachTone | null;
};

export function createInitialAnswers(displayName = ''): OnboardingAnswers {
  return {
    displayName,
    focusAreas: [],
    goalTitle: '',
    goalCategory: null,
    horizon: '6_months',
    motivation: '',
    dailyMinutes: 15,
    checkIn: null,
    coachTone: null,
  };
}

// Text rules match private.is_clean_text: Postgres counts code points, not UTF-16 units.
/** Use for any visible character counter, so it agrees with the server. */
export const codePointLength = (value: string) => Array.from(value).length;

/**
 * Longest text each field accepts, in code points. Pass these as TextInput
 * `maxLength` too: it counts UTF-16 units, so it can only be stricter (emoji
 * count twice) and never lets through more than the server accepts. The
 * reducer clamps in code points, which also covers pasted text.
 */
export const textInputLimits = {
  displayName: DISPLAY_NAME_MAX_LENGTH,
  goalTitle: GOAL_TITLE_MAX_LENGTH,
  motivation: MOTIVATION_MAX_LENGTH,
} as const;

export function clampToCodePoints(value: string, limit: number) {
  const characters = Array.from(value);
  return characters.length > limit ? characters.slice(0, limit).join('') : value;
}

export const focusAreasSchema = z
  .array(z.enum(focusAreas))
  .min(1, 'Pick at least one area.')
  .max(MAX_FOCUS_AREAS, 'You can pick up to three.')
  .refine((areas) => new Set(areas).size === areas.length, { error: 'Pick each area once.' });

/** The validated payload for `complete_onboarding`, built only from complete answers. */
export const onboardingAnswersSchema = z
  .object({
    displayName: displayNameSchema,
    focusAreas: focusAreasSchema,
    goalTitle: goalTitleSchema,
    goalCategory: z.enum(focusAreas, 'Choose what this goal is about.'),
    horizon: z.enum(goalHorizons),
    motivation: motivationSchema,
    dailyMinutes: z.union(dailyMinutesValues.map((value) => z.literal(value))),
    checkIn: z.enum(checkInIds, 'Choose when I should check in.'),
    coachTone: z.enum(coachTones, 'Choose a coaching style.'),
  })
  .refine((answers) => answers.focusAreas.includes(answers.goalCategory), {
    error: 'Choose one of your focus areas.',
    path: ['goalCategory'],
  })
  .transform((answers) => ({
    displayName: answers.displayName,
    focusAreas: answers.focusAreas,
    goalTitle: answers.goalTitle,
    goalCategory: answers.goalCategory,
    goalDescription: answers.motivation,
    horizon: answers.horizon,
    dailyMinutes: answers.dailyMinutes,
    reminderTime: checkInOptions.find((option) => option.value === answers.checkIn)?.time ?? null,
    coachTone: answers.coachTone,
  }));

export type OnboardingSubmission = z.output<typeof onboardingAnswersSchema>;

/** Which step owns each answer, used to send the user back to fix it. */
export const answerSteps: Record<keyof OnboardingAnswers, QuestionStep> = {
  displayName: 'name',
  focusAreas: 'focusAreas',
  goalTitle: 'goal',
  goalCategory: 'goal',
  horizon: 'horizon',
  motivation: 'motivation',
  dailyMinutes: 'dailyTime',
  checkIn: 'checkIn',
  coachTone: 'coachStyle',
};

// Drafts are read from device storage, so every field is bounded and re-checked.
// Text stays lenient (an unfinished answer is allowed) but size-limited. Input is
// clamped to textInputLimits in code points (at most 2 UTF-16 units each), so a
// draft the app wrote always fits these bounds.
const draftAnswersSchema = z.object({
  displayName: z.string().max(200),
  focusAreas: z.array(z.enum(focusAreas)).max(MAX_FOCUS_AREAS),
  goalTitle: z.string().max(500),
  goalCategory: z.enum(focusAreas).nullable(),
  horizon: z.enum(goalHorizons),
  motivation: z.string().max(1000),
  dailyMinutes: z.union(dailyMinutesValues.map((value) => z.literal(value))),
  checkIn: z.enum(checkInIds).nullable(),
  coachTone: z.enum(coachTones).nullable(),
}) satisfies z.ZodType<OnboardingAnswers>;

export const ONBOARDING_DRAFT_VERSION = 1;

export const onboardingDraftSchema = z.object({
  version: z.literal(ONBOARDING_DRAFT_VERSION),
  userId: z.uuid(),
  step: z.enum(onboardingSteps),
  answers: draftAnswersSchema,
  savedAt: z.iso.datetime(),
});

export type OnboardingDraft = z.infer<typeof onboardingDraftSchema>;
