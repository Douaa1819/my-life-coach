import { setUpTests } from 'react-native-reanimated';

setUpTests();

// expo-audio needs its native module, which does not exist in Jest. Sound is an extra,
// so tests run with a silent stand-in.
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    volume: 1,
    play: jest.fn(),
    seekTo: jest.fn(async () => undefined),
    remove: jest.fn(),
  })),
  setAudioModeAsync: jest.fn(async () => undefined),
}));

// Haptics need device hardware; tests only check that the right feedback is requested.
jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
}));

// Form and journey tests drive many renders with Reanimated and the React Compiler; on a
// busy machine they can pass the 5 s default without anything being wrong.
jest.setTimeout(20000);
