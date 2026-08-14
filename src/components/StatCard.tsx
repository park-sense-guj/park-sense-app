import { StyleSheet, Text } from 'react-native';

import { colors, typography } from '../config/theme';
import { GlassCard } from './GlassCard';

type Props = {
  label: string;
  value: string | number;
  accent?: string;
  hint?: string;
};

export function StatCard({ label, value, accent = colors.primary, hint }: Props) {
  return (
    <GlassCard style={styles.card}>
      <Text style={[styles.value, { color: accent }]} maxFontSizeMultiplier={1.3}>
        {value}
      </Text>
      <Text style={typography.caption}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 96,
    paddingVertical: 14,
  },
  value: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  hint: { marginTop: 4, color: colors.textMuted, fontSize: 11 },
});
