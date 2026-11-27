import { type Note, type SoundName } from './sounds';

let context: AudioContext | undefined;

function getContext(): AudioContext | undefined {
  if (context) return context;
  const Ctor =
    typeof window === 'undefined'
      ? undefined
      : (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!Ctor) return undefined;
  context = new Ctor();
  return context;
}

/**
 * Web Audio plays only after a tap or key press; before that the browser keeps the
 * context suspended and the sound is simply skipped. Never throws.
 */
export async function playNotes(
  notes: readonly Note[],
  volume: number,
  _name?: SoundName,
): Promise<void> {
  try {
    const audio = getContext();
    if (!audio) return;
    if (audio.state === 'suspended') await audio.resume();
    if (audio.state !== 'running') return;

    const now = audio.currentTime;
    for (const note of notes) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const start = now + note.start;
      const end = start + note.duration;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(note.frequency, start);
      // A quick attack and a smooth fade keep it free of clicks.
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(end + 0.02);
    }
  } catch {
    // Sound is an extra; a failure here must never reach the user.
  }
}
