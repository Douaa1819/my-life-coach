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
