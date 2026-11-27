const KEY = 'aicoach.sound-effects';

export async function loadSoundEnabled(): Promise<boolean | null> {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === 'on' ? true : value === 'off' ? false : null;
  } catch {
    return null;
  }
}

export async function saveSoundEnabled(enabled: boolean): Promise<void> {
  try {
    window.localStorage.setItem(KEY, enabled ? 'on' : 'off');
  } catch {
    // Private mode or blocked storage: the choice still applies for this session.
  }
}
