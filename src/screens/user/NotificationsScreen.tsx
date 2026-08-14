import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '../../components/EmptyState';
import { GlassCard } from '../../components/GlassCard';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { radius } from '../../config/theme';
import { useNotifications } from '../../hooks/useNotifications';
import type { UserStackParamList } from '../../navigation/types';
import { markNotificationRead } from '../../services/notificationService';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';
import type { AppNotification } from '../../types';

export function NotificationsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<UserStackParamList>>();
  const profile = useAuthStore((state) => state.profile);
  const { items, unreadCount } = useNotifications(profile?.userId);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        flex: { flex: 1 },
        summary: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
          padding: 14,
          borderRadius: radius.lg,
          backgroundColor: colors.cardSolid,
          borderWidth: 1,
          borderColor: colors.glassBorder,
        },
        summaryIcon: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        },
        summaryCopy: { flex: 1, minWidth: 0 },
        summaryTitle: {
          fontSize: 16,
          fontWeight: '800',
          color: colors.text,
          letterSpacing: -0.2,
        },
        summaryText: {
          marginTop: 4,
          fontSize: 13,
          lineHeight: 18,
          color: colors.textMuted,
          fontWeight: '600',
        },
        list: {
          flexGrow: 1,
          gap: 10,
          paddingBottom: 28,
        },
        card: {
          padding: 0,
          overflow: 'hidden',
        },
        row: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
          padding: 14,
        },
        rowUnread: {
          backgroundColor: colors.primaryMuted,
        },
        iconWrap: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        },
        iconWrapRead: {
          backgroundColor: colors.primaryMuted,
        },
        copy: { flex: 1, minWidth: 0 },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 6,
        },
        body: {
          fontSize: 15,
          fontWeight: '600',
          color: colors.text,
          lineHeight: 21,
        },
        bodyRead: {
          color: colors.textMuted,
          fontWeight: '500',
        },
        time: {
          marginTop: 8,
          fontSize: 12,
          fontWeight: '600',
          color: colors.textMuted,
        },
        chevron: { marginTop: 10 },
      }),
    [colors],
  );

  async function openAlert(item: AppNotification) {
    if (!profile?.userId) {
      return;
    }
    if (!item.isRead) {
      await markNotificationRead(profile.userId, item.notificationId);
    }
    navigation.navigate('UserTabs', { screen: 'MapTab' });
  }

  return (
    <Screen edges={[]} style={styles.flex}>
      <View style={styles.summary}>
        <View style={styles.summaryIcon}>
          <Ionicons name="notifications-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryTitle}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </Text>
          <Text style={styles.summaryText}>
            {unreadCount > 0
              ? 'Tap an alert to mark it read and jump to the map.'
              : 'Watch a taken pin on Home to get availability alerts here.'}
          </Text>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.notificationId}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            title="No alerts yet"
            subtitle="On Home, tap a red pin and choose Watch lot. We’ll notify you when a space opens."
            actionLabel="Open Home"
            onAction={() =>
              navigation.navigate('UserTabs', {
                screen: 'MapTab',
              })
            }
          />
        }
        renderItem={({ item }) => (
          <GlassCard style={styles.card}>
            <Pressable
              onPress={() => void openAlert(item)}
              accessibilityRole="button"
              accessibilityLabel={item.isRead ? 'Read alert' : 'Unread alert'}
              style={[styles.row, !item.isRead && styles.rowUnread]}
            >
              <View style={[styles.iconWrap, item.isRead && styles.iconWrapRead]}>
                <Ionicons
                  name={item.isRead ? 'checkmark-circle-outline' : 'sparkles-outline'}
                  size={20}
                  color={item.isRead ? colors.textMuted : colors.primary}
                />
              </View>
              <View style={styles.copy}>
                <View style={styles.headerRow}>
                  <StatusBadge
                    label={item.isRead ? 'Read' : 'New'}
                    tone={item.isRead ? 'neutral' : 'available'}
                  />
                </View>
                <Text style={[styles.body, item.isRead && styles.bodyRead]}>{item.message}</Text>
                <Text style={styles.time}>{formatAlertTime(item.createdTime)}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
                style={styles.chevron}
              />
            </Pressable>
          </GlassCard>
        )}
      />
    </Screen>
  );
}

function formatAlertTime(value: number): string {
  const date = new Date(value);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return `Today · ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
