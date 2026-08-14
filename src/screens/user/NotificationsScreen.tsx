import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { initialsFromName } from '../../components/Avatar';
import { BrandHeader } from '../../components/BrandHeader';
import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';
import { colors } from '../../config/theme';
import { useNotifications } from '../../hooks/useNotifications';
import { markNotificationRead } from '../../services/notificationService';
import { useAuthStore } from '../../store/authStore';

export function NotificationsScreen() {
  const profile = useAuthStore((state) => state.profile);
  const { items, unreadCount } = useNotifications(profile?.userId);
  const initials = initialsFromName(profile?.fullName);

  return (
    <Screen>
      <BrandHeader initials={initials} photoUrl={profile?.photoUrl} />
      <Text style={styles.title}>Alerts</Text>
      <Text style={styles.subtitle}>
        {unreadCount > 0
          ? `${unreadCount} unread. Tap an alert to mark it as read.`
          : 'Watch a lot on Home to get availability alerts.'}
      </Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.notificationId}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            title="No alerts"
            subtitle="Open an occupied pin on the map and tap Notify me."
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => void markNotificationRead(item.notificationId)}
            accessibilityRole="button"
            accessibilityLabel={item.isRead ? 'Read alert' : 'Unread alert'}
            style={styles.item}
          >
            <Text style={styles.kicker}>{item.isRead ? 'READ' : 'NEW'}</Text>
            <Text style={styles.body}>{item.message}</Text>
            <Text style={styles.time}>{new Date(item.createdTime).toLocaleString()}</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 32, fontWeight: '800', color: colors.text, letterSpacing: -0.6 },
  subtitle: { marginTop: 6, marginBottom: 18, color: colors.textMuted, lineHeight: 20 },
  list: { paddingBottom: 12 },
  item: { paddingVertical: 14, minHeight: 56 },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: colors.primary },
  body: { marginTop: 6, fontSize: 16, fontWeight: '600', color: colors.text, lineHeight: 22 },
  time: { marginTop: 6, color: colors.textMuted, fontSize: 13 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
