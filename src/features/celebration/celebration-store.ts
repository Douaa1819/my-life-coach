import { create } from 'zustand';

type CelebrationState = {
  /** Title of the goal the person just reached, or null when nothing is being celebrated. */
  goalTitle: string | null;
  celebrate: (goalTitle: string) => void;
  dismiss: () => void;
};

/** Holds the one pending "goal reached" moment. In memory only: it never outlives the app. */
export const useCelebration = create<CelebrationState>((set) => ({
  goalTitle: null,
  celebrate: (goalTitle) => set({ goalTitle }),
  dismiss: () => set({ goalTitle: null }),
}));
