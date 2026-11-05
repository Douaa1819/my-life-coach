import { act, fireEvent, screen } from '@testing-library/react-native';

import { StepProgress } from '@/components/ui';
import { renderWithProviders } from '@/test/render';

let mockReduceMotion = false;

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => mockReduceMotion,
}));

async function settle() {
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
}

/** Four segments of 40 dp with three 4 dp gaps. */
async function measure() {
  await fireEvent(screen.getByRole('progressbar'), 'layout', {
    nativeEvent: { layout: { width: 172, height: 4, x: 0, y: 0 } },
  });
  await settle();
}

const fill = (index: number) => screen.getByTestId(`step-progress-fill-${index}`);

beforeEach(() => {
  jest.useFakeTimers();
  mockReduceMotion = false;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('StepProgress', () => {
  test('is announced as "Step 3 of 8"', async () => {
    await renderWithProviders(<StepProgress current={3} total={8} label="Onboarding" />);
    expect(screen.getByRole('progressbar', { name: 'Onboarding' })).toHaveAccessibilityValue({
      min: 0,
      max: 8,
      now: 3,
      text: 'Step 3 of 8',
    });
  });

  test('clamps out-of-range and invalid steps', async () => {
    const { rerender } = await renderWithProviders(<StepProgress current={12} total={8} />);
    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 8 });

    await rerender(<StepProgress current={Number.NaN} total={8} />);
    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 0 });
  });

  test('renders one segment per step, hidden until measured', async () => {
    await renderWithProviders(<StepProgress current={1} total={4} />);
    expect(screen.getAllByTestId(/^step-progress-fill-/)).toHaveLength(4);
    expect(fill(0)).toHaveAnimatedStyle({ opacity: 0 });
  });

  test('fills segments up to the current step, and empties them going back', async () => {
    const { rerender } = await renderWithProviders(<StepProgress current={2} total={4} />);
    await measure();
    expect(fill(0)).toHaveAnimatedStyle({ opacity: 1, transform: [{ translateX: 0 }] });
    expect(fill(1)).toHaveAnimatedStyle({ transform: [{ translateX: 0 }] });
    expect(fill(2)).toHaveAnimatedStyle({ transform: [{ translateX: -40 }] });

    await rerender(<StepProgress current={3} total={4} />);
    await settle();
    expect(fill(2)).toHaveAnimatedStyle({ transform: [{ translateX: 0 }] });

    await rerender(<StepProgress current={1} total={4} />);
    await settle();
    expect(fill(1)).toHaveAnimatedStyle({ transform: [{ translateX: -40 }] });
    expect(fill(2)).toHaveAnimatedStyle({ transform: [{ translateX: -40 }] });
    expect(fill(0)).toHaveAnimatedStyle({ transform: [{ translateX: 0 }] });
  });

  test('the change animates rather than jumping', async () => {
    const { rerender } = await renderWithProviders(<StepProgress current={1} total={4} />);
    await measure();

    await rerender(<StepProgress current={2} total={4} />);
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(fill(1)).not.toHaveAnimatedStyle({ transform: [{ translateX: 0 }] });
    expect(fill(1)).not.toHaveAnimatedStyle({ transform: [{ translateX: -40 }] });
  });

  test('under reduced motion the bar jumps to the new step', async () => {
    mockReduceMotion = true;
    const { rerender } = await renderWithProviders(<StepProgress current={1} total={4} />);
    await measure();

    await rerender(<StepProgress current={2} total={4} />);
    expect(fill(1)).toHaveAnimatedStyle({ transform: [{ translateX: 0 }] });
  });
});
