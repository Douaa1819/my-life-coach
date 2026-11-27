export type SoundName = 'taskDone' | 'goalReached';

/** One note of a sound: frequency in Hz, start and length in seconds. */
export type Note = { frequency: number; start: number; duration: number };

/**
 * Short, soft and rising. Each sound is under 700 ms and plays once; there is no music
 * and nothing loops. Sounds are synthesised, so no audio assets ship with the app.
 */
export const sounds: Record<SoundName, readonly Note[]> = {
  taskDone: [
    { frequency: 660, start: 0, duration: 0.09 },
    { frequency: 880, start: 0.07, duration: 0.12 },
  ],
  goalReached: [
    { frequency: 523.25, start: 0, duration: 0.2 },
    { frequency: 659.25, start: 0.14, duration: 0.2 },
    { frequency: 783.99, start: 0.28, duration: 0.36 },
  ],
};

/** Gentle on purpose: well under full volume. */
export const SOUND_VOLUME = 0.14;

/** A second sound inside this window is skipped, so rapid taps never stack up. */
export const MIN_GAP_MS = 1500;
