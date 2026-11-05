import { createChunkedStorage, type KeyValueStore } from '@/lib/supabase/chunked-storage';

import { createOnboardingDraftStore, draftKey } from '../onboarding-draft-store';
import { completeAnswers, USER_A, USER_B } from './onboarding-fixtures';

function createMemoryStore() {
  const items = new Map<string, string>();
  const store: KeyValueStore = {
    getItemAsync: async (key) => items.get(key) ?? null,
    setItemAsync: async (key, value) => {
      items.set(key, value);
    },
    deleteItemAsync: async (key) => {
      items.delete(key);
    },
  };
  return { items, store };
}

function setup() {
  const memory = createMemoryStore();
  const storage = createChunkedStorage(memory.store, 50);
  const draftStore = createOnboardingDraftStore(storage, () => new Date('2026-11-03T10:00:00Z'));
  return { ...memory, storage, draftStore };
}

describe('onboarding draft store', () => {
  test('saves and restores a draft per user', async () => {
    const { draftStore } = setup();
    await draftStore.save(USER_A, 'goal', completeAnswers());

    await expect(draftStore.load(USER_A)).resolves.toEqual({
      version: 1,
      userId: USER_A,
      step: 'goal',
      answers: completeAnswers(),
      savedAt: '2026-11-03T10:00:00.000Z',
    });
    await expect(draftStore.load(USER_B)).resolves.toBeNull();
  });

  test('a draft stored under another user id is deleted, never restored', async () => {
    const { draftStore, storage, items } = setup();
    const foreign = JSON.stringify({
      version: 1,
      userId: USER_A,
      step: 'goal',
      answers: completeAnswers(),
      savedAt: '2026-11-03T10:00:00.000Z',
    });
    await storage.setItem(draftKey(USER_B), foreign);

    await expect(draftStore.load(USER_B)).resolves.toBeNull();
    expect([...items.keys()].some((key) => key.startsWith(draftKey(USER_B)))).toBe(false);
  });

  test.each([
    ['corrupt JSON', '{not json'],
    ['an old version', JSON.stringify({ version: 0 })],
    ['invalid answers', JSON.stringify({ version: 1, userId: USER_A, step: 'goal', answers: {} })],
  ])('%s is discarded and deleted', async (_, raw) => {
    const { draftStore, storage, items } = setup();
    await storage.setItem(draftKey(USER_A), raw);

    await expect(draftStore.load(USER_A)).resolves.toBeNull();
    expect(items.size).toBe(0);
  });

  test('clear removes every chunk', async () => {
    const { draftStore, items } = setup();
    await draftStore.save(USER_A, 'review', completeAnswers({ motivation: 'a'.repeat(280) }));
    expect(items.size).toBeGreaterThan(2);

    await draftStore.clear(USER_A);
    expect(items.size).toBe(0);
  });

  test('a clear is never overtaken by an earlier save', async () => {
    const { draftStore, items } = setup();
    void draftStore.save(USER_A, 'goal', completeAnswers());
    await draftStore.clear(USER_A);
    expect(items.size).toBe(0);
  });

  test('a save arriving after a clear does not bring the draft back', async () => {
    const { draftStore, items } = setup();
    await draftStore.save(USER_A, 'goal', completeAnswers());
    await draftStore.clear(USER_A);

    await draftStore.save(USER_A, 'horizon', completeAnswers());
    expect(items.size).toBe(0);
  });

  test('the next load reopens saving for that user, and other users are unaffected', async () => {
    const { draftStore } = setup();
    await draftStore.clear(USER_A);
    await draftStore.save(USER_B, 'goal', completeAnswers());
    await expect(draftStore.load(USER_B)).resolves.not.toBeNull();

    await draftStore.load(USER_A);
    await draftStore.save(USER_A, 'goal', completeAnswers());
    await expect(draftStore.load(USER_A)).resolves.toMatchObject({ step: 'goal' });
  });

  test('storage failures are swallowed', async () => {
    const failing: KeyValueStore = {
      getItemAsync: () => Promise.reject(new Error('keystore unavailable')),
      setItemAsync: () => Promise.reject(new Error('keystore unavailable')),
      deleteItemAsync: () => Promise.reject(new Error('keystore unavailable')),
    };
    const draftStore = createOnboardingDraftStore(createChunkedStorage(failing));

    await expect(draftStore.save(USER_A, 'goal', completeAnswers())).resolves.toBeUndefined();
    await expect(draftStore.load(USER_A)).resolves.toBeNull();
    await expect(draftStore.clear(USER_A)).resolves.toBeUndefined();
  });

  test('ignores ids that are not user ids', async () => {
    const { draftStore, items } = setup();
    await draftStore.save('../other', 'goal', completeAnswers());
    expect(items.size).toBe(0);
  });

  test('never logs answers', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { draftStore, storage } = setup();

    await draftStore.save(USER_A, 'goal', completeAnswers());
    await draftStore.load(USER_A);
    await storage.setItem(draftKey(USER_A), '{broken');
    await draftStore.load(USER_A);

    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });
});
