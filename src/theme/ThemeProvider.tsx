import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';

import {
  colorsForScheme,
  makeGlass,
  makeShadow,
  makeTypography,
  type ThemeColors,
  type ThemePreference,
  type ThemeScheme,
} from '../config/theme';
import { usePreferencesStore } from '../store/preferencesStore';
import { useConnectivityStore } from '../store/connectivityStore';
import { useThemeStore } from './themeStore';

type ThemeContextValue = {
  colors: ThemeColors;
  scheme: ThemeScheme;
  preference: ThemePreference;
  isDark: boolean;
  typography: ReturnType<typeof makeTypography>;
  shadow: ReturnType<typeof makeShadow>;
  glass: ReturnType<typeof makeGlass>;
  setPreference: (preference: ThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useThemeStore((state) => state.preference);
  const hydrate = useThemeStore((state) => state.hydrate);
  const setPreference = useThemeStore((state) => state.setPreference);
  const hydratePreferences = usePreferencesStore((state) => state.hydrate);
  const startConnectivity = useConnectivityStore((state) => state.start);

  useEffect(() => {
    void hydrate();
    void hydratePreferences();
    return startConnectivity();
  }, [hydrate, hydratePreferences, startConnectivity]);

  const scheme: ThemeScheme = preference === 'dark' ? 'dark' : 'light';

  const value = useMemo<ThemeContextValue>(() => {
    const colors = colorsForScheme(scheme);
    return {
      colors,
      scheme,
      preference,
      isDark: scheme === 'dark',
      typography: makeTypography(colors),
      shadow: makeShadow(scheme),
      glass: makeGlass(colors),
      setPreference,
    };
  }, [scheme, preference, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return value;
}
