/** Minimal async key-value contract, matching the subset of SecureStore we use. */
export type KeyValueStore = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

/** Storage contract expected by supabase-js `auth.storage`. */
export type SessionStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

/**
 * Platform stores can reject large values (some iOS releases refuse about 2048
 * bytes). One UTF-16 unit encodes to at most 3 UTF-8 bytes, so 600 units stays
 * under that limit for any session payload.
 */
export const DEFAULT_CHUNK_SIZE = 600;

const VALID_KEY = /^[\w.-]+$/;

type Manifest = { generation: number; count: number };

function assertValidKey(key: string) {
  if (!VALID_KEY.test(key)) {
    throw new Error('Secure storage keys may only contain letters, digits, ".", "-" and "_".');
  }
}

const chunkKey = (key: string, generation: number, index: number) =>
  `${key}.${generation}.${index}`;

function splitIntoChunks(value: string, size: number): string[] {
  const chunks: string[] = [];
  for (let offset = 0; offset < value.length; offset += size) {
    chunks.push(value.slice(offset, offset + size));
  }
  return chunks.length > 0 ? chunks : [''];
}

function parseManifest(raw: string | null): Manifest | null {
  if (raw === null) return null;
  const match = /^(\d+):(\d+)$/.exec(raw);
  if (!match?.[1] || !match[2]) return null;
  const generation = Number(match[1]);
  const count = Number(match[2]);
  return count > 0 ? { generation, count } : null;
}

/**
 * Stores each value as chunks under `key.<generation>.<index>`, and a manifest
 * `<generation>:<count>` under `key`. A write fills a new generation before it
 * moves the manifest, so an interrupted write leaves the previous value intact.
 * A missing chunk reads as "no session" rather than a partial token.
 */
export function createChunkedStorage(
  store: KeyValueStore,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
): SessionStorage {
  if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
    throw new Error('chunkSize must be a positive integer.');
  }

  async function removeGeneration(key: string, manifest: Manifest) {
    for (let index = 0; index < manifest.count; index += 1) {
      await store.deleteItemAsync(chunkKey(key, manifest.generation, index));
    }
  }

  return {
    async getItem(key) {
      assertValidKey(key);
      const manifest = parseManifest(await store.getItemAsync(key));
      if (!manifest) return null;

      const parts: string[] = [];
      for (let index = 0; index < manifest.count; index += 1) {
        const part = await store.getItemAsync(chunkKey(key, manifest.generation, index));
        if (part === null) return null;
        parts.push(part);
      }
      return parts.join('');
    },

    async setItem(key, value) {
      assertValidKey(key);
      const previous = parseManifest(await store.getItemAsync(key));
      const next: Manifest = {
        generation: previous ? previous.generation + 1 : 0,
        count: 0,
      };
      const chunks = splitIntoChunks(value, chunkSize);
      next.count = chunks.length;

      for (const [index, chunk] of chunks.entries()) {
        await store.setItemAsync(chunkKey(key, next.generation, index), chunk);
      }
      await store.setItemAsync(key, `${next.generation}:${next.count}`);
      if (previous) await removeGeneration(key, previous);
    },

    async removeItem(key) {
      assertValidKey(key);
      const manifest = parseManifest(await store.getItemAsync(key));
      await store.deleteItemAsync(key);
      if (manifest) await removeGeneration(key, manifest);
    },
  };
}
