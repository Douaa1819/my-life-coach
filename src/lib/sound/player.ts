import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import { type Note, type SoundName } from './sounds';

const files: Record<SoundName, number> = {
  taskDone: require('../../../assets/sounds/task-done.wav'),
  goalReached: require('../../../assets/sounds/goal-reached.wav'),
};

const players = new Map<SoundName, AudioPlayer>();
let configured = false;

async function configure() {
  if (configured) return;
  configured = true;
  // Respect the silent switch and never interrupt music or a podcast.
  await setAudioModeAsync({
    playsInSilentMode: false,
    interruptionMode: 'mixWithOthers',
    shouldPlayInBackground: false,
  });
}

function playerFor(name: SoundName): AudioPlayer {
  let player = players.get(name);
  if (!player) {
    player = createAudioPlayer(files[name]);
    players.set(name, player);
  }
  return player;
}

/**
 * Plays the prerendered file for a sound (see scripts/generate-sounds.mjs); the notes are
 * what the web build synthesises. Never throws: sound is an extra, and a failure here
 * must never reach the person.
 */
export async function playNotes(
  _notes: readonly Note[],
  volume: number,
  name: SoundName,
): Promise<void> {
  try {
    await configure();
    const player = playerFor(name);
    player.volume = Math.min(1, volume * 2.5);
    await player.seekTo(0);
    player.play();
  } catch {
    // ignore
  }
}
