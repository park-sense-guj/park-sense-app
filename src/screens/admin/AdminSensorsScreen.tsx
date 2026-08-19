import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { GlassCard } from '../../components/GlassCard';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { useParkingSlots } from '../../hooks/useParkingSlots';
import { setSensorStatus } from '../../services/parkingService';
import {
  notifyAdminsSensorFault,
  notifyAdminsSensorRestored,
} from '../../services/sensorAlertService';
import { readableNetworkError } from '../../services/networkService';
import { useConnectivityStore } from '../../store/connectivityStore';
import { useTheme } from '../../theme/ThemeProvider';

export function AdminSensorsScreen() {
  const { colors } = useTheme();
  const { sensors, slots, stats, loading, isSensorFaulty } = useParkingSlots();
  const isOnline = useConnectivityStore((state) => state.isOnline);
  const [busyId, setBusyId] = useState<string | null>(null);
  const slotById = Object.fromEntries(slots.map((slot) => [slot.slotId, slot]));

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
        accentOk: { backgroundColor: colors.available },
        accentBad: { backgroundColor: colors.warning },
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
        iconOk: { backgroundColor: colors.availableSoft },
        iconBad: { backgroundColor: colors.warningSoft },
        copy: { flex: 1, minWidth: 0 },
        slotTitle: {
          fontSize: 18,
          fontWeight: '800',
          color: colors.text,
          letterSpacing: -0.3,
        },
        meta: { marginTop: 3, color: colors.textMuted, fontSize: 13, fontWeight: '600', lineHeight: 18 },
        hint: {
          marginTop: 10,
          padding: 12,
          borderRadius: 14,
          backgroundColor: colors.warningSoft,
        },
        hintText: { color: colors.warning, fontSize: 13, fontWeight: '700', lineHeight: 18 },
        action: { marginTop: 14 },
        loading: { paddingTop: 48, alignItems: 'center', gap: 12 },
        loadingText: { color: colors.textMuted, fontWeight: '600' },
      }),
    [colors],
  );

  async function toggleFault(sensorId: string, current: string, slotId: string) {
    if (!isOnline) {
      Alert.alert('You’re offline', 'Reconnect to update sensor status.');
      return;
    }
    const slot = slotById[slotId];
    const slotNumber = slot?.slotNumber ?? slotId;
    const sensor = sensors.find((item) => item.sensorId === sensorId);
    const restoredStatus =
      sensor?.sensorType === 'IR' || sensor?.sensorType === 'Ultrasonic' ? 'Active' : 'Simulated';
    const next = current === 'Faulty' ? restoredStatus : 'Faulty';

    if (next === 'Faulty' && slot?.status === 'Occupied') {
      Alert.alert(
        'Can’t mark faulty while occupied',
        `${slotNumber} is currently taken. Ask the driver to leave (or mark the slot available on Slots) before taking this sensor offline.`,
      );
      return;
    }

    setBusyId(sensorId);
    try {
      await setSensorStatus(sensorId, next);
      if (next === 'Faulty') {
        await notifyAdminsSensorFault({ slotId, slotNumber, sensorId });
        Alert.alert(
          'Sensor marked faulty',
          `${slotNumber} is now offline. Drivers won’t see that pin until you mark it healthy.`,
        );
      } else {
        await notifyAdminsSensorRestored({ slotId, slotNumber });
        Alert.alert('Sensor restored', `${slotNumber} is visible on the driver map again.`);
      }
    } catch (error) {
      Alert.alert('Update failed', readableNetworkError(error, 'Try again.'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen overlayTabBar>
      <View style={styles.header}>
        <Text style={styles.title}>Sensors</Text>
        <Text style={styles.subtitle}>
          Mark faulty to hide that pin from drivers and notify admins.
        </Text>
      </View>

      <View style={styles.summary}>
        <StatusBadge label={`${stats.healthySensors} healthy`} tone="available" />
        <StatusBadge label={`${stats.faultySensors} offline`} tone="warning" />
      </View>

      <FlatList
        data={sensors}
        keyExtractor={(item) => item.sensorId}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={6}
        windowSize={7}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>Loading sensors…</Text>
            </View>
          ) : (
            <EmptyState
              icon="hardware-chip-outline"
              title="No sensors"
              subtitle="Seed the live lot from the dashboard first."
            />
          )
        }
        renderItem={({ item }) => {
          const faulty = item.sensorStatus === 'Faulty' || isSensorFaulty(item.slotId);
          const silent = item.sensorStatus !== 'Faulty' && isSensorFaulty(item.slotId);
          const slot = slotById[item.slotId];
          const slotNumber = slot?.slotNumber ?? item.slotId;
          const occupied = slot?.status === 'Occupied';
          const blockFaulty = !faulty && occupied;
          return (
            <GlassCard style={styles.card}>
              <View style={[styles.accent, faulty ? styles.accentBad : styles.accentOk]} />
              <View style={styles.body}>
                <View style={styles.row}>
                  <View style={styles.identity}>
                    <View style={[styles.iconWrap, faulty ? styles.iconBad : styles.iconOk]}>
                      <Ionicons
                        name={faulty ? 'warning-outline' : 'hardware-chip-outline'}
                        size={22}
                        color={faulty ? colors.warning : colors.available}
                      />
                    </View>
                    <View style={styles.copy}>
                      <Text style={styles.slotTitle}>{slotNumber}</Text>
                      <Text style={styles.meta}>
                        {item.sensorType}
                        {occupied ? ' · occupied' : ' · open'}
                        {' · updated '}
                        {new Date(item.lastUpdated).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                  <StatusBadge
                    label={
                      item.sensorStatus === 'Faulty'
                        ? 'Sensor offline'
                        : silent
                          ? 'Unplugged'
                          : occupied
                            ? 'In use'
                            : 'Healthy'
                    }
                    tone={faulty ? 'warning' : occupied ? 'occupied' : 'available'}
                  />
                </View>
                {item.sensorStatus === 'Faulty' ? (
                  <View style={styles.hint}>
                    <Text style={styles.hintText}>
                      Shown as Offline on the driver map until you mark this sensor healthy.
                    </Text>
                  </View>
                ) : silent ? (
                  <View style={styles.hint}>
                    <Text style={styles.hintText}>
                      This ESP32 stopped publishing. The pin stays on the map as Offline.
                    </Text>
                  </View>
                ) : null}
                {blockFaulty ? (
                  <View style={styles.hint}>
                    <Text style={styles.hintText}>
                      A driver may be parked here. Free the slot first, then mark the sensor faulty.
                    </Text>
                  </View>
                ) : null}
                <Button
                  title={item.sensorStatus === 'Faulty' ? 'Mark healthy' : 'Mark faulty'}
                  variant={item.sensorStatus === 'Faulty' ? 'primary' : 'secondary'}
                  loading={busyId === item.sensorId}
                  disabled={blockFaulty || silent}
                  onPress={() => void toggleFault(item.sensorId, item.sensorStatus, item.slotId)}
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
