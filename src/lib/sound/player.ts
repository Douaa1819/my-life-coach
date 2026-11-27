import { type Note } from './sounds';

/**
 * Native playback is not wired yet: it needs expo-audio, a new dependency that is
 * waiting for approval. Until then sound effects play on web only, and the app
 * behaves exactly the same everywhere else. expo-audio respects the silent switch
 * by default, which is the behaviour this will keep.
 */
export async function playNotes(_notes: readonly Note[], _volume: number): Promise<void> {}
