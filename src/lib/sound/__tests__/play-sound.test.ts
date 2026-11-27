import { playNotes } from '../player';
import { playSound, resetSoundThrottle } from '../play-sound';
import { loadSoundEnabled } from '../preference-storage';
import { useSoundPreference } from '../sound-preference';
import { sounds } from '../sounds';

jest.mock('../player', () => ({ playNotes: jest.fn(async () => undefined) }));
jest.mock('../preference-storage', () => ({
  loadSoundEnabled: jest.fn(async () => null),
  saveSoundEnabled: jest.fn(async () => undefined),
}));

const mockPlay = jest.mocked(playNotes);

describe('playSound', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSoundThrottle();
    useSoundPreference.setState({ enabled: true, hydrated: true });
  });

  test('plays the requested sound when sound is on', () => {
    playSound('goalReached');
    expect(mockPlay).toHaveBeenCalledWith(sounds.goalReached, expect.any(Number), 'goalReached');
  });

  test('stays silent when the person turned sound off', () => {
    useSoundPreference.getState().setEnabled(false);
    playSound('taskDone');
    expect(mockPlay).not.toHaveBeenCalled();
  });

  test('skips a second sound that arrives too quickly', () => {
    playSound('taskDone', 10_000);
    playSound('taskDone', 10_500);
    playSound('goalReached', 12_000);
    expect(mockPlay).toHaveBeenCalledTimes(2);
  });

  test('every sound is short and plays once', () => {
    for (const notes of Object.values(sounds)) {
      const length = Math.max(...notes.map((note) => note.start + note.duration));
      expect(length).toBeLessThan(0.7);
    }
  });
});

describe('sound preference', () => {
  test('a saved "off" silences sounds once loaded at app start', async () => {
    resetSoundThrottle();
    jest.mocked(loadSoundEnabled).mockResolvedValueOnce(false);
    useSoundPreference.setState({ enabled: true, hydrated: false });
    await useSoundPreference.getState().hydrate();
    playSound('goalReached');
    expect(mockPlay).not.toHaveBeenCalled();
  });

  test('a choice made before loading wins over the stored one', async () => {
    jest.mocked(loadSoundEnabled).mockResolvedValueOnce(true);
    useSoundPreference.setState({ enabled: true, hydrated: false });
    const hydrating = useSoundPreference.getState().hydrate();
    useSoundPreference.getState().setEnabled(false);
    await hydrating;
    expect(useSoundPreference.getState().enabled).toBe(false);
  });
});
