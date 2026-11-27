// Renders the short, soft effects in src/lib/sound/sounds.ts to WAV files, so native
// playback (expo-audio) and web synthesis share one definition. Run: node scripts/generate-sounds.mjs
import { writeFileSync } from 'node:fs';

const RATE = 22050;
const VOLUME = 0.5; // headroom; the player lowers it further
const sounds = {
  'task-done': [
    [660, 0, 0.09],
    [880, 0.07, 0.12],
  ],
  'goal-reached': [
    [523.25, 0, 0.2],
    [659.25, 0.14, 0.2],
    [783.99, 0.28, 0.36],
  ],
};

for (const [name, notes] of Object.entries(sounds)) {
  const total = Math.ceil((Math.max(...notes.map(([, s, d]) => s + d)) + 0.05) * RATE);
  const pcm = new Float32Array(total);
  for (const [frequency, start, duration] of notes) {
    const from = Math.floor(start * RATE);
    const length = Math.floor(duration * RATE);
    for (let i = 0; i < length; i++) {
      const t = i / RATE;
      const attack = Math.min(1, t / 0.015);
      const release = Math.pow(1 - i / length, 2);
      pcm[from + i] += Math.sin(2 * Math.PI * frequency * t) * attack * release * VOLUME;
    }
  }
  const data = Buffer.alloc(total * 2);
  pcm.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(`assets/sounds/${name}.wav`, Buffer.concat([header, data]));
  console.log(name, data.length + 44, 'bytes');
}
