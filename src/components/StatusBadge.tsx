import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { radius } from '../config/theme';
import { useTheme } from '../theme/ThemeProvider';

type Tone = 'available' | 'occupied' | 'neutral' | 'warning' | 'info';

type Props = {
  label: string;
  tone?: Tone;
};

export function StatusBadge({ label, tone = 'neutral' }: Props) {
  const { colors } = useTheme();

  const tones = useMemo(
    () => ({
      available: { bg: colors.availableSoft, fg: colors.available },
      occupied: { bg: colors.occupiedSoft, fg: colors.occupied },
      warning: { bg: colors.warningSoft, fg: colors.warning },
      info: { bg: colors.primarySoft, fg: colors.primaryDark },
      neutral: { bg: colors.primaryMuted, fg: colors.textMuted },
    }),
    [colors],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        badge: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: radius.md,
          minHeight: 28,
        },
        dot: { width: 7, height: 7, borderRadius: 4 },
        label: { fontSize: 12, fontWeight: '700' },
      }),
    [],
  );

  const palette = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]} accessibilityRole="text">
      <View style={[styles.dot, { backgroundColor: palette.fg }]} />
      <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}
