import { displayNameSchema } from '@/features/profile/profile.schema';

import {
  answerSteps,
  createInitialAnswers,
  type FocusArea,
  focusAreasSchema,
  goalTitleSchema,
  MAX_FOCUS_AREAS,
  motivationSchema,
  type OnboardingAnswers,
  onboardingAnswersSchema,
  type OnboardingDraft,
  type OnboardingStep,
  onboardingSteps,
  type QuestionStep,
  questionSteps,
  clampToCodePoints,
  textInputLimits,
} from './onboarding.schema';

export type OnboardingNotice = 'maxFocusAreas' | null;

export type OnboardingState = {
  /** The user these answers belong to. They are never saved or shown for anyone else. */
  ownerId: string | null;
  step: OnboardingStep;
  answers: OnboardingAnswers;
  /** Set by Edit on Review: Continue and Back return to Review. */
  returnToReview: boolean;
  notice: OnboardingNotice;
  /** Increments on every navigation. */
  navigation: number;
  /** True after a navigation until the draft is saved: drafts save per step, not per keystroke. */
  pendingSave: boolean;
  /** True until the owner's draft has been read. User actions are ignored meanwhile. */
  restoring: boolean;
};

type TextAnswer = keyof typeof textInputLimits;

export type OnboardingAction =
  | { type: 'setText'; field: TextAnswer; value: string }
  | { type: 'toggleFocusArea'; area: FocusArea }
  | { type: 'answer'; patch: Partial<Omit<OnboardingAnswers, TextAnswer | 'focusAreas'>> }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'skip' }
  | { type: 'edit'; step: QuestionStep }
  /** Ends restoration for `userId`, with their draft or null when there is none. */
  | {
      type: 'restore';
      userId: string;
      draft: Pick<OnboardingDraft, 'userId' | 'step' | 'answers'> | null;
    }
  | { type: 'saved'; navigation: number }
  | { type: 'reset'; ownerId: string; displayName: string };

export function createInitialState(
  displayName = '',
  ownerId: string | null = null,
  restoring = false,
): OnboardingState {
  return {
    ownerId,
    step: 'intro',
    answers: createInitialAnswers(displayName),
    returnToReview: false,
    notice: null,
    navigation: 0,
    pendingSave: false,
    restoring,
  };
}

export type ContinueCheck = { ok: true } | { ok: false; reason: string };

const valid: ContinueCheck = { ok: true };

function firstIssue(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues[0]?.message ?? 'Check this answer.';
}

/** Whether Continue is enabled, and the reason to announce when it is not. */
export function canContinue(step: OnboardingStep, answers: OnboardingAnswers): ContinueCheck {
  switch (step) {
    case 'intro':
    case 'horizon':
    case 'dailyTime':
      return valid;
    case 'name': {
      const result = displayNameSchema.safeParse(answers.displayName);
      return result.success ? valid : { ok: false, reason: firstIssue(result) };
    }
    case 'focusAreas': {
      const result = focusAreasSchema.safeParse(answers.focusAreas);
      return result.success ? valid : { ok: false, reason: firstIssue(result) };
    }
    case 'goal': {
      const result = goalTitleSchema.safeParse(answers.goalTitle);
      if (!result.success) return { ok: false, reason: firstIssue(result) };
      return answers.goalCategory && answers.focusAreas.includes(answers.goalCategory)
        ? valid
        : { ok: false, reason: 'Choose what this goal is about.' };
    }
    case 'motivation': {
      const result = motivationSchema.safeParse(answers.motivation);
      if (!result.success) return { ok: false, reason: firstIssue(result) };
      return result.data === null ? { ok: false, reason: 'Write a reason, or tap Skip.' } : valid;
    }
    case 'checkIn':
      return answers.checkIn ? valid : { ok: false, reason: 'Choose when I should check in.' };
    case 'coachStyle':
      return answers.coachTone ? valid : { ok: false, reason: 'Choose a coaching style.' };
    case 'review': {
      const step = firstInvalidStep(answers);
      return step ? { ok: false, reason: 'Some answers need a look.' } : valid;
    }
  }
}

/** The first step whose answer would be rejected on submit, or null when all are valid. */
export function firstInvalidStep(answers: OnboardingAnswers): QuestionStep | null {
  const result = onboardingAnswersSchema.safeParse(answers);
  if (result.success) return null;
  const steps = result.error.issues
    .map((issue) => answerSteps[issue.path[0] as keyof OnboardingAnswers])
    .filter((step): step is QuestionStep => step !== undefined);
  return questionSteps.find((step) => steps.includes(step)) ?? null;
}

/** Android hardware back: Intro leaves the app; Completion swallows back; otherwise step back. */
export function hardwareBackAction(
  step: OnboardingStep,
  isCompleted: boolean,
): 'exit' | 'ignore' | 'back' {
  if (isCompleted) return 'ignore';
  if (step === 'intro') return 'exit';
  return 'back';
}

/** 1-based position among the eight questions, or null outside them. */
export function questionNumber(step: OnboardingStep): number | null {
  const index = questionSteps.indexOf(step as QuestionStep);
  return index === -1 ? null : index + 1;
}

function stepAfter(step: OnboardingStep): OnboardingStep {
  const index = onboardingSteps.indexOf(step);
  return onboardingSteps[Math.min(index + 1, onboardingSteps.length - 1)] ?? 'review';
}

function stepBefore(step: OnboardingStep): OnboardingStep {
  const index = onboardingSteps.indexOf(step);
  return onboardingSteps[Math.max(index - 1, 0)] ?? 'intro';
}

function navigate(state: OnboardingState, step: OnboardingStep, returnToReview = false) {
  return {
    ...state,
    step,
    returnToReview,
    notice: null,
    navigation: state.navigation + 1,
    pendingSave: true,
  };
}

/** Keeps the goal category among the chosen areas, defaulting to the first one. */
function withValidCategory(answers: OnboardingAnswers): OnboardingAnswers {
  if (answers.goalCategory && answers.focusAreas.includes(answers.goalCategory)) return answers;
  return { ...answers, goalCategory: answers.focusAreas[0] ?? null };
}

export function onboardingReducer(
  state: OnboardingState,
  action: OnboardingAction,
): OnboardingState {
  if (state.restoring && action.type !== 'restore' && action.type !== 'reset') return state;

  switch (action.type) {
    case 'setText': {
      const value = clampToCodePoints(action.value, textInputLimits[action.field]);
      return { ...state, answers: { ...state.answers, [action.field]: value } };
    }

    case 'toggleFocusArea': {
      const { focusAreas } = state.answers;
      if (focusAreas.includes(action.area)) {
        const answers = {
          ...state.answers,
          focusAreas: focusAreas.filter((a) => a !== action.area),
        };
        return { ...state, answers: withValidCategory(answers), notice: null };
      }
      if (focusAreas.length >= MAX_FOCUS_AREAS) return { ...state, notice: 'maxFocusAreas' };
      const answers = { ...state.answers, focusAreas: [...focusAreas, action.area] };
      return { ...state, answers: withValidCategory(answers), notice: null };
    }

    case 'answer': {
      const answers = { ...state.answers, ...action.patch };
      return { ...state, answers: withValidCategory(answers) };
    }

    case 'next':
      if (state.step === 'review' || !canContinue(state.step, state.answers).ok) return state;
      return navigate(state, state.returnToReview ? 'review' : stepAfter(state.step));

    case 'back':
      if (state.step === 'intro') return state;
      return navigate(state, state.returnToReview ? 'review' : stepBefore(state.step));

    case 'skip':
      if (state.step !== 'motivation') return state;
      return navigate(
        { ...state, answers: { ...state.answers, motivation: '' } },
        state.returnToReview ? 'review' : stepAfter(state.step),
      );

    case 'edit':
      return navigate(state, action.step, true);

    case 'restore': {
      // Once restoration is over, answers belong to the user: a late draft never replaces them.
      if (!state.restoring || action.userId !== state.ownerId) return state;
      const { draft } = action;
      if (!draft || draft.userId !== state.ownerId) return { ...state, restoring: false };
      return {
        ...state,
        step: draft.step,
        answers: withValidCategory(draft.answers),
        returnToReview: false,
        notice: null,
        pendingSave: false,
        restoring: false,
      };
    }

    case 'saved':
      return action.navigation === state.navigation ? { ...state, pendingSave: false } : state;

    case 'reset':
      if (action.ownerId === state.ownerId) return state;
      return createInitialState(action.displayName, action.ownerId, true);
  }
}
