import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { initialsFromName } from '../../components/Avatar';
import { BrandHeader } from '../../components/BrandHeader';
import { Button } from '../../components/Button';
import { GlassCard } from '../../components/GlassCard';
import { Screen } from '../../components/Screen';
import { StatCard } from '../../components/StatCard';
import { useParkingSlots } from '../../hooks/useParkingSlots';
import { useAuthStore } from '../../store/authStore';
import { seedDemoLot, seedDemoLotIfEmpty } from '../../services/seedService';
import { useTheme } from '../../theme/ThemeProvider';

export function AdminDashboardScreen() {
  const { colors } = useTheme();
  const profile = useAuthStore((state) => state.profile);
  const { stats, slots, loading } = useParkingSlots();
  const initials = initialsFromName(profile?.fullName ?? 'A');
  const [busy, setBusy] = useState(false);
  const occupancy = stats.total === 0 ? 0 : Math.round((stats.occupied / stats.total) * 100);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        flex: { flex: 1 },
        content: { paddingBottom: 28, gap: 0 },
        greeting: { fontSize: 16, color: colors.textMuted },
        name: { fontSize: 32, fontWeight: '800', color: colors.text, letterSpacing: -0.7, marginTop: 2 },
        lede: { marginTop: 6, marginBottom: 18, color: colors.textMuted },
        hero: { marginBottom: 14, padding: 18 },
        heroLabel: { color: colors.textMuted, fontWeight: '700' },
        heroValue: { fontSize: 36, fontWeight: '800', color: colors.primaryDark, letterSpacing: -1, marginVertical: 6 },
        track: { height: 10, backgroundColor: colors.occupiedSoft, borderRadius: 99, overflow: 'hidden' },
        fill: { height: '100%', backgroundColor: colors.occupied },
        heroHint: { marginTop: 10, color: colors.textMuted },
        row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
        note: { marginBottom: 16, padding: 16 },
        noteTitle: { fontWeight: '700', color: colors.text, marginBottom: 6 },
        noteBody: { color: colors.textMuted, lineHeight: 20 },
        spaced: { marginTop: 10 },
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
        <BrandHeader initials={initials} photoUrl={profile?.photoUrl} />
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
          <Text style={styles.heroLabel}>Occupancy</Text>
          <Text style={styles.heroValue}>{loading ? '—' : `${occupancy}%`}</Text>
          <View style={styles.track} accessibilityLabel={`Occupancy ${occupancy} percent`}>
            <View style={[styles.fill, { width: `${occupancy}%` }]} />
          </View>
          <Text style={styles.heroHint}>
            {stats.total} slots total · {stats.available} open · {stats.occupied} taken
          </Text>
        </GlassCard>

        <View style={styles.row}>
          <StatCard label="Available" value={loading ? '—' : stats.available} accent={colors.available} />
          <StatCard label="Occupied" value={loading ? '—' : stats.occupied} accent={colors.occupied} />
        </View>
        <View style={styles.row}>
          <StatCard label="Healthy sensors" value={loading ? '—' : stats.healthySensors} />
          <StatCard label="Faulty" value={loading ? '—' : stats.faultySensors} accent={colors.warning} />
        </View>

        <GlassCard style={styles.note}>
          <Text style={styles.noteTitle}>IoT simulator</Text>
          <Text style={styles.noteBody}>
            {slots.length === 0
              ? 'No hardware yet. Seed the demo lot to simulate ESP32 writes.'
              : 'Toggling a slot on the Slots tab updates the same Firebase path an ESP32 will use.'}
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
