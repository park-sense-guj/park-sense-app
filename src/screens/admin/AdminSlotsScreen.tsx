import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '../../components/EmptyState';
import { GlassCard } from '../../components/GlassCard';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { useParkingSlots } from '../../hooks/useParkingSlots';
import type { AdminStackParamList } from '../../navigation/types';
import { holdIsLive } from '../../services/parkingHoldService';
import { useTheme } from '../../theme/ThemeProvider';

export function AdminSlotsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const { slots, stats, loading, isSensorFaulty, sensorForSlot } = useParkingSlots();
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
          color: colors.textMuted,
          fontSize: 13,
          fontWeight: '600',
          lineHeight: 18,
        },
        loading: { paddingTop: 48, alignItems: 'center', gap: 12 },
        loadingText: { color: colors.textMuted, fontWeight: '600' },
      }),
    [colors],
  );

  return (
    <Screen overlayTabBar>
      <View style={styles.header}>
        <Text style={styles.title}>Slots</Text>
        <Text style={styles.subtitle}>
          Live occupancy from the ESP32 IR sensors. Tap a bay to print its QR sticker.
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
              subtitle="Seed the live lot from the dashboard first."
            />
          )
        }
        renderItem={({ item }) => {
          const offline = isSensorFaulty(item.slotId);
          const open = item.status === 'Available';
          const sensor = sensorForSlot(item.slotId);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Show QR sticker for ${item.slotNumber}`}
              onPress={() => navigation.navigate('BayQr', { slot: item })}
            >
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
                    label={
                      offline
                        ? 'Sensor offline'
                        : item.status === 'Occupied'
                          ? 'Occupied'
                          : holdIsLive(item)
                            ? 'Held'
                            : 'Available'
                    }
                    tone={
                      offline
                        ? 'warning'
                        : item.status === 'Occupied'
                          ? 'occupied'
                          : holdIsLive(item)
                            ? 'warning'
                            : 'available'
                    }
                  />
                </View>
                <Text style={styles.hint}>
                  {offline
                    ? 'IR sensor is offline. The pin stays on the map for drivers; occupancy will resume when the board reconnects.'
                    : item.occupiedByName
                      ? `Parked by ${item.occupiedByName}`
                      : item.heldByName && holdIsLive(item)
                        ? `Held by ${item.heldByName}`
                        : sensor?.lastUpdated
                          ? `IR live · updated ${new Date(sensor.lastUpdated).toLocaleTimeString([], {
                              hour: 'numeric',
                              minute: '2-digit',
                              second: '2-digit',
                            })}`
                          : 'Waiting for the ESP32 to publish occupancy.'}
                </Text>
              </View>
            </GlassCard>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}
