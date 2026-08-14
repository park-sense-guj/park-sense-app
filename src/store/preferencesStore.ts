import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'parksense.feedback.preferences';

type FeedbackPreferences = {
  hapticsEnabled: boolean;
  soundCuesEnabled: boolean;
};

type PreferencesState = FeedbackPreferences & {
  ready: boolean;
  hydrate: () => Promise<void>;
  setHapticsEnabled: (enabled: boolean) => Promise<void>;
  setSoundCuesEnabled: (enabled: boolean) => Promise<void>;
};

const defaults: FeedbackPreferences = {
  hapticsEnabled: true,
  soundCuesEnabled: true,
};

async function persist(next: FeedbackPreferences) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Preference still applies for this session.
  }
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  ...defaults,
  ready: false,
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<FeedbackPreferences>;
        set({
          hapticsEnabled:
            typeof parsed.hapticsEnabled === 'boolean'
              ? parsed.hapticsEnabled
              : defaults.hapticsEnabled,
          soundCuesEnabled:
            typeof parsed.soundCuesEnabled === 'boolean'
              ? parsed.soundCuesEnabled
              : defaults.soundCuesEnabled,
          ready: true,
        });
        return;
      }
    } catch {
      // Keep defaults if storage is unavailable.
    }
    set({ ready: true });
  },
  setHapticsEnabled: async (hapticsEnabled) => {
    set({ hapticsEnabled });
    await persist({
      hapticsEnabled,
      soundCuesEnabled: get().soundCuesEnabled,
    });
  },
  setSoundCuesEnabled: async (soundCuesEnabled) => {
    set({ soundCuesEnabled });
    await persist({
      hapticsEnabled: get().hapticsEnabled,
      soundCuesEnabled,
    });
  },
}));
