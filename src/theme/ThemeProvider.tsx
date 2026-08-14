import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import {
  colorsForScheme,
  makeGlass,
  makeShadow,
  makeTypography,
  type ThemeColors,
  type ThemePreference,
  type ThemeScheme,
} from '../config/theme';
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
  const systemScheme = useColorScheme();
  const preference = useThemeStore((state) => state.preference);
  const hydrate = useThemeStore((state) => state.hydrate);
  const setPreference = useThemeStore((state) => state.setPreference);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const sub = Appearance.addChangeListener(() => {
      // useColorScheme already updates; this keeps listeners in sync on older RN paths.
    });
    return () => sub.remove();
  }, []);

  const scheme: ThemeScheme = useMemo(() => {
    if (preference === 'light' || preference === 'dark') {
      return preference;
    }
    return systemScheme === 'dark' ? 'dark' : 'light';
  }, [preference, systemScheme]);

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
