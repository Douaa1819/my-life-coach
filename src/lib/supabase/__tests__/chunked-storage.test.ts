import { createChunkedStorage, type KeyValueStore } from '@/lib/supabase/chunked-storage';

function createMemoryStore() {
  const entries = new Map<string, string>();
  const store: KeyValueStore = {
    getItemAsync: async (key) => entries.get(key) ?? null,
    setItemAsync: async (key, value) => {
      entries.set(key, value);
    },
    deleteItemAsync: async (key) => {
      entries.delete(key);
    },
  };
  return { entries, store };
}

const KEY = 'sb-project-auth-token';

describe('createChunkedStorage', () => {
  test('round-trips values larger than one chunk', async () => {
    const { entries, store } = createMemoryStore();
    const storage = createChunkedStorage(store, 4);

    await storage.setItem(KEY, 'abcdefghij');

    expect(await storage.getItem(KEY)).toBe('abcdefghij');
    expect(entries.size).toBe(4);
    for (const value of entries.values()) expect(value.length).toBeLessThanOrEqual(4);
  });

  test('replaces the previous value and removes its chunks', async () => {
    const { entries, store } = createMemoryStore();
    const storage = createChunkedStorage(store, 4);

    await storage.setItem(KEY, 'abcdefghij');
    await storage.setItem(KEY, 'xy');

    expect(await storage.getItem(KEY)).toBe('xy');
    expect(entries.size).toBe(2);
  });

  test('keeps the previous value when a write is interrupted', async () => {
    const { store } = createMemoryStore();
    const storage = createChunkedStorage(store, 4);
    await storage.setItem(KEY, 'old-session');

    let writes = 0;
    const failingStorage = createChunkedStorage(
      {
        ...store,
        setItemAsync: async (key, value) => {
          writes += 1;
          if (writes === 2) throw new Error('app killed');
          await store.setItemAsync(key, value);
        },
      },
      4,
    );

    await expect(failingStorage.setItem(KEY, 'new-session-value')).rejects.toThrow('app killed');
    expect(await storage.getItem(KEY)).toBe('old-session');
  });

  test('reads a missing chunk as no session', async () => {
    const { entries, store } = createMemoryStore();
    const storage = createChunkedStorage(store, 4);
    await storage.setItem(KEY, 'abcdefgh');

    entries.delete(`${KEY}.0.1`);

    expect(await storage.getItem(KEY)).toBeNull();
  });

  test('removeItem deletes the manifest and every chunk', async () => {
    const { entries, store } = createMemoryStore();
    const storage = createChunkedStorage(store, 4);
    await storage.setItem(KEY, 'abcdefghij');

    await storage.removeItem(KEY);

    expect(entries.size).toBe(0);
    expect(await storage.getItem(KEY)).toBeNull();
  });

  test('rejects keys SecureStore cannot hold', async () => {
    const storage = createChunkedStorage(createMemoryStore().store);
    await expect(storage.getItem('bad key/with spaces')).rejects.toThrow();
  });
});
