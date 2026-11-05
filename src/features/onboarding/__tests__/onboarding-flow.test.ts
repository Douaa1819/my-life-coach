import {
  canContinue,
  createInitialState,
  firstInvalidStep,
  type OnboardingAction,
  onboardingReducer,
  type OnboardingState,
  questionNumber,
} from '../onboarding-flow';
import { type OnboardingAnswers, type OnboardingStep } from '../onboarding.schema';
import { completeAnswers, USER_A, USER_B } from './onboarding-fixtures';

function run(state: OnboardingState, ...actions: OnboardingAction[]) {
  return actions.reduce(onboardingReducer, state);
}

describe('onboardingReducer', () => {
  test('walks forward through every step to Review', () => {
    let state = createInitialState('Sara');
    state = run(state, { type: 'next' });
    expect(state.step).toBe('name');

    state = run(
      state,
      { type: 'next' },
      { type: 'toggleFocusArea', area: 'health' },
      { type: 'next' },
      { type: 'setText', field: 'goalTitle', value: 'Run 5 km' },
      { type: 'next' },
      { type: 'next' },
      { type: 'skip' },
      { type: 'next' },
      { type: 'answer', patch: { checkIn: 'evening' } },
      { type: 'next' },
      { type: 'answer', patch: { coachTone: 'direct' } },
      { type: 'next' },
    );

    expect(state.step).toBe('review');
    expect(state.answers.goalCategory).toBe('health');
    expect(firstInvalidStep(state.answers)).toBeNull();
  });

  test('Continue does nothing while the step is invalid', () => {
    const state = run(createInitialState(''), { type: 'next' }, { type: 'next' });
    expect(state.step).toBe('name');
  });

  test('Back keeps answers and stops at Intro', () => {
    let state = run(createInitialState('Sara'), { type: 'next' }, { type: 'next' });
    state = run(state, { type: 'toggleFocusArea', area: 'learning' }, { type: 'back' });
    expect(state.step).toBe('name');
    state = run(state, { type: 'back' }, { type: 'back' });
    expect(state.step).toBe('intro');
    expect(state.answers.focusAreas).toEqual(['learning']);
  });

  test('blocks a fourth focus area with a notice', () => {
    const state = run(
      createInitialState('Sara'),
      { type: 'toggleFocusArea', area: 'health' },
      { type: 'toggleFocusArea', area: 'career' },
      { type: 'toggleFocusArea', area: 'learning' },
      { type: 'toggleFocusArea', area: 'finance' },
    );
    expect(state.answers.focusAreas).toEqual(['health', 'career', 'learning']);
    expect(state.notice).toBe('maxFocusAreas');

    const deselected = run(state, { type: 'toggleFocusArea', area: 'career' });
    expect(deselected.answers.focusAreas).toEqual(['health', 'learning']);
    expect(deselected.notice).toBeNull();
  });

  test('removing the goal category falls back to the first remaining area', () => {
    const state = run(
      { ...createInitialState('Sara'), answers: completeAnswers() },
      { type: 'toggleFocusArea', area: 'health' },
    );
    expect(state.answers.goalCategory).toBe('career');
  });

  test('Skip only works on the motivation step and clears the answer', () => {
    const atName = run(createInitialState('Sara'), { type: 'next' }, { type: 'skip' });
    expect(atName.step).toBe('name');

    const atMotivation = run(
      { ...createInitialState('Sara'), answers: completeAnswers(), step: 'motivation' },
      { type: 'skip' },
    );
    expect(atMotivation.step).toBe('dailyTime');
    expect(atMotivation.answers.motivation).toBe('');
  });

  test('Edit from Review returns to Review on Continue and on Back', () => {
    const atReview: OnboardingState = {
      ...createInitialState('Sara'),
      answers: completeAnswers(),
      step: 'review',
    };

    const edited = run(atReview, { type: 'edit', step: 'horizon' });
    expect(edited.step).toBe('horizon');
    expect(run(edited, { type: 'next' }).step).toBe('review');
    expect(run(edited, { type: 'back' }).step).toBe('review');
    expect(run(edited, { type: 'next' }).returnToReview).toBe(false);
  });

  test('restore replaces step and answers for the owner only', () => {
    const draft = { userId: USER_A, step: 'checkIn' as const, answers: completeAnswers() };

    const restored = run(createInitialState('', USER_A), { type: 'restore', draft });
    expect(restored.step).toBe('checkIn');
    expect(restored.answers.displayName).toBe('Sara');
    expect(restored.pendingSave).toBe(false);

    const foreign = run(createInitialState('', USER_B), { type: 'restore', draft });
    expect(foreign.step).toBe('intro');
    expect(foreign.answers.displayName).toBe('');
  });

  test('a save is pending after moves, not after typing', () => {
    let state = createInitialState('Sara', USER_A);
    state = run(state, { type: 'setText', field: 'displayName', value: 'Sam' });
    expect(state.pendingSave).toBe(false);

    state = run(state, { type: 'next' });
    expect(state.pendingSave).toBe(true);
    expect(run(state, { type: 'saved', navigation: state.navigation }).pendingSave).toBe(false);
    expect(run(state, { type: 'saved', navigation: state.navigation - 1 }).pendingSave).toBe(true);
  });

  test('reset starts over for a different user and ignores the same user', () => {
    const answered = run(
      { ...createInitialState('Sara', USER_A), answers: completeAnswers(), step: 'goal' },
      { type: 'reset', ownerId: USER_A, displayName: 'X' },
    );
    expect(answered.step).toBe('goal');

    const switched = run(answered, { type: 'reset', ownerId: USER_B, displayName: 'Bob' });
    expect(switched).toEqual(createInitialState('Bob', USER_B));
  });

  test('typed text is clamped to the field limits in code points', () => {
    const state = run(
      createInitialState('', USER_A),
      { type: 'setText', field: 'displayName', value: 'a'.repeat(60) },
      { type: 'setText', field: 'goalTitle', value: '🏃'.repeat(130) },
      { type: 'setText', field: 'motivation', value: 'b'.repeat(2000) },
    );
    expect(state.answers.displayName).toHaveLength(50);
    expect(Array.from(state.answers.goalTitle)).toHaveLength(120);
    expect(state.answers.motivation).toHaveLength(280);
  });
});

describe('canContinue', () => {
  const answers = completeAnswers();

  test.each<[OnboardingStep, Partial<OnboardingAnswers>, string]>([
    ['name', { displayName: ' ' }, 'Enter your first name.'],
    ['focusAreas', { focusAreas: [] }, 'Pick at least one area.'],
    ['goal', { goalTitle: 'ab' }, 'Tell me a bit more, at least 3 characters.'],
    ['motivation', { motivation: '' }, 'Write a reason, or tap Skip.'],
    ['checkIn', { checkIn: null }, 'Choose when I should check in.'],
    ['coachStyle', { coachTone: null }, 'Choose a coaching style.'],
  ])('%s explains why it is disabled', (step, override, reason) => {
    expect(canContinue(step, { ...answers, ...override })).toEqual({ ok: false, reason });
    expect(canContinue(step, answers)).toEqual({ ok: true });
  });
});

describe('questionNumber', () => {
  test('numbers the eight questions only', () => {
    expect(questionNumber('intro')).toBeNull();
    expect(questionNumber('name')).toBe(1);
    expect(questionNumber('coachStyle')).toBe(8);
    expect(questionNumber('review')).toBeNull();
  });
});

describe('firstInvalidStep', () => {
  test('points to the earliest step to fix', () => {
    expect(firstInvalidStep(completeAnswers({ coachTone: null, goalTitle: 'x' }))).toBe('goal');
  });
});
