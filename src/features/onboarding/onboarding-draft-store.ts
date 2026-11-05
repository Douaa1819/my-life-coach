import { type SessionStorage } from '@/lib/supabase/chunked-storage';

import {
  type OnboardingAnswers,
  ONBOARDING_DRAFT_VERSION,
  type OnboardingDraft,
  onboardingDraftSchema,
  type OnboardingStep,
} from './onboarding.schema';

export type OnboardingDraftStore = {
  /** Returns the user's draft, or null. Invalid, foreign or unreadable drafts are deleted. */
  load(userId: string): Promise<OnboardingDraft | null>;
  /** Never throws: a failed save must not block the flow. Ignored after `clear` until `load`. */
  save(userId: string, step: OnboardingStep, answers: OnboardingAnswers): Promise<void>;
  /** Never throws. Saves for this user are refused until the next `load`. */
  clear(userId: string): Promise<void>;
};

const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const draftKey = (userId: string) => `aicoach.onboarding.${userId}`;

/**
 * Drafts hold personal answers: nothing here logs values or error details.
 * Operations run one at a time, so a clear can never be overtaken by an
 * earlier save that is still writing. After a clear (logout, completion,
 * session loss) late saves from a screen that is still unmounting are dropped;
 * the next session reopens the user with `load`.
 */
export function createOnboardingDraftStore(
  storage: SessionStorage,
  now: () => Date = () => new Date(),
): OnboardingDraftStore {
  let queue: Promise<unknown> = Promise.resolve();
  const cleared = new Set<string>();

  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation, operation);
    queue = result.catch(() => undefined);
    return result;
  }

  async function remove(userId: string) {
    try {
      await storage.removeItem(draftKey(userId));
    } catch {
      // Nothing else to do; the next save overwrites it.
    }
  }

  return {
    load: (userId) =>
      enqueue(async () => {
        if (!USER_ID.test(userId)) return null;
        cleared.delete(userId);

        let raw: string | null;
        try {
          raw = await storage.getItem(draftKey(userId));
        } catch {
          return null;
        }
        if (raw === null) return null;

        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          await remove(userId);
          return null;
        }

        const result = onboardingDraftSchema.safeParse(parsed);
        if (!result.success || result.data.userId !== userId) {
          await remove(userId);
          return null;
        }
        return result.data;
      }),

    save: (userId, step, answers) =>
      enqueue(async () => {
        if (!USER_ID.test(userId) || cleared.has(userId)) return;
        const draft: OnboardingDraft = {
          version: ONBOARDING_DRAFT_VERSION,
          userId,
          step,
          answers,
          savedAt: now().toISOString(),
        };
        try {
          await storage.setItem(draftKey(userId), JSON.stringify(draft));
        } catch {
          // A lost draft only means the user answers again.
        }
      }),

    clear: (userId) =>
      enqueue(async () => {
        if (!USER_ID.test(userId)) return;
        cleared.add(userId);
        await remove(userId);
      }),
  };
}
