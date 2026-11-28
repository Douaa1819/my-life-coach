import * as Haptics from 'expo-haptics';

import { vibrate } from '../vibrate';
import { useVibrationPreference } from '../vibration-preference';

jest.mock('@/lib/sound/preference-storage', () => ({
  loadFlag: jest.fn(async () => null),
  saveFlag: jest.fn(async () => undefined),
}));

describe('vibrate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useVibrationPreference.setState({ enabled: false, hydrated: true });
  });

  test('is off until the person turns it on', () => {
    vibrate('taskDone');
    vibrate('goalReached');
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  test('a finished task is a light tap', () => {
    useVibrationPreference.getState().setEnabled(true);
    vibrate('taskDone');
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  test('a reached goal uses the system success pattern', () => {
    useVibrationPreference.getState().setEnabled(true);
    vibrate('goalReached');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success,
    );
  });

  test('a failing haptic engine never throws', () => {
    useVibrationPreference.getState().setEnabled(true);
    jest.mocked(Haptics.impactAsync).mockRejectedValueOnce(new Error('no motor'));
    expect(() => vibrate('taskDone')).not.toThrow();
  });
});
