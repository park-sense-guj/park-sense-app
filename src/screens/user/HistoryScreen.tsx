import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { initialsFromName } from '../../components/Avatar';
import { BrandHeader } from '../../components/BrandHeader';
import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';
import { colors } from '../../config/theme';
import { listenParkingHistory } from '../../services/historyService';
import { useAuthStore } from '../../store/authStore';
import type { ParkingHistory } from '../../types';

export function HistoryScreen() {
  const profile = useAuthStore((state) => state.profile);
  const [items, setItems] = useState<ParkingHistory[]>([]);
  const [ready, setReady] = useState(false);
  const initials = initialsFromName(profile?.fullName);

  useEffect(() => {
    if (!profile) {
      return;
    }
    return listenParkingHistory(profile.userId, (next) => {
      setItems(next);
      setReady(true);
    });
  }, [profile]);

  return (
    <Screen>
      <BrandHeader initials={initials} photoUrl={profile?.photoUrl} />
      <Text style={styles.title}>Activity</Text>
      <Text style={styles.subtitle}>Your parking sessions on this device.</Text>
      {!ready ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading sessions…</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.historyId}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          ListEmptyComponent={
            <EmptyState
              icon="time-outline"
              title="No sessions yet"
              subtitle="Navigate to a slot and tap I’m parked to start a history record."
            />
          }
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text style={styles.kicker}>{item.exitTime ? 'COMPLETED' : 'IN PROGRESS'}</Text>
              <Text style={styles.body}>
                {item.slotNumber} · {item.locationName}
              </Text>
              <Text style={styles.time}>Arrived {formatTime(item.entryTime)}</Text>
              <Text style={styles.time}>
                {item.exitTime ? `Left ${formatTime(item.exitTime)}` : 'Still parked'}
              </Text>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

function formatTime(value: number): string {
  return new Date(value).toLocaleString();
}

const styles = StyleSheet.create({
  title: { fontSize: 32, fontWeight: '800', color: colors.text, letterSpacing: -0.6 },
  subtitle: { marginTop: 6, marginBottom: 18, color: colors.textMuted, lineHeight: 20 },
  list: { paddingBottom: 12 },
  item: { paddingVertical: 14 },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: colors.primary },
  body: { marginTop: 6, fontSize: 17, fontWeight: '700', color: colors.text },
  time: { marginTop: 6, color: colors.textMuted, fontSize: 13 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  loading: { paddingTop: 48, alignItems: 'center', gap: 12 },
  loadingText: { color: colors.textMuted, fontWeight: '600' },
});
