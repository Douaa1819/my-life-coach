import { act, screen } from '@testing-library/react-native';

import { Skeleton } from '@/components/ui';
import { renderWithProviders } from '@/test/render';

let mockReduceMotion = false;

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => mockReduceMotion,
}));

beforeEach(() => {
  jest.useFakeTimers();
  mockReduceMotion = false;
});
afterEach(() => jest.useRealTimers());

describe('Skeleton', () => {
  test('breathes: its opacity dips while loading', async () => {
    await renderWithProviders(<Skeleton height={14} />);
    const block = screen.getByTestId('skeleton', { includeHiddenElements: true });
    await act(async () => {
      jest.advanceTimersByTime(700);
    });
    expect(block).toHaveAnimatedStyle({ opacity: 0.55 });
  });

  test('stays still under reduced motion', async () => {
    mockReduceMotion = true;
    await renderWithProviders(<Skeleton height={14} />);
    const block = screen.getByTestId('skeleton', { includeHiddenElements: true });
    await act(async () => {
      jest.advanceTimersByTime(700);
    });
    expect(block).toHaveAnimatedStyle({ opacity: 1 });
  });
});
