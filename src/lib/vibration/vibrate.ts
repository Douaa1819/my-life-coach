import { Platform, Vibration } from 'react-native';

import { useVibrationPreference } from './vibration-preference';

export type VibrationName = 'taskDone' | 'goalReached';

/** Short, light patterns: wait, buzz, wait, buzz... in milliseconds. */
export const patterns: Record<VibrationName, number | number[]> = {
  taskDone: 12,
  goalReached: [0, 14, 70, 22],
};

/** Vibrates only when the person turned it on. Never throws; web has nothing to do. */
export function vibrate(name: VibrationName): void {
  if (Platform.OS === 'web') return;
  if (!useVibrationPreference.getState().enabled) return;
  try {
    Vibration.vibrate(patterns[name] as number | number[]);
  } catch {
    // ignore
  }
}
