import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { initialsFromName } from '../../components/Avatar';
import { BrandHeader } from '../../components/BrandHeader';
import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { useNotifications } from '../../hooks/useNotifications';
import { useParkingHistory } from '../../hooks/useParkingHistory';
import type { UserStackParamList, UserTabParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';

type TabNav = {
  navigate: (screen: keyof UserTabParamList) => void;
};

export function HistoryScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<UserStackParamList>>();
  const tabNavigation = useNavigation() as unknown as TabNav;
  const profile = useAuthStore((state) => state.profile);
  const { unreadCount } = useNotifications(profile?.userId);
  const { items, ready, error } = useParkingHistory(profile?.userId);
  const initials = initialsFromName(profile?.fullName);
  const activeCount = items.filter((item) => !item.exitTime).length;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        title: { fontSize: 32, fontWeight: '800', color: colors.text, letterSpacing: -0.6 },
        subtitle: { marginTop: 6, marginBottom: 18, color: colors.textMuted, lineHeight: 20 },
        list: { paddingBottom: 24 },
        item: { paddingVertical: 14, gap: 6 },
        itemHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        },
        body: { fontSize: 17, fontWeight: '700', color: colors.text },
        time: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
        duration: { color: colors.primaryDark, fontSize: 13, fontWeight: '700' },
        divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
        loading: { paddingTop: 48, alignItems: 'center', gap: 12 },
        loadingText: { color: colors.textMuted, fontWeight: '600' },
      }),
    [colors],
  );

  return (
    <Screen>
      <BrandHeader
        initials={initials}
        photoUrl={profile?.photoUrl}
        alertsBadge={unreadCount}
        onAlertsPress={() => navigation.navigate('Alerts')}
        onProfilePress={() => tabNavigation.navigate('ProfileTab')}
      />
      <Text style={styles.title}>Activity</Text>
      <Text style={styles.subtitle}>
        {activeCount > 0
          ? `${activeCount} session in progress. It ends when that bay’s IR sensor opens.`
          : 'Visits start when you cover the IR sensor at a bay, and end when you uncover it.'}
      </Text>
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
          ItemSeparatorComponent={HistoryDivider}
          removeClippedSubviews
          initialNumToRender={8}
          windowSize={7}
          ListEmptyComponent={
            error ? (
              <EmptyState
                icon="cloud-offline-outline"
                title="Couldn’t load activity"
                subtitle={error}
              />
            ) : (
              <EmptyState
                icon="time-outline"
                title="No sessions yet"
                subtitle="Open Home, stand at a green pin, and cover the IR sensor."
                actionLabel="Find a space"
                onAction={() => tabNavigation.navigate('MapTab')}
              />
            )
          }
          renderItem={({ item }) => {
            const active = !item.exitTime;
            return (
              <View style={styles.item}>
                <View style={styles.itemHeader}>
                  <Text style={styles.body}>
                    {item.slotNumber} · {item.locationName}
                  </Text>
                  <StatusBadge
                    label={active ? 'In progress' : 'Completed'}
                    tone={active ? 'available' : 'neutral'}
                  />
                </View>
                <Text style={styles.time}>Arrived {formatTime(item.entryTime)}</Text>
                <Text style={styles.time}>
                  {item.exitTime ? `Left ${formatTime(item.exitTime)}` : 'Still parked'}
                </Text>
                <Text style={styles.duration}>
                  {item.exitTime
                    ? formatDuration(item.entryTime, item.exitTime)
                    : 'Duration updates when the bay opens'}
                </Text>
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
}

function formatTime(value: number): string {
  return new Date(value).toLocaleString();
}

function formatDuration(start: number, end: number): string {
  const minutes = Math.max(1, Math.round((end - start) / 60000));
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function HistoryDivider() {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />;
}
