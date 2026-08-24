import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar, initialsFromName } from './Avatar';
import { Button } from './Button';
import { GlassCard } from './GlassCard';
import { StatusBadge } from './StatusBadge';
import { formatHoldRemaining } from '../services/parkingHoldService';
import { formatPassId, type PassVerdict } from '../services/parkingPassService';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  verdict: PassVerdict;
  now: number;
  busy?: boolean;
  onAdmit?: () => void;
  onDeny?: () => void;
  onScanAgain?: () => void;
};

export function PassVerdictCard({
  verdict,
  now,
  busy,
  onAdmit,
  onDeny,
  onScanAgain,
}: Props) {
  const { colors } = useTheme();
  const pass = verdict.pass;
  const slot = verdict.slot;
  const until = slot?.heldUntil ?? pass?.expiresAt ?? 0;
  const admitLabel = verdict.canRestore ? 'Restore hold' : 'Admit driver';
  const toneBg =
    verdict.tone === 'ok'
      ? colors.availableSoft
      : verdict.tone === 'warn'
        ? colors.warningSoft
        : colors.occupiedSoft;
  const toneFg =
    verdict.tone === 'ok'
      ? colors.available
      : verdict.tone === 'warn'
        ? colors.warning
        : colors.occupied;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: { padding: 16, gap: 12 },
        banner: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          padding: 12,
          borderRadius: 14,
          backgroundColor: toneBg,
        },
        bannerCopy: { flex: 1, minWidth: 0, gap: 2 },
        bannerTitle: { fontSize: 16, fontWeight: '800', color: toneFg },
        bannerText: { fontSize: 13, fontWeight: '600', color: colors.text, lineHeight: 18 },
        identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
        copy: { flex: 1, minWidth: 0, gap: 2 },
        name: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
        meta: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
        rows: { gap: 8 },
        row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
        label: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
        value: { fontSize: 13, fontWeight: '800', color: colors.text, textAlign: 'right', flex: 1 },
        actions: { gap: 8, marginTop: 4 },
      }),
    [colors, toneBg, toneFg],
  );

  return (
    <GlassCard style={styles.card}>
      <View style={styles.banner} accessibilityRole="summary">
        <Ionicons
          name={
            verdict.tone === 'ok'
              ? 'shield-checkmark'
              : verdict.tone === 'warn'
                ? 'alert-circle'
                : 'close-circle'
          }
          size={22}
          color={toneFg}
        />
        <View style={styles.bannerCopy}>
          <Text style={styles.bannerTitle}>{verdict.title}</Text>
          <Text style={styles.bannerText}>{verdict.message}</Text>
        </View>
      </View>

      {pass ? (
        <>
          <View style={styles.identity}>
            <Avatar initials={initialsFromName(pass.userName)} photoUrl={pass.photoUrl} size={56} />
            <View style={styles.copy}>
              <Text style={styles.name}>{pass.userName}</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {pass.userEmail || 'No email on this pass'}
              </Text>
              <StatusBadge
                label={verdict.genuine ? 'Matches hold' : 'Not confirmed'}
                tone={verdict.genuine ? 'available' : verdict.tone === 'warn' ? 'warning' : 'occupied'}
              />
            </View>
          </View>

          <View style={styles.rows}>
            <View style={styles.row}>
              <Text style={styles.label}>Bay</Text>
              <Text style={styles.value}>
                {pass.slotNumber} · {pass.locationName}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Pass ID</Text>
              <Text style={styles.value}>{formatPassId(pass.token)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Hold</Text>
              <Text style={styles.value}>
                {until ? formatHoldRemaining(until, now) : '—'}
              </Text>
            </View>
            {slot?.holdCheckIn ? (
              <View style={styles.row}>
                <Text style={styles.label}>Gate</Text>
                <Text style={styles.value}>
                  {slot.holdCheckIn === 'admitted'
                    ? 'Admitted'
                    : slot.holdCheckIn === 'denied'
                      ? 'Denied'
                      : 'Waiting'}
                </Text>
              </View>
            ) : null}
          </View>
        </>
      ) : null}

      <View style={styles.actions}>
        {verdict.canAdmit || verdict.canRestore ? (
          <Button title={admitLabel} loading={busy} onPress={() => onAdmit?.()} />
        ) : null}
        {verdict.canDeny ? (
          <Button
            title="Deny arrival"
            variant="danger"
            loading={busy}
            onPress={() => onDeny?.()}
          />
        ) : null}
        {onScanAgain ? (
          <Button title="Scan another" variant="secondary" disabled={busy} onPress={onScanAgain} />
        ) : null}
      </View>
    </GlassCard>
  );
}
