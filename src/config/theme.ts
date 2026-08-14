export const colors = {
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
};

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

export const typography = {
  display: {
    fontSize: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.6,
    color: colors.text,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
    color: colors.text,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
    color: colors.text,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.text,
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.textMuted,
    lineHeight: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.text,
  },
};

export const shadow = {
  card: {
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  clay: {
    shadowColor: '#115E59',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  soft: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
};

export const glass = {
  backgroundColor: colors.glass,
  borderWidth: 1,
  borderColor: colors.glassBorder,
};

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 };

/** Space list screens leave so content can scroll above the floating tab pill. */
export const tabBarReserve = 96;
