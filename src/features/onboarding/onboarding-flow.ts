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
} from './onboarding.schema';

export type OnboardingNotice = 'maxFocusAreas' | null;

export type OnboardingState = {
  step: OnboardingStep;
  answers: OnboardingAnswers;
  /** Set by Edit on Review: Continue and Back return to Review. */
  returnToReview: boolean;
  notice: OnboardingNotice;
  /** Increments on every navigation, so the draft is saved per step, not per keystroke. */
  navigation: number;
};

type TextAnswer = 'displayName' | 'goalTitle' | 'motivation';

export type OnboardingAction =
  | { type: 'setText'; field: TextAnswer; value: string }
  | { type: 'toggleFocusArea'; area: FocusArea }
  | { type: 'answer'; patch: Partial<Omit<OnboardingAnswers, TextAnswer | 'focusAreas'>> }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'skip' }
  | { type: 'edit'; step: QuestionStep }
  | { type: 'restore'; draft: Pick<OnboardingDraft, 'step' | 'answers'> };

export function createInitialState(displayName = ''): OnboardingState {
  return {
    step: 'intro',
    answers: createInitialAnswers(displayName),
    returnToReview: false,
    notice: null,
    navigation: 0,
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
  return { ...state, step, returnToReview, notice: null, navigation: state.navigation + 1 };
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
  switch (action.type) {
    case 'setText':
      return { ...state, answers: { ...state.answers, [action.field]: action.value } };

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

    case 'restore':
      return {
        ...state,
        step: action.draft.step,
        answers: withValidCategory(action.draft.answers),
        returnToReview: false,
        notice: null,
      };
  }
}
