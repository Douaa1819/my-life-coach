import { Vibration } from 'react-native';

import { vibrate } from '../vibrate';
import { useVibrationPreference } from '../vibration-preference';

jest.mock('@/lib/sound/preference-storage', () => ({
  loadFlag: jest.fn(async () => null),
  saveFlag: jest.fn(async () => undefined),
}));

describe('vibrate', () => {
  beforeEach(() => {
    jest.spyOn(Vibration, 'vibrate').mockImplementation(() => undefined);
    useVibrationPreference.setState({ enabled: false, hydrated: true });
  });
  afterEach(() => jest.restoreAllMocks());

  test('is off until the person turns it on', () => {
    vibrate('taskDone');
    expect(Vibration.vibrate).not.toHaveBeenCalled();
  });

  test('buzzes briefly when on', () => {
    useVibrationPreference.getState().setEnabled(true);
    vibrate('goalReached');
    expect(Vibration.vibrate).toHaveBeenCalledTimes(1);
  });
});
