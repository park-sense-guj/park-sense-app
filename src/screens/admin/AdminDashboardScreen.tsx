import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { initialsFromName } from '../../components/Avatar';
import { BrandHeader } from '../../components/BrandHeader';
import { Button } from '../../components/Button';
import { DonutChart } from '../../components/DonutChart';
import { GlassCard } from '../../components/GlassCard';
import { Screen } from '../../components/Screen';
import { radius } from '../../config/theme';
import { useNotifications } from '../../hooks/useNotifications';
import { useParkingSlots } from '../../hooks/useParkingSlots';
import type { AdminStackParamList, AdminTabParamList } from '../../navigation/types';
import {
  readDeviceLotPlacement,
} from '../../services/lotPlacementService';
import {
  relocateLiveLot,
  seedDemoLot,
  seedDemoLotIfEmpty,
} from '../../services/seedService';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';

type TabNav = {
  navigate: (screen: keyof AdminTabParamList) => void;
};

export function AdminDashboardScreen() {
  const { colors } = useTheme();
  const stackNavigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const tabNavigation = useNavigation() as unknown as TabNav;
  const profile = useAuthStore((state) => state.profile);
  const { stats, slots, offlineSlots, loading } = useParkingSlots();
  const { unreadCount } = useNotifications(profile?.userId);
  const initials = initialsFromName(profile?.fullName ?? 'A');
  const [busy, setBusy] = useState(false);
  const occupancy =
    stats.onlineTotal === 0 ? 0 : Math.round((stats.onlineOccupied / stats.onlineTotal) * 100);
  const healthyPct =
    stats.healthySensors + stats.faultySensors === 0
      ? 0
      : Math.round(
          (stats.healthySensors / (stats.healthySensors + stats.faultySensors)) * 100,
        );

  const occupancySegments = useMemo(
    () => [
      { value: stats.onlineAvailable, color: colors.available, label: 'Open' },
      { value: stats.onlineOccupied, color: colors.occupied, label: 'Taken' },
    ],
    [stats.onlineAvailable, stats.onlineOccupied, colors.available, colors.occupied],
  );

  const sensorSegments = useMemo(
    () => [
      { value: stats.healthySensors, color: colors.primary, label: 'Healthy' },
      { value: stats.faultySensors, color: colors.warning, label: 'Offline' },
    ],
    [stats.healthySensors, stats.faultySensors, colors.primary, colors.warning],
  );

  const occupancyProgress =
    stats.onlineTotal === 0 ? 0 : stats.onlineOccupied / stats.onlineTotal;
  const sensorProgress =
    stats.healthySensors + stats.faultySensors === 0
      ? 0
      : stats.healthySensors / (stats.healthySensors + stats.faultySensors);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        flex: { flex: 1 },
        content: { paddingBottom: 28, gap: 0 },
        greeting: { fontSize: 16, color: colors.textMuted },
        name: {
          fontSize: 32,
          fontWeight: '800',
          color: colors.text,
          letterSpacing: -0.7,
          marginTop: 2,
        },
        lede: { marginTop: 6, marginBottom: 18, color: colors.textMuted },
        chartsCard: { marginBottom: 14, padding: 16 },
        chartsTitle: {
          fontSize: 13,
          fontWeight: '800',
          letterSpacing: 0.6,
          color: colors.textMuted,
          marginBottom: 14,
        },
        chartsRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: 8,
        },
        chartCol: { flex: 1, alignItems: 'center', gap: 10 },
        chartCaption: {
          fontSize: 12,
          fontWeight: '800',
          color: colors.text,
          textAlign: 'center',
        },
        legend: { width: '100%', gap: 6 },
        legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        legendDot: { width: 8, height: 8, borderRadius: 4 },
        legendText: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.textMuted },
        legendValue: { fontSize: 12, fontWeight: '800', color: colors.text },
        chartsHint: {
          marginTop: 14,
          fontSize: 12,
          fontWeight: '600',
          color: colors.textMuted,
          textAlign: 'center',
          lineHeight: 17,
        },
        note: { marginBottom: 16, padding: 16 },
        noteTitle: { fontWeight: '700', color: colors.text, marginBottom: 6 },
        noteBody: { color: colors.textMuted, lineHeight: 20 },
        spaced: { marginTop: 10 },
        offlineCard: {
          marginBottom: 14,
          padding: 14,
        },
        offlineHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          marginBottom: 10,
        },
        offlineIcon: {
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: colors.warningSoft,
          alignItems: 'center',
          justifyContent: 'center',
        },
        offlineHeaderCopy: { flex: 1, minWidth: 0 },
        offlineTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
        offlineHint: { marginTop: 2, fontSize: 12, color: colors.textMuted, lineHeight: 16 },
        chipWrap: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 12,
        },
        chip: {
          paddingVertical: 6,
          paddingHorizontal: 10,
          borderRadius: radius.pill,
          backgroundColor: colors.primaryMuted,
          borderWidth: 1,
          borderColor: colors.border,
        },
        chipText: { fontSize: 12, fontWeight: '800', color: colors.primaryDark },
        fixBtn: {
          minHeight: 40,
          borderRadius: radius.md,
          backgroundColor: colors.primarySoft,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        },
        fixBtnText: { fontSize: 13, fontWeight: '800', color: colors.primaryDark },
        quickRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
        quickBtn: {
          flex: 1,
          minHeight: 44,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 10,
        },
        quickBtnText: { color: colors.primaryDark, fontWeight: '800', fontSize: 13 },
      }),
    [colors],
  );

  async function seed(force: boolean) {
    setBusy(true);
    try {
      const placement = await readDeviceLotPlacement();
      if (force) {
        await seedDemoLot(placement);
        Alert.alert(
          'Live lot ready',
          `A-01, A-02, and A-03 are now at your location (${placement.locationName}). Cover an IR sensor to mark Taken.`,
        );
      } else {
        const created = await seedDemoLotIfEmpty(placement);
        Alert.alert(
          created ? 'Live lot seeded' : 'Slots already exist',
          created
            ? `A-01, A-02, and A-03 are on the map at ${placement.locationName}.`
            : 'The database already has parking slots. Use Place pins here to move them off the old Lahore demo, or Reset to keep only the 3 ESP32 bays.',
        );
      }
    } catch (error) {
      Alert.alert('Seed failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  async function placeHere() {
    setBusy(true);
    try {
      const placement = await readDeviceLotPlacement();
      const count = await relocateLiveLot(placement);
      Alert.alert(
        'Pins moved',
        `${count} live bays are now at ${placement.locationName}. Open/Taken still comes from the IR sensors.`,
      );
    } catch (error) {
      Alert.alert('Could not move pins', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  function confirmReset() {
    Alert.alert(
      'Replace mock lot with live hardware?',
      'This keeps only A-01, A-02, A-03 and places those pins at your current GPS — not the old Lahore campus sample.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Use 3 live bays', onPress: () => void seed(true) },
      ],
    );
  }

  function confirmPlaceHere() {
    Alert.alert(
      'Place pins at your GPS?',
      'This moves the live ESP32 bays to where you are standing. Occupancy is not changed.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Move pins here', onPress: () => void placeHere() },
      ],
    );
  }

  return (
    <Screen>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BrandHeader
          initials={initials}
          photoUrl={profile?.photoUrl}
          alertsBadge={unreadCount}
          onAlertsPress={() => stackNavigation.navigate('Alerts')}
          onProfilePress={() => tabNavigation.navigate('ProfileTab')}
        />
        <Text style={styles.greeting}>
          {new Date().getHours() < 12
            ? 'Good morning'
            : new Date().getHours() < 18
              ? 'Good afternoon'
              : 'Good evening'}
        </Text>
        <Text style={styles.name}>{profile?.fullName ?? 'Admin'}</Text>
        <Text style={styles.lede}>Live occupancy, sensor health, and admin alerts.</Text>

        <GlassCard style={styles.chartsCard}>
          <Text style={styles.chartsTitle}>LIVE SNAPSHOT</Text>
          <View style={styles.chartsRow}>
            <View style={styles.chartCol}>
              <DonutChart
                progress={occupancyProgress}
                fillColor={colors.occupied}
                trackColor={colors.available}
                centerValue={loading ? '—' : `${occupancy}%`}
                centerLabel="taken"
              />
              <Text style={styles.chartCaption}>Occupancy</Text>
              <View style={styles.legend}>
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: colors.available }]} />
                  <Text style={styles.legendText}>Open</Text>
                  <Text style={styles.legendValue}>
                    {loading ? '—' : occupancySegments[0].value}
                  </Text>
                </View>
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: colors.occupied }]} />
                  <Text style={styles.legendText}>Taken</Text>
                  <Text style={styles.legendValue}>
                    {loading ? '—' : occupancySegments[1].value}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.chartCol}>
              <DonutChart
                progress={sensorProgress}
                fillColor={colors.primary}
                trackColor={colors.warning}
                centerValue={loading ? '—' : `${healthyPct}%`}
                centerLabel="healthy"
              />
              <Text style={styles.chartCaption}>Sensors</Text>
              <View style={styles.legend}>
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                  <Text style={styles.legendText}>Healthy</Text>
                  <Text style={styles.legendValue}>
                    {loading ? '—' : sensorSegments[0].value}
                  </Text>
                </View>
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
                  <Text style={styles.legendText}>Offline</Text>
                  <Text style={styles.legendValue}>
                    {loading ? '—' : sensorSegments[1].value}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <Text style={styles.chartsHint}>
            {loading
              ? 'Loading live counts…'
              : `${stats.onlineTotal} live pins · ${stats.offlineSensors} offline (still on the map)`}
          </Text>
        </GlassCard>

        <View style={styles.quickRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Sensors"
            onPress={() => tabNavigation.navigate('SensorsTab')}
            style={styles.quickBtn}
          >
            <Text style={styles.quickBtnText}>Manage sensors</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Slots"
            onPress={() => tabNavigation.navigate('SlotsTab')}
            style={styles.quickBtn}
          >
            <Text style={styles.quickBtnText}>Manage slots</Text>
          </Pressable>
        </View>

        {offlineSlots.length > 0 ? (
          <GlassCard style={styles.offlineCard}>
            <View style={styles.offlineHeader}>
              <View style={styles.offlineIcon}>
                <Ionicons name="eye-off-outline" size={16} color={colors.warning} />
              </View>
              <View style={styles.offlineHeaderCopy}>
                <Text style={styles.offlineTitle}>
                  {offlineSlots.length} sensor{offlineSlots.length === 1 ? '' : 's'} offline
                </Text>
                <Text style={styles.offlineHint}>
                  Driver pins stay visible in grey until those ESP32s heartbeat again.
                </Text>
              </View>
            </View>
            <View style={styles.chipWrap}>
              {offlineSlots.map((slot) => (
                <View key={slot.slotId} style={styles.chip}>
                  <Text style={styles.chipText}>{slot.slotNumber}</Text>
                </View>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fix offline sensors"
              onPress={() => tabNavigation.navigate('SensorsTab')}
              style={({ pressed }) => [styles.fixBtn, pressed && { opacity: 0.88 }]}
            >
              <Text style={styles.fixBtnText}>Fix on Sensors</Text>
            </Pressable>
          </GlassCard>
        ) : null}

        <GlassCard style={styles.note}>
          <Text style={styles.noteTitle}>Live ESP32 nodes</Text>
          <Text style={styles.noteBody}>
            {slots.length === 0
              ? 'No bays yet. Seed the 3-bay hardware lot at your GPS, then keep the ESP32s on Wi-Fi.'
              : 'Pins used to sit on a Lahore campus sample. Place them here so navigation matches the sensors. Cover an IR module to show Taken; uncover to show Open. Occupancy is not toggled in the app.'}
          </Text>
        </GlassCard>

        <Button title="Place pins at my location" loading={busy} onPress={confirmPlaceHere} />
        <Button
          title="Seed live lot if empty"
          variant="secondary"
          loading={busy}
          onPress={() => void seed(false)}
          style={styles.spaced}
        />
        <Button
          title="Reset to 3 live bays"
          variant="secondary"
          loading={busy}
          onPress={confirmReset}
          style={styles.spaced}
        />
      </ScrollView>
    </Screen>
  );
}
