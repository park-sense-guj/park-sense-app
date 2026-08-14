import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { ThemePreference } from '../config/theme';

const STORAGE_KEY = 'parksense.theme.preference';

type ThemeState = {
  preference: ThemePreference;
  ready: boolean;
  hydrate: () => Promise<void>;
  setPreference: (preference: ThemePreference) => Promise<void>;
};

export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'system',
  ready: false,
  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        set({ preference: stored, ready: true });
        return;
      }
    } catch {
      // Keep system default if storage is unavailable.
    }
    set({ ready: true });
  },
  setPreference: async (preference) => {
    set({ preference });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Preference still applies for this session.
    }
  },
}));
