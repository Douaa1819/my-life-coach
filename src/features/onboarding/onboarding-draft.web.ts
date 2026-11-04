import { createChunkedStorage } from '@/lib/supabase/chunked-storage';

import { createOnboardingDraftStore } from './onboarding-draft-store';

const memory = new Map<string, string>();

/** Web keeps drafts in memory only, so personal answers never reach localStorage. */
export const onboardingDraftStore = createOnboardingDraftStore(
  createChunkedStorage({
    getItemAsync: async (key) => memory.get(key) ?? null,
    setItemAsync: async (key, value) => {
      memory.set(key, value);
    },
    deleteItemAsync: async (key) => {
      memory.delete(key);
    },
  }),
);
