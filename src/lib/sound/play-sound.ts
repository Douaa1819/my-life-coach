import { playNotes } from './player';
import { useSoundPreference } from './sound-preference';
import { MIN_GAP_MS, SOUND_VOLUME, type SoundName, sounds } from './sounds';

let lastPlayedAt = Number.NEGATIVE_INFINITY;

/**
 * Plays a short effect when the person has sound on. Never throws and never blocks.
 * Every message a sound carries is also shown on screen, so nothing depends on hearing it.
 */
export function playSound(name: SoundName, now: number = Date.now()): void {
  if (!useSoundPreference.getState().enabled) return;
  if (now - lastPlayedAt < MIN_GAP_MS) return;
  lastPlayedAt = now;
  void playNotes(sounds[name], SOUND_VOLUME);
}

/** For tests. */
export function resetSoundThrottle() {
  lastPlayedAt = Number.NEGATIVE_INFINITY;
}
