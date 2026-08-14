import { get, ref } from 'firebase/database';
import { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { GlassCard } from '../../components/GlassCard';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { getFirebaseDatabase } from '../../config/firebase';
import { useParkingSlots } from '../../hooks/useParkingSlots';
import { notifyUsersSlotAvailable } from '../../services/notificationService';
import { setSlotOccupancy } from '../../services/parkingService';
import { useTheme } from '../../theme/ThemeProvider';
import type { ParkingSlot, UserProfile } from '../../types';

export function AdminSlotsScreen() {
  const { colors, typography } = useTheme();
  const { slots, loading } = useParkingSlots();
  const [busyId, setBusyId] = useState<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        list: { gap: 12, paddingBottom: 24 },
        row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
        copy: { flex: 1 },
        meta: { color: colors.textMuted, marginTop: 4 },
        action: { marginTop: 12 },
        loading: { textAlign: 'center', color: colors.textMuted, paddingTop: 32, fontWeight: '600' },
      }),
    [colors],
  );

  async function toggle(slot: ParkingSlot) {
    const next = slot.status === 'Available' ? 'Occupied' : 'Available';
    setBusyId(slot.slotId);
    try {
      await setSlotOccupancy(slot.slotId, next);
      if (next === 'Available') {
        await notifyWatchers(slot);
      }
    } catch (error) {
      Alert.alert('Update failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setBusyId(null);
    }
  }

  function confirmToggle(slot: ParkingSlot) {
    const next = slot.status === 'Available' ? 'occupied' : 'available';
    Alert.alert(
      `Mark ${slot.slotNumber} as ${next}?`,
      'This writes the same Firebase path a physical sensor would update.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: `Mark ${next}`, onPress: () => void toggle(slot) },
      ],
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title="Slots"
        subtitle="Each toggle simulates an ESP32 occupancy write."
      />
      <FlatList
        data={slots}
        keyExtractor={(item) => item.slotId}
        contentContainerStyle={styles.list}
        removeClippedSubviews
        initialNumToRender={6}
        windowSize={7}
        ListEmptyComponent={
          loading ? (
            <Text style={styles.loading}>Loading slots…</Text>
          ) : (
            <EmptyState
              icon="car-outline"
              title="No slots"
              subtitle="Seed the demo lot from the dashboard first."
            />
          )
        }
        renderItem={({ item }) => (
          <GlassCard>
            <View style={styles.row}>
              <View style={styles.copy}>
                <Text style={typography.heading}>{item.slotNumber}</Text>
                <Text style={styles.meta}>{item.locationName}</Text>
              </View>
              <StatusBadge
                label={item.status}
                tone={item.status === 'Available' ? 'available' : 'occupied'}
              />
            </View>
            <Button
              title={item.status === 'Available' ? 'Mark occupied' : 'Mark available'}
              variant={item.status === 'Available' ? 'danger' : 'primary'}
              loading={busyId === item.slotId}
              onPress={() => confirmToggle(item)}
              style={styles.action}
            />
          </GlassCard>
        )}
      />
    </Screen>
  );
}

async function notifyWatchers(slot: ParkingSlot) {
  const snapshot = await get(ref(getFirebaseDatabase(), 'users'));
  const users = (snapshot.val() as Record<string, UserProfile> | null) ?? {};
  const watchers = Object.values(users)
    .filter((user) => user.role === 'user' && user.preferredLocation === slot.locationName)
    .map((user) => user.userId);
  if (watchers.length === 0) {
    return;
  }
  await notifyUsersSlotAvailable({
    userIds: watchers,
    slotId: slot.slotId,
    slotNumber: slot.slotNumber,
    locationName: slot.locationName,
  });
}
