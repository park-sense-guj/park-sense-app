import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { create } from 'zustand';

import type { ThemePreference } from '../config/theme';

const STORAGE_KEY = 'parksense.theme.preference';

type ThemeState = {
  preference: ThemePreference;
  ready: boolean;
  hydrate: () => Promise<void>;
  setPreference: (preference: ThemePreference) => Promise<void>;
};

function schemeFromStored(value: string | null): ThemePreference {
  if (value === 'light' || value === 'dark') {
    return value;
  }
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'light',
  ready: false,
  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const preference = schemeFromStored(stored);
      set({ preference, ready: true });
      if (stored !== preference) {
        await AsyncStorage.setItem(STORAGE_KEY, preference);
      }
      return;
    } catch {
      // Keep light default if storage is unavailable.
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
