import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { initialsFromName } from '../../components/Avatar';
import { BrandHeader } from '../../components/BrandHeader';
import { Button } from '../../components/Button';
import { GlassCard } from '../../components/GlassCard';
import { Screen } from '../../components/Screen';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import { useNotifications } from '../../hooks/useNotifications';
import { useParkingSlots } from '../../hooks/useParkingSlots';
import type { AdminTabParamList } from '../../navigation/types';
import { markNotificationRead } from '../../services/notificationService';
import { seedDemoLot, seedDemoLotIfEmpty } from '../../services/seedService';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';

type TabNav = {
  navigate: (screen: keyof AdminTabParamList) => void;
};

export function AdminDashboardScreen() {
  const { colors } = useTheme();
  const tabNavigation = useNavigation() as unknown as TabNav;
  const profile = useAuthStore((state) => state.profile);
  const { stats, slots, offlineSlots, loading } = useParkingSlots();
  const { items: alerts, unreadCount } = useNotifications(profile?.userId);
  const initials = initialsFromName(profile?.fullName ?? 'A');
  const [busy, setBusy] = useState(false);
  const occupancy =
    stats.onlineTotal === 0 ? 0 : Math.round((stats.onlineOccupied / stats.onlineTotal) * 100);
  const recentAlerts = alerts.slice(0, 5);

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
        hero: { marginBottom: 14, padding: 18 },
        heroLabel: { color: colors.textMuted, fontWeight: '700' },
        heroValue: {
          fontSize: 36,
          fontWeight: '800',
          color: colors.primaryDark,
          letterSpacing: -1,
          marginVertical: 6,
        },
        track: { height: 10, backgroundColor: colors.occupiedSoft, borderRadius: 99, overflow: 'hidden' },
        fill: { height: '100%', backgroundColor: colors.occupied },
        heroHint: { marginTop: 10, color: colors.textMuted },
        row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
        note: { marginBottom: 16, padding: 16 },
        noteTitle: { fontWeight: '700', color: colors.text, marginBottom: 6 },
        noteBody: { color: colors.textMuted, lineHeight: 20 },
        spaced: { marginTop: 10 },
        sectionTitle: {
          marginTop: 4,
          marginBottom: 10,
          fontSize: 13,
          fontWeight: '800',
          letterSpacing: 0.8,
          color: colors.textMuted,
        },
        alertCard: { marginBottom: 10, padding: 14 },
        alertRow: { gap: 8 },
        alertBody: { fontSize: 14, fontWeight: '600', color: colors.text, lineHeight: 20 },
        alertTime: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
        offlineList: { marginTop: 8, gap: 6 },
        offlineItem: { color: colors.warning, fontWeight: '700', fontSize: 13 },
      }),
    [colors],
  );

  async function seed(force: boolean) {
    setBusy(true);
    try {
      if (force) {
        await seedDemoLot();
        Alert.alert('Demo lot ready', 'Ten simulated slots were written to Firebase.');
      } else {
        const created = await seedDemoLotIfEmpty();
        Alert.alert(
          created ? 'Demo lot seeded' : 'Slots already exist',
          created
            ? 'VU Main Campus Lot is now live on the map.'
            : 'The database already has parking slots.',
        );
      }
    } catch (error) {
      Alert.alert('Seed failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  function confirmReset() {
    Alert.alert(
      'Reset the demo lot?',
      'This replaces current slot data with the 10-slot campus sample.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset lot', onPress: () => void seed(true) },
      ],
    );
  }

  return (
    <Screen>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BrandHeader
          initials={initials}
          photoUrl={profile?.photoUrl}
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
        <Text style={styles.lede}>Live occupancy and mock IoT health.</Text>

        <GlassCard style={styles.hero}>
          <Text style={styles.heroLabel}>Occupancy (online sensors)</Text>
          <Text style={styles.heroValue}>{loading ? '—' : `${occupancy}%`}</Text>
          <View style={styles.track} accessibilityLabel={`Occupancy ${occupancy} percent`}>
            <View style={[styles.fill, { width: `${occupancy}%` }]} />
          </View>
          <Text style={styles.heroHint}>
            {stats.onlineTotal} online · {stats.onlineAvailable} open · {stats.onlineOccupied} taken
            {stats.offlineSensors > 0 ? ` · ${stats.offlineSensors} offline` : ''}
          </Text>
        </GlassCard>

        <View style={styles.row}>
          <StatCard
            label="Available"
            value={loading ? '—' : stats.onlineAvailable}
            accent={colors.available}
          />
          <StatCard
            label="Occupied"
            value={loading ? '—' : stats.onlineOccupied}
            accent={colors.occupied}
          />
        </View>
        <View style={styles.row}>
          <StatCard label="Healthy sensors" value={loading ? '—' : stats.healthySensors} />
          <StatCard
            label="Sensor offline"
            value={loading ? '—' : stats.faultySensors}
            accent={colors.warning}
          />
        </View>

        {offlineSlots.length > 0 ? (
          <GlassCard style={styles.note}>
            <Text style={styles.noteTitle}>Hidden from drivers</Text>
            <Text style={styles.noteBody}>
              These spaces are offline (sensor faulty) and do not appear on the driver map.
            </Text>
            <View style={styles.offlineList}>
              {offlineSlots.map((slot) => (
                <Text key={slot.slotId} style={styles.offlineItem}>
                  · {slot.slotNumber} — sensor offline
                </Text>
              ))}
            </View>
          </GlassCard>
        ) : null}

        <Text style={styles.sectionTitle}>ADMIN ALERTS {unreadCount > 0 ? `(${unreadCount})` : ''}</Text>
        {recentAlerts.length === 0 ? (
          <GlassCard style={styles.note}>
            <Text style={styles.noteBody}>
              No sensor alerts yet. Mark a sensor faulty on the Sensors tab to test admin alerts.
            </Text>
          </GlassCard>
        ) : (
          recentAlerts.map((item) => (
            <GlassCard key={item.notificationId} style={styles.alertCard}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (!profile?.userId || item.isRead) {
                    return;
                  }
                  void markNotificationRead(profile.userId, item.notificationId);
                }}
                style={styles.alertRow}
              >
                <StatusBadge
                  label={item.isRead ? 'Read' : 'New'}
                  tone={item.isRead ? 'neutral' : 'warning'}
                />
                <Text style={styles.alertBody}>{item.message}</Text>
                <Text style={styles.alertTime}>{new Date(item.createdTime).toLocaleString()}</Text>
              </Pressable>
            </GlassCard>
          ))
        )}

        <GlassCard style={styles.note}>
          <Text style={styles.noteTitle}>IoT simulator</Text>
          <Text style={styles.noteBody}>
            {slots.length === 0
              ? 'No hardware yet. Seed the demo lot to simulate ESP32 writes.'
              : 'Toggling a slot on the Slots tab updates the same Firebase path an ESP32 will use. Marking a sensor faulty hides that pin from drivers.'}
          </Text>
        </GlassCard>

        <Button title="Seed demo lot if empty" loading={busy} onPress={() => void seed(false)} />
        <Button
          title="Reset demo lot"
          variant="secondary"
          loading={busy}
          onPress={confirmReset}
          style={styles.spaced}
        />
      </ScrollView>
    </Screen>
  );
}
