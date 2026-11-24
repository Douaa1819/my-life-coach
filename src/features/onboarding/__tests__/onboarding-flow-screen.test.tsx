import { act, fireEvent, screen, userEvent } from '@testing-library/react-native';
import { BackHandler } from 'react-native';

import { renderWithProviders } from '@/test/render';

import { type Onboarding } from '../onboarding-gate';
import { OnboardingSubmitError } from '../onboarding.api';
import { createInitialState, type OnboardingState } from '../onboarding-flow';
import {
  checkInOptions,
  coachToneOptions,
  dailyMinutesOptions,
  horizonOptions,
} from '../onboarding.schema';
import { OnboardingFlowScreen } from '../screens/onboarding-flow-screen';
import { completeAnswers, USER_A } from './onboarding-fixtures';

const mockReplace = jest.fn();

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    router: { replace: (...args: unknown[]) => mockReplace(...args), push: jest.fn() },
    // Runs the callback like a focused screen so the hardware back handler registers.
    useFocusEffect: (callback: () => void | (() => void)) => useEffect(callback, [callback]),
  };
});

jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({ signOut: jest.fn(), state: { notice: null } }),
}));

jest.mock('@/features/profile/use-profile', () => ({
  useProfile: () => ({ data: { timezone: 'Africa/Casablanca' } }),
}));

const idle = { isPending: false, isError: false, isSuccess: false, error: null };

function flow(state: Partial<OnboardingState> = {}, extra: Partial<Onboarding> = {}): Onboarding {
  return {
    state: { ...createInitialState('Sara', USER_A), restoring: false, ...state },
    dispatch: jest.fn(),
    isRestoring: false,
    isCompleted: false,
    submit: idle as Onboarding['submit'],
    submitAnswers: jest.fn(),
    finish: jest.fn(async () => undefined),
    ...extra,
  };
}

/** Captures the hardware back handler the screen registers while focused. */
function captureBackHandler() {
  let handler: (() => boolean | null | undefined) | undefined;
  const remove = jest.fn();
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, callback) => {
    handler = callback;
    return { remove };
  });
  return { press: () => handler?.(), remove };
}

async function renderFlow(onboarding: Onboarding) {
  return renderWithProviders(<OnboardingFlowScreen onboarding={onboarding} />);
}

afterEach(() => jest.restoreAllMocks());
beforeEach(() => mockReplace.mockClear());

describe('OnboardingFlowScreen hardware back', () => {
  test('on the intro it leaves the app', async () => {
    const back = captureBackHandler();
    const onboarding = flow({ step: 'intro' });
    await renderFlow(onboarding);

    expect(back.press()).toBe(false);
    expect(onboarding.dispatch).not.toHaveBeenCalled();
  });

  test('on a question it goes back one step instead of leaving', async () => {
    const back = captureBackHandler();
    const onboarding = flow({ step: 'horizon', answers: completeAnswers() });
    await renderFlow(onboarding);

    await act(async () => {
      expect(back.press()).toBe(true);
    });
    expect(onboarding.dispatch).toHaveBeenCalledWith({ type: 'back' });
  });

  test('after completion it is swallowed so the user cannot return to the questions', async () => {
    const back = captureBackHandler();
    const onboarding = flow({ answers: completeAnswers() }, { isCompleted: true });
    await renderFlow(onboarding);

    expect(back.press()).toBe(true);
    expect(onboarding.dispatch).not.toHaveBeenCalled();
  });

  test('the handler is removed on unmount', async () => {
    const back = captureBackHandler();
    const view = await renderFlow(flow({ step: 'goal', answers: completeAnswers() }));
    await view.unmount();
    expect(back.remove).toHaveBeenCalled();
  });
});

describe('OnboardingFlowScreen step wiring', () => {
  test('goal step edits the title, picks a category and continues from the keyboard', async () => {
    const onboarding = flow({
      step: 'goal',
      answers: completeAnswers({ focusAreas: ['health', 'career'], goalTitle: 'Run' }),
    });
    await renderFlow(onboarding);

    await fireEvent.changeText(screen.getByLabelText('Your goal'), 'Run 10 km');
    expect(onboarding.dispatch).toHaveBeenCalledWith({
      type: 'setText',
      field: 'goalTitle',
      value: 'Run 10 km',
    });

    await userEvent.setup().press(screen.getByRole('radio', { name: /Career/ }));
    expect(onboarding.dispatch).toHaveBeenCalledWith({
      type: 'answer',
      patch: { goalCategory: 'career' },
    });

    await fireEvent(screen.getByLabelText('Your goal'), 'submitEditing');
    expect(onboarding.dispatch).toHaveBeenCalledWith({ type: 'next' });
  });

  test('goal step blocks Continue on an empty title and keeps the step', async () => {
    const onboarding = flow({ step: 'goal', answers: completeAnswers({ goalTitle: '' }) });
    await renderFlow(onboarding);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Continue' }));
    expect(onboarding.dispatch).not.toHaveBeenCalledWith({ type: 'next' });
  });

  test.each([
    ['horizon', horizonOptions[2]!.label, { horizon: horizonOptions[2]!.value }],
    ['dailyTime', dailyMinutesOptions[0]!.label, { dailyMinutes: dailyMinutesOptions[0]!.value }],
    ['checkIn', checkInOptions[3]!.label, { checkIn: checkInOptions[3]!.value }],
    ['coachStyle', coachToneOptions[1]!.label, { coachTone: coachToneOptions[1]!.value }],
  ] as const)('%s step records the chosen option', async (step, label, patch) => {
    const onboarding = flow({ step, answers: completeAnswers() });
    await renderFlow(onboarding);

    await userEvent.setup().press(screen.getByRole('radio', { name: new RegExp(`^${label}`) }));
    expect(onboarding.dispatch).toHaveBeenCalledWith({ type: 'answer', patch });
  });

  test('motivation step edits the text and continues from the keyboard', async () => {
    const onboarding = flow({ step: 'motivation', answers: completeAnswers() });
    await renderFlow(onboarding);

    await fireEvent.changeText(screen.getByLabelText('Your reason'), 'My family');
    expect(onboarding.dispatch).toHaveBeenCalledWith({
      type: 'setText',
      field: 'motivation',
      value: 'My family',
    });
    await fireEvent(screen.getByLabelText('Your reason'), 'submitEditing');
    expect(onboarding.dispatch).toHaveBeenCalledWith({ type: 'next' });
  });

  test('name step submits from the keyboard', async () => {
    const onboarding = flow({ step: 'name', answers: completeAnswers() });
    await renderFlow(onboarding);

    await fireEvent(screen.getByDisplayValue('Sara'), 'submitEditing');
    expect(onboarding.dispatch).toHaveBeenCalledWith({ type: 'next' });
  });
});

describe('OnboardingFlowScreen review errors', () => {
  const review = (error: unknown) =>
    flow(
      { step: 'review', answers: completeAnswers() },
      { submit: { ...idle, isError: true, error } as Onboarding['submit'] },
    );

  test('a validation error tells the user to look at their answers', async () => {
    await renderFlow(review(new OnboardingSubmitError('invalid', 'goal')));
    expect(screen.getByText('Some answers need a look.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeOnTheScreen();
  });

  test('an unexpected error keeps the answers and does not leak details', async () => {
    await renderFlow(review(new Error('select * from secrets')));
    expect(screen.getByText('Something went wrong. Your answers are kept.')).toBeOnTheScreen();
    expect(screen.queryByText(/secrets/)).toBeNull();
  });

  test('errors are not shown on other steps', async () => {
    const onboarding = review(new OnboardingSubmitError('network'));
    onboarding.state = { ...onboarding.state, step: 'horizon' };
    await renderFlow(onboarding);
    expect(screen.queryByText(/Your answers are kept/)).toBeNull();
  });
});
