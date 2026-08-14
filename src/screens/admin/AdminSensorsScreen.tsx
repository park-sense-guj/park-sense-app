import { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { GlassCard } from '../../components/GlassCard';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { useParkingSlots } from '../../hooks/useParkingSlots';
import { setSensorStatus } from '../../services/parkingService';
import { useTheme } from '../../theme/ThemeProvider';

export function AdminSensorsScreen() {
  const { colors, typography } = useTheme();
  const { sensors, slots, loading } = useParkingSlots();
  const [busyId, setBusyId] = useState<string | null>(null);
  const slotLabel = Object.fromEntries(slots.map((slot) => [slot.slotId, slot.slotNumber]));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        list: { gap: 12, paddingBottom: 24 },
        row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
        meta: { color: colors.textMuted, marginTop: 8, lineHeight: 20 },
        action: { marginTop: 12 },
        loading: { textAlign: 'center', color: colors.textMuted, paddingTop: 32, fontWeight: '600' },
      }),
    [colors],
  );

  async function toggleFault(sensorId: string, current: string) {
    setBusyId(sensorId);
    try {
      await setSensorStatus(sensorId, current === 'Faulty' ? 'Simulated' : 'Faulty');
    } catch (error) {
      Alert.alert('Update failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen>
      <ScreenHeader title="Sensors" subtitle="Simulate a disconnect or hardware fault." />
      <FlatList
        data={sensors}
        keyExtractor={(item) => item.sensorId}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loading ? (
            <Text style={styles.loading}>Loading sensors…</Text>
          ) : (
            <EmptyState icon="hardware-chip-outline" title="No sensors" subtitle="Seed the demo lot first." />
          )
        }
        renderItem={({ item }) => {
          const faulty = item.sensorStatus === 'Faulty';
          return (
            <GlassCard>
              <View style={styles.row}>
                <Text style={typography.heading}>{slotLabel[item.slotId] ?? item.slotId}</Text>
                <StatusBadge label={item.sensorStatus} tone={faulty ? 'warning' : 'available'} />
              </View>
              <Text style={styles.meta}>
                {item.sensorType} sensor · updated {new Date(item.lastUpdated).toLocaleString()}
              </Text>
              <Button
                title={faulty ? 'Mark healthy' : 'Mark faulty'}
                variant={faulty ? 'primary' : 'secondary'}
                loading={busyId === item.sensorId}
                onPress={() => void toggleFault(item.sensorId, item.sensorStatus)}
                style={styles.action}
              />
            </GlassCard>
          );
        }}
      />
    </Screen>
  );
}
