import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useVibrationPreference } from './vibration-preference';

export type VibrationName = 'taskDone' | 'goalReached';

/**
 * Native haptic feedback (Taptic Engine on iOS, the system haptic motor on Android), not a
 * timed buzz: a light tap for a finished task and the system "success" pattern for a goal.
 * The system's own settings still apply: iOS skips them when System Haptics is off and
 * Android follows the touch-feedback setting.
 */
const feedback: Record<VibrationName, () => Promise<void>> = {
  taskDone: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  goalReached: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
};

/** Plays haptics only when the person turned them on. Never throws; web has nothing to do. */
export function vibrate(name: VibrationName): void {
  if (Platform.OS === 'web') return;
  if (!useVibrationPreference.getState().enabled) return;
  try {
    void feedback[name]().catch(() => undefined);
  } catch {
    // Haptics are an extra; a missing motor or disabled setting must never reach the person.
  }
}
