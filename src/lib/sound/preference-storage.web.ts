const SOUND_KEY = 'aicoach.sound-effects';

export async function loadFlag(key: string): Promise<boolean | null> {
  try {
    const value = window.localStorage.getItem(key);
    return value === 'on' ? true : value === 'off' ? false : null;
  } catch {
    return null;
  }
}

export async function saveFlag(key: string, enabled: boolean): Promise<void> {
  try {
    window.localStorage.setItem(key, enabled ? 'on' : 'off');
  } catch {
    // Private mode or blocked storage: the choice still applies for this session.
  }
}

export const loadSoundEnabled = () => loadFlag(SOUND_KEY);
export const saveSoundEnabled = (enabled: boolean) => saveFlag(SOUND_KEY, enabled);
