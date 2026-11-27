import * as SecureStore from 'expo-secure-store';

const SOUND_KEY = 'aicoach.sound-effects';

/** Device settings, not personal data. Every failure resolves quietly. */
export async function loadFlag(key: string): Promise<boolean | null> {
  try {
    const value = await SecureStore.getItemAsync(key);
    return value === 'on' ? true : value === 'off' ? false : null;
  } catch {
    return null;
  }
}

export async function saveFlag(key: string, enabled: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, enabled ? 'on' : 'off');
  } catch {
    // The choice still applies for this session.
  }
}

export const loadSoundEnabled = () => loadFlag(SOUND_KEY);
export const saveSoundEnabled = (enabled: boolean) => saveFlag(SOUND_KEY, enabled);
