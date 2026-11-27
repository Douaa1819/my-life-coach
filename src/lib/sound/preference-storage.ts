import * as SecureStore from 'expo-secure-store';

const KEY = 'aicoach.sound-effects';

/** A device setting, not personal data. Every failure resolves quietly. */
export async function loadSoundEnabled(): Promise<boolean | null> {
  try {
    const value = await SecureStore.getItemAsync(KEY);
    return value === 'on' ? true : value === 'off' ? false : null;
  } catch {
    return null;
  }
}

export async function saveSoundEnabled(enabled: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, enabled ? 'on' : 'off');
  } catch {
    // The choice still applies for this session.
  }
}
