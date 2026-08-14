export type ThemeScheme = 'light' | 'dark';

export type ThemePreference = ThemeScheme;

export type ThemeColors = {
  primary: string;
  primaryDark: string;
  primaryMid: string;
  primarySoft: string;
  primaryMuted: string;
  available: string;
  availableSoft: string;
  occupied: string;
  occupiedSoft: string;
  warning: string;
  warningSoft: string;
  background: string;
  backgroundAlt: string;
  card: string;
  cardSolid: string;
  text: string;
  textMuted: string;
  border: string;
  borderStrong: string;
  white: string;
  overlay: string;
  glass: string;
  glassBorder: string;
  dangerSoft: string;
  tabPill: string;
  tabActive: string;
  tabActiveText: string;
  tabInactive: string;
  mapSurface: string;
  chip: string;
  sheet: string;
  input: string;
  inputBorder: string;
  blobOne: string;
  blobTwo: string;
  blobThree: string;
};

export const lightColors: ThemeColors = {
  primary: '#0F766E',
  primaryDark: '#115E59',
  primaryMid: '#0D9488',
  primarySoft: '#CCFBF1',
  primaryMuted: 'rgba(15, 118, 110, 0.12)',
  available: '#15803D',
  availableSoft: '#DCFCE7',
  occupied: '#DC2626',
  occupiedSoft: '#FEE2E2',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  background: '#EEF4F2',
  backgroundAlt: '#E6F2EE',
  card: 'rgba(255, 255, 255, 0.82)',
  cardSolid: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#5B6B73',
  border: 'rgba(15, 118, 110, 0.14)',
  borderStrong: 'rgba(15, 118, 110, 0.28)',
  white: '#FFFFFF',
  overlay: 'rgba(15, 23, 42, 0.4)',
  glass: 'rgba(255, 255, 255, 0.72)',
  glassBorder: 'rgba(255, 255, 255, 0.55)',
  dangerSoft: 'rgba(220, 38, 38, 0.1)',
  tabPill: 'rgba(255, 255, 255, 0.82)',
  tabActive: '#D8F3E3',
  tabActiveText: '#0F8A4B',
  tabInactive: '#8B9598',
  mapSurface: '#D7E3DF',
  chip: 'rgba(255,255,255,0.94)',
  sheet: 'rgba(255,255,255,0.96)',
  input: 'rgba(255,255,255,0.9)',
  inputBorder: 'rgba(15, 118, 110, 0.14)',
  blobOne: 'rgba(15, 118, 110, 0.14)',
  blobTwo: 'rgba(45, 212, 191, 0.12)',
  blobThree: 'rgba(13, 148, 136, 0.08)',
};

export const darkColors: ThemeColors = {
  primary: '#2DD4BF',
  primaryDark: '#5EEAD4',
  primaryMid: '#14B8A6',
  primarySoft: 'rgba(45, 212, 191, 0.16)',
  primaryMuted: 'rgba(45, 212, 191, 0.12)',
  available: '#4ADE80',
  availableSoft: 'rgba(74, 222, 128, 0.16)',
  occupied: '#F87171',
  occupiedSoft: 'rgba(248, 113, 113, 0.16)',
  warning: '#FBBF24',
  warningSoft: 'rgba(251, 191, 36, 0.16)',
  background: '#0B1412',
  backgroundAlt: '#12201C',
  card: 'rgba(22, 36, 32, 0.88)',
  cardSolid: '#162420',
  text: '#F1F5F4',
  textMuted: '#9AADA7',
  border: 'rgba(45, 212, 191, 0.18)',
  borderStrong: 'rgba(45, 212, 191, 0.32)',
  white: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.55)',
  glass: 'rgba(22, 36, 32, 0.78)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  dangerSoft: 'rgba(248, 113, 113, 0.14)',
  tabPill: 'rgba(26, 42, 38, 0.82)',
  tabActive: 'rgba(45, 212, 191, 0.2)',
  tabActiveText: '#5EEAD4',
  tabInactive: '#8A9E98',
  mapSurface: '#1A2A26',
  chip: 'rgba(22, 36, 32, 0.94)',
  sheet: 'rgba(22, 36, 32, 0.96)',
  input: 'rgba(18, 32, 28, 0.96)',
  inputBorder: 'rgba(45, 212, 191, 0.22)',
  blobOne: 'rgba(45, 212, 191, 0.12)',
  blobTwo: 'rgba(20, 184, 166, 0.1)',
  blobThree: 'rgba(13, 148, 136, 0.08)',
};

/** @deprecated Prefer useTheme().colors — kept for gradual migration. */
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

export function makeTypography(palette: ThemeColors) {
  return {
    display: {
      fontSize: 30,
      fontWeight: '700' as const,
      letterSpacing: -0.6,
      color: palette.text,
    },
    title: {
      fontSize: 24,
      fontWeight: '700' as const,
      letterSpacing: -0.4,
      color: palette.text,
    },
    heading: {
      fontSize: 18,
      fontWeight: '700' as const,
      letterSpacing: -0.2,
      color: palette.text,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      color: palette.text,
      lineHeight: 22,
    },
    caption: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: palette.textMuted,
      lineHeight: 18,
    },
    label: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: palette.text,
    },
  };
}

export function makeShadow(scheme: ThemeScheme) {
  const soft = scheme === 'dark' ? '#000000' : '#0F172A';
  const clay = scheme === 'dark' ? '#000000' : '#115E59';
  const card = scheme === 'dark' ? '#000000' : '#0F766E';
  return {
    card: {
      shadowColor: card,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: scheme === 'dark' ? 0.35 : 0.08,
      shadowRadius: 18,
      elevation: 3,
    },
    clay: {
      shadowColor: clay,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: scheme === 'dark' ? 0.4 : 0.12,
      shadowRadius: 14,
      elevation: 4,
    },
    soft: {
      shadowColor: soft,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: scheme === 'dark' ? 0.3 : 0.06,
      shadowRadius: 10,
      elevation: 2,
    },
  };
}

export function makeGlass(palette: ThemeColors) {
  return {
    backgroundColor: palette.glass,
    borderWidth: 1,
    borderColor: palette.glassBorder,
  };
}

/** Static light typography for legacy imports. Prefer useTheme().typography. */
export const typography = makeTypography(lightColors);

/** Static light shadows for legacy imports. Prefer useTheme().shadow. */
export const shadow = makeShadow('light');

export const glass = makeGlass(lightColors);

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 };

/** Space list screens leave so content can scroll above the floating tab pill. */
export const tabBarReserve = 96;

export function colorsForScheme(scheme: ThemeScheme): ThemeColors {
  return scheme === 'dark' ? darkColors : lightColors;
}
