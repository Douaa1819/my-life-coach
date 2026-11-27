import { create } from 'zustand';

import { loadSoundEnabled, saveSoundEnabled } from './preference-storage';

type SoundPreferenceState = {
  /** Sound effects are on by default; silent mode and this switch both turn them off. */
  enabled: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setEnabled: (enabled: boolean) => void;
};

export const useSoundPreference = create<SoundPreferenceState>((set, get) => ({
  enabled: true,
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    const stored = await loadSoundEnabled();
    // A choice made while loading wins over the stored one.
    set((state) => (state.hydrated ? state : { hydrated: true, enabled: stored ?? state.enabled }));
  },
  setEnabled: (enabled) => {
    set({ enabled, hydrated: true });
    void saveSoundEnabled(enabled);
  },
}));
