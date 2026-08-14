import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';

import { GlassCard } from './GlassCard';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  label: string;
  value: string | number;
  accent?: string;
  hint?: string;
};

export function StatCard({ label, value, accent, hint }: Props) {
  const { colors, typography } = useTheme();
  const valueColor = accent ?? colors.primary;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flex: 1,
          minWidth: 96,
          paddingVertical: 14,
        },
        value: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
        hint: { marginTop: 4, color: colors.textMuted, fontSize: 11 },
      }),
    [colors],
  );

  return (
    <GlassCard style={styles.card}>
      <Text style={[styles.value, { color: valueColor }]} maxFontSizeMultiplier={1.3}>
        {value}
      </Text>
      <Text style={typography.caption}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </GlassCard>
  );
}
