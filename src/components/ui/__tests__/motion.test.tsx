import { act, fireEvent, screen } from '@testing-library/react-native';

import { Button, Card, ProgressBar, Text } from '@/components/ui';
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

beforeEach(() => {
  jest.useFakeTimers();
  mockReduceMotion = false;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('press feedback', () => {
  test('button springs to 0.97 on press-in and back to 1 on release', async () => {
    await renderWithProviders(<Button label="Continue" onPress={jest.fn()} />);
    const button = screen.getByRole('button', { name: 'Continue' });

    await fireEvent(button, 'pressIn');
    await settle();
    expect(button).toHaveAnimatedStyle({ transform: [{ scale: 0.97 }] });

    await fireEvent(button, 'pressOut');
    await settle();
    expect(button).toHaveAnimatedStyle({ transform: [{ scale: 1 }] });
  });

  test('pressable card springs to 0.98', async () => {
    await renderWithProviders(
      <Card onPress={jest.fn()} accessibilityLabel="Open goal">
        <Text>Goal</Text>
      </Card>,
    );
    const card = screen.getByRole('button', { name: 'Open goal' });

    await fireEvent(card, 'pressIn');
    await settle();
    expect(card).toHaveAnimatedStyle({ transform: [{ scale: 0.98 }] });
  });

  test('does not scale under reduced motion but still presses', async () => {
    mockReduceMotion = true;
    const onPress = jest.fn();
    await renderWithProviders(<Button label="Continue" onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Continue' });

    await fireEvent(button, 'pressIn');
    await settle();
    expect(button).toHaveAnimatedStyle({ transform: [{ scale: 1 }] });

    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('ProgressBar', () => {
  test('clamps the reported value', async () => {
    await renderWithProviders(
      <>
        <ProgressBar value={1.4} label="Over" />
        <ProgressBar value={Number.NaN} label="Invalid" />
      </>,
    );

    expect(screen.getByRole('progressbar', { name: 'Over' })).toHaveAccessibilityValue({
      now: 100,
    });
    expect(screen.getByRole('progressbar', { name: 'Invalid' })).toHaveAccessibilityValue({
      now: 0,
    });
  });

  test('animates the fill with a transform once the track is measured', async () => {
    const { rerender } = await renderWithProviders(<ProgressBar value={0.5} label="Today" />);
    const track = screen.getByRole('progressbar', { name: 'Today' });
    const fill = track.children[0];
    if (typeof fill === 'string' || !fill) throw new Error('Missing progress fill');

    expect(fill).toHaveAnimatedStyle({ opacity: 0 });

    await fireEvent(track, 'layout', {
      nativeEvent: { layout: { width: 200, height: 8, x: 0, y: 0 } },
    });
    await settle();
    expect(fill).toHaveAnimatedStyle({ opacity: 1, transform: [{ translateX: -100 }] });

    await rerender(<ProgressBar value={1} label="Today" />);
    await settle();
    expect(fill).toHaveAnimatedStyle({ transform: [{ translateX: 0 }] });
  });
});
