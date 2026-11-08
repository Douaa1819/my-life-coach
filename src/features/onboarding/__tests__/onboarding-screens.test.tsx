import { screen, userEvent } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/render';

import { type Onboarding } from '../onboarding-gate';
import { OnboardingSubmitError } from '../onboarding.api';
import { createInitialState, type OnboardingState } from '../onboarding-flow';
import { completionBody } from '../onboarding-copy';
import { OnboardingFlowScreen } from '../screens/onboarding-flow-screen';
import { completeAnswers, USER_A } from './onboarding-fixtures';

const mockSignOut = jest.fn();
const mockReplace = jest.fn();
let mockReduceMotion = false;

jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args), push: jest.fn() },
  useFocusEffect: () => undefined,
}));

jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({ signOut: mockSignOut, state: { notice: null } }),
}));

jest.mock('@/features/profile/use-profile', () => ({
  useProfile: () => ({ data: { timezone: 'Africa/Casablanca' } }),
}));

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => mockReduceMotion,
}));

function idleSubmit(overrides: Partial<Onboarding['submit']> = {}): Onboarding['submit'] {
  return {
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
    ...overrides,
  } as Onboarding['submit'];
}

function flow(state: Partial<OnboardingState> = {}, extra: Partial<Onboarding> = {}): Onboarding {
  return {
    state: {
      ...createInitialState('Sara', USER_A),
      restoring: false,
      ...state,
    },
    dispatch: jest.fn(),
    isRestoring: false,
    isCompleted: false,
    submit: idleSubmit(),
    submitAnswers: jest.fn(),
    finish: jest.fn(async () => undefined),
    ...extra,
  };
}

async function renderFlow(onboarding: Onboarding) {
  return renderWithProviders(<OnboardingFlowScreen onboarding={onboarding} />);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockReduceMotion = false;
});

describe('OnboardingFlowScreen', () => {
  test('intro starts the questionnaire and can sign out', async () => {
    const onboarding = flow();
    await renderFlow(onboarding);

    expect(screen.getByRole('heading', { name: /shape your first plan/i })).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: "Let's start" }));
    expect(onboarding.dispatch).toHaveBeenCalledWith({ type: 'next' });

    await userEvent.setup().press(screen.getByRole('button', { name: 'Sign out' }));
    expect(mockSignOut).toHaveBeenCalled();
  });

  test('Continue on an empty name explains why and stays on the step', async () => {
    const onboarding = flow({ step: 'name', answers: completeAnswers({ displayName: ' ' }) });
    await renderFlow(onboarding);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Enter your first name.')).toBeOnTheScreen();
    expect(onboarding.dispatch).not.toHaveBeenCalledWith({ type: 'next' });
  });

  test('a valid name continues', async () => {
    const onboarding = flow({ step: 'name', answers: completeAnswers() });
    await renderFlow(onboarding);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Continue' }));
    expect(onboarding.dispatch).toHaveBeenCalledWith({ type: 'next' });
  });

  test('blocks a fourth focus area and announces the limit', async () => {
    const onboarding = flow({
      step: 'focusAreas',
      answers: completeAnswers({ focusAreas: ['health', 'career', 'learning'] }),
      notice: 'maxFocusAreas',
    });
    await renderFlow(onboarding);

    expect(screen.getByText('You can pick up to three')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('checkbox', { name: 'Money' }));
    expect(onboarding.dispatch).toHaveBeenCalledWith({ type: 'toggleFocusArea', area: 'finance' });
  });

  test('Back keeps answers', async () => {
    const onboarding = flow({
      step: 'horizon',
      answers: completeAnswers({ goalTitle: 'Run 5 km' }),
    });
    await renderFlow(onboarding);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Back' }));
    expect(onboarding.dispatch).toHaveBeenCalledWith({ type: 'back' });
  });

  test('Skip on motivation leaves the answer empty', async () => {
    const onboarding = flow({ step: 'motivation', answers: completeAnswers({ motivation: 'x' }) });
    await renderFlow(onboarding);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Skip' }));
    expect(onboarding.dispatch).toHaveBeenCalledWith({ type: 'skip' });
  });

  test('Review Edit jumps to that step', async () => {
    const onboarding = flow({ step: 'review', answers: completeAnswers() });
    await renderFlow(onboarding);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Edit Horizon' }));
    expect(onboarding.dispatch).toHaveBeenCalledWith({ type: 'edit', step: 'horizon' });
  });

  test('Build my first day submits once while a request is in flight', async () => {
    const submitAnswers = jest.fn();
    const onboarding = flow(
      { step: 'review', answers: completeAnswers() },
      { submitAnswers, submit: idleSubmit({ isPending: true }) },
    );
    await renderFlow(onboarding);

    expect(screen.getByRole('button', { name: 'Build my first day' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Edit Name' })).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Build my first day' }));
    expect(submitAnswers).not.toHaveBeenCalled();
  });

  test('a network error keeps answers and offers Try again', async () => {
    const submitAnswers = jest.fn();
    const onboarding = flow(
      { step: 'review', answers: completeAnswers() },
      {
        submitAnswers,
        submit: idleSubmit({
          isError: true,
          error: new OnboardingSubmitError('network'),
        }),
      },
    );
    await renderFlow(onboarding);

    expect(screen.getByText("Can't reach the server. Your answers are kept.")).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Try again' }));
    expect(submitAnswers).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Run 5 km')).toBeOnTheScreen();
  });

  test('completion does not claim missions were generated', async () => {
    const finish = jest.fn(async () => undefined);
    await renderFlow(flow({ answers: completeAnswers() }, { isCompleted: true, finish }));

    expect(
      screen.getByRole('heading', { name: /Your first day is ready, Sara/ }),
    ).toBeOnTheScreen();
    expect(screen.getByText(completionBody)).toBeOnTheScreen();
    expect(screen.queryByText(/prepared .* missions/i)).not.toBeOnTheScreen();

    await userEvent.setup().press(screen.getByRole('button', { name: 'See my plan' }));
    expect(finish).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalled();
  });

  test('reduced motion still shows the question and actions', async () => {
    mockReduceMotion = true;
    await renderFlow(flow({ step: 'dailyTime', answers: completeAnswers() }));

    expect(
      screen.getByRole('heading', { name: /How much time can you give it/ }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeOnTheScreen();
  });

  test('check-in shows the profile time zone', async () => {
    await renderFlow(flow({ step: 'checkIn', answers: completeAnswers() }));
    expect(screen.getByText('Times in Africa/Casablanca')).toBeOnTheScreen();
  });

  test('coach style shows a live preview, not generated text', async () => {
    await renderFlow(
      flow({ step: 'coachStyle', answers: completeAnswers({ coachTone: 'gentle' }) }),
    );
    expect(screen.getByLabelText(/No rush, Sara/)).toBeOnTheScreen();
  });
});
