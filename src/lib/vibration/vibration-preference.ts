import { create } from 'zustand';

import { loadFlag, saveFlag } from '@/lib/sound/preference-storage';

const KEY = 'aicoach.vibration';

type VibrationPreferenceState = {
  /** Off by default: vibration is something a person opts into. */
  enabled: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setEnabled: (enabled: boolean) => void;
};

export const useVibrationPreference = create<VibrationPreferenceState>((set, get) => ({
  enabled: false,
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    const stored = await loadFlag(KEY);
    set((state) => (state.hydrated ? state : { hydrated: true, enabled: stored ?? state.enabled }));
  },
  setEnabled: (enabled) => {
    set({ enabled, hydrated: true });
    void saveFlag(KEY, enabled);
  },
}));
