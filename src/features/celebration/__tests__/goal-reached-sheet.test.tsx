import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/render';
import { playSound } from '@/lib/sound/play-sound';

import { useCelebration } from '../celebration-store';
import { GoalReachedSheet } from '../goal-reached-sheet';

let mockReduceMotion = false;

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => mockReduceMotion,
}));
jest.mock('@/lib/sound/play-sound', () => ({ playSound: jest.fn() }));

const props = {
  goalTitle: 'Run a 10k by spring',
  reached: 2,
  total: 3,
  onChooseNext: jest.fn(),
  onDismiss: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockReduceMotion = false;
});

describe('GoalReachedSheet', () => {
  test('says what was reached, with progress in words, and plays one sound', async () => {
    await renderWithProviders(<GoalReachedSheet {...props} />);

    expect(screen.getByRole('heading', { name: 'Goal reached!' })).toBeOnTheScreen();
    expect(screen.getByText('Run a 10k by spring')).toBeOnTheScreen();
    expect(screen.getByText('2 of 3 goals reached')).toBeOnTheScreen();
    expect(playSound).toHaveBeenCalledTimes(1);
    expect(playSound).toHaveBeenCalledWith('goalReached');
    expect(screen.getByTestId('confetti', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  test('offers the next goal or closing, and nothing is required', async () => {
    await renderWithProviders(<GoalReachedSheet {...props} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Choose your next goal' }));
    expect(props.onChooseNext).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Not now' }));
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
  });

  test('under reduced motion the dots are not drawn, but everything else is', async () => {
    mockReduceMotion = true;
    await renderWithProviders(<GoalReachedSheet {...props} />);

    expect(screen.queryByTestId('confetti', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Goal reached!' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Choose your next goal' })).toBeOnTheScreen();
  });
});

describe('celebration store', () => {
  test('holds one goal at a time and clears on dismiss', () => {
    useCelebration.getState().celebrate('Run');
    expect(useCelebration.getState().goalTitle).toBe('Run');
    useCelebration.getState().dismiss();
    expect(useCelebration.getState().goalTitle).toBeNull();
  });
});
