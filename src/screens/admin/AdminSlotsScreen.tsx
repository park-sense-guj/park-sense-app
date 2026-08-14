import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { GlassCard } from '../../components/GlassCard';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { useParkingSlots } from '../../hooks/useParkingSlots';
import { notifyUsersSlotAvailable } from '../../services/notificationService';
import { readableNetworkError } from '../../services/networkService';
import { setSlotOccupancy } from '../../services/parkingService';
import { listLotWatcherIds } from '../../services/watchService';
import { useConnectivityStore } from '../../store/connectivityStore';
import { useTheme } from '../../theme/ThemeProvider';
import type { ParkingSlot } from '../../types';

export function AdminSlotsScreen() {
  const { colors } = useTheme();
  const { slots, stats, loading, isSensorFaulty } = useParkingSlots();
  const isOnline = useConnectivityStore((state) => state.isOnline);
  const [busyId, setBusyId] = useState<string | null>(null);
  const offlineCount = stats.offlineSensors;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: { marginBottom: 14 },
        title: {
          fontSize: 30,
          fontWeight: '800',
          color: colors.text,
          letterSpacing: -0.6,
        },
        subtitle: {
          marginTop: 6,
          color: colors.textMuted,
          lineHeight: 20,
          fontWeight: '500',
        },
        summary: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 14,
        },
        list: { gap: 12, paddingBottom: 110 },
        card: { padding: 0, overflow: 'hidden' },
        accent: { height: 4 },
        accentOpen: { backgroundColor: colors.available },
        accentTaken: { backgroundColor: colors.occupied },
        accentOffline: { backgroundColor: colors.warning },
        body: { padding: 16 },
        row: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        },
        identity: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
        iconWrap: {
          width: 46,
          height: 46,
          borderRadius: 23,
          alignItems: 'center',
          justifyContent: 'center',
        },
        iconOpen: { backgroundColor: colors.availableSoft },
        iconTaken: { backgroundColor: colors.occupiedSoft },
        iconOffline: { backgroundColor: colors.warningSoft },
        copy: { flex: 1, minWidth: 0 },
        slotTitle: {
          fontSize: 18,
          fontWeight: '800',
          color: colors.text,
          letterSpacing: -0.3,
        },
        meta: { marginTop: 3, color: colors.textMuted, fontSize: 13, fontWeight: '600' },
        hint: {
          marginTop: 10,
          color: colors.warning,
          fontSize: 13,
          fontWeight: '700',
          lineHeight: 18,
        },
        action: { marginTop: 14 },
        loading: { paddingTop: 48, alignItems: 'center', gap: 12 },
        loadingText: { color: colors.textMuted, fontWeight: '600' },
      }),
    [colors],
  );

  async function toggle(slot: ParkingSlot) {
    if (!isOnline) {
      Alert.alert('You’re offline', 'Reconnect to update slot occupancy.');
      return;
    }
    const next = slot.status === 'Available' ? 'Occupied' : 'Available';
    setBusyId(slot.slotId);
    try {
      await setSlotOccupancy(slot.slotId, next);
      if (next === 'Available') {
        await notifyWatchers(slot);
      }
    } catch (error) {
      Alert.alert('Update failed', readableNetworkError(error, 'Unknown error'));
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
    <Screen overlayTabBar>
      <View style={styles.header}>
        <Text style={styles.title}>Slots</Text>
        <Text style={styles.subtitle}>
          Simulate ESP32 occupancy writes. Offline sensors stay hidden from drivers.
        </Text>
      </View>

      <View style={styles.summary}>
        <StatusBadge label={`${stats.available} open`} tone="available" />
        <StatusBadge label={`${stats.occupied} taken`} tone="occupied" />
        {offlineCount > 0 ? (
          <StatusBadge label={`${offlineCount} offline`} tone="warning" />
        ) : null}
      </View>

      <FlatList
        data={slots}
        keyExtractor={(item) => item.slotId}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={6}
        windowSize={7}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>Loading slots…</Text>
            </View>
          ) : (
            <EmptyState
              icon="car-outline"
              title="No slots"
              subtitle="Seed the demo lot from the dashboard first."
            />
          )
        }
        renderItem={({ item }) => {
          const offline = isSensorFaulty(item.slotId);
          const open = item.status === 'Available';
          return (
            <GlassCard style={styles.card}>
              <View
                style={[
                  styles.accent,
                  offline ? styles.accentOffline : open ? styles.accentOpen : styles.accentTaken,
                ]}
              />
              <View style={styles.body}>
                <View style={styles.row}>
                  <View style={styles.identity}>
                    <View
                      style={[
                        styles.iconWrap,
                        offline ? styles.iconOffline : open ? styles.iconOpen : styles.iconTaken,
                      ]}
                    >
                      <Ionicons
                        name={offline ? 'cloud-offline-outline' : open ? 'car-outline' : 'car'}
                        size={22}
                        color={
                          offline ? colors.warning : open ? colors.available : colors.occupied
                        }
                      />
                    </View>
                    <View style={styles.copy}>
                      <Text style={styles.slotTitle}>{item.slotNumber}</Text>
                      <Text style={styles.meta} numberOfLines={1}>
                        {item.locationName}
                      </Text>
                    </View>
                  </View>
                  <StatusBadge
                    label={offline ? 'Sensor offline' : item.status}
                    tone={offline ? 'warning' : open ? 'available' : 'occupied'}
                  />
                </View>
                {offline ? (
                  <Text style={styles.hint}>
                    Hidden from drivers until the sensor is marked healthy.
                  </Text>
                ) : null}
                <Button
                  title={open ? 'Mark occupied' : 'Mark available'}
                  variant={open ? 'danger' : 'primary'}
                  loading={busyId === item.slotId}
                  disabled={offline}
                  onPress={() => confirmToggle(item)}
                  style={styles.action}
                />
              </View>
            </GlassCard>
          );
        }}
      />
    </Screen>
  );
}

async function notifyWatchers(slot: ParkingSlot) {
  const watchers = await listLotWatcherIds(slot.locationName);
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
