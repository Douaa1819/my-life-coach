import { act, fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { AnimatedCheck } from '@/components/ui';
import { playSound } from '@/lib/sound/play-sound';
import { renderWithProviders } from '@/test/render';

let mockReduceMotion = false;

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => mockReduceMotion,
}));
jest.mock('@/lib/sound/play-sound', () => ({ playSound: jest.fn() }));

function Harness({ sound = true }: { sound?: boolean }) {
  const [checked, setChecked] = useState(false);
  return (
    <AnimatedCheck
      checked={checked}
      onChange={setChecked}
      label="Walk for 20 minutes"
      sound={sound}
    />
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockReduceMotion = false;
});
afterEach(() => jest.useRealTimers());

describe('AnimatedCheck', () => {
  test('toggles, announces its state and plays the done sound only when checking', async () => {
    await renderWithProviders(<Harness />);
    const box = screen.getByRole('checkbox', { name: 'Walk for 20 minutes' });
    expect(box).not.toBeChecked();

    await fireEvent.press(box);
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    expect(screen.getByRole('checkbox', { name: 'Walk for 20 minutes' })).toBeChecked();
    expect(playSound).toHaveBeenCalledWith('taskDone');

    await fireEvent.press(box);
    expect(screen.getByRole('checkbox', { name: 'Walk for 20 minutes' })).not.toBeChecked();
    expect(playSound).toHaveBeenCalledTimes(1);
  });

  test('stays silent when its own sound is off', async () => {
    await renderWithProviders(<Harness sound={false} />);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Walk for 20 minutes' }));
    expect(playSound).not.toHaveBeenCalled();
  });

  test('still works under reduced motion', async () => {
    mockReduceMotion = true;
    await renderWithProviders(<Harness />);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Walk for 20 minutes' }));
    expect(screen.getByRole('checkbox', { name: 'Walk for 20 minutes' })).toBeChecked();
  });
});
