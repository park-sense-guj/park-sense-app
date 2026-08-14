import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '../../components/EmptyState';
import { GlassCard } from '../../components/GlassCard';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { useNotifications } from '../../hooks/useNotifications';
import type { UserStackParamList } from '../../navigation/types';
import { markNotificationRead } from '../../services/notificationService';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';
import type { AppNotification } from '../../types';

export function NotificationsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<UserStackParamList>>();
  const profile = useAuthStore((state) => state.profile);
  const { items, unreadCount } = useNotifications(profile?.userId);
  // Transparent stack header: leave room for the back control.
  const headerOffset = insets.top + 44;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        flex: { flex: 1 },
        headerPad: { paddingTop: headerOffset },
        title: {
          fontSize: 32,
          fontWeight: '800',
          color: colors.text,
          letterSpacing: -0.6,
        },
        subtitle: {
          marginTop: 6,
          marginBottom: 16,
          color: colors.textMuted,
          lineHeight: 20,
        },
        summary: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          marginBottom: 14,
          paddingVertical: 14,
          paddingHorizontal: 14,
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
        mapLink: {
          marginTop: 10,
          alignSelf: 'flex-start',
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 12,
          backgroundColor: colors.primarySoft,
        },
        mapLinkText: { color: colors.primaryDark, fontWeight: '800', fontSize: 13 },
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
      }),
    [colors, headerOffset],
  );

  /** Return to the existing Home tab — never push another Home on the stack. */
  function returnToHome() {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'UserTabs',
            params: { screen: 'MapTab' },
          },
        ],
      }),
    );
  }

  async function onAlertPress(item: AppNotification) {
    if (!profile?.userId) {
      return;
    }
    if (!item.isRead) {
      await markNotificationRead(profile.userId, item.notificationId);
    }
  }

  return (
    <Screen edges={['bottom']} style={styles.flex}>
      <View style={styles.headerPad}>
        <Text style={styles.title}>Alerts</Text>
        <Text style={styles.subtitle}>
          {unreadCount > 0
            ? `${unreadCount} unread · tap an alert to mark it read`
            : 'Lot availability and parking updates land here'}
        </Text>

        <GlassCard style={styles.summary}>
          <View style={styles.summaryIcon}>
            <Ionicons name="notifications-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </Text>
            <Text style={styles.summaryText}>
              {unreadCount > 0
                ? 'Use Back or Open Home when you’re done.'
                : 'Watch a taken pin on Home to get availability alerts here.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Home"
              onPress={returnToHome}
              style={styles.mapLink}
            >
              <Text style={styles.mapLinkText}>Open Home</Text>
            </Pressable>
          </View>
        </GlassCard>
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
            onAction={returnToHome}
          />
        }
        renderItem={({ item }) => (
          <GlassCard style={styles.card}>
            <Pressable
              onPress={() => void onAlertPress(item)}
              accessibilityRole="button"
              accessibilityLabel={item.isRead ? 'Read alert' : 'Mark alert as read'}
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
