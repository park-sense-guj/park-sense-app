import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '../../components/EmptyState';
import { GlassCard } from '../../components/GlassCard';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { useNotifications } from '../../hooks/useNotifications';
import type { AdminStackParamList, UserStackParamList } from '../../navigation/types';
import {
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notificationService';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';
import type { AppNotification } from '../../types';

type StackNav = NativeStackNavigationProp<UserStackParamList & AdminStackParamList>;

export function NotificationsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNav>();
  const profile = useAuthStore((state) => state.profile);
  const isAdmin = profile?.role === 'admin';
  const { items, unreadCount } = useNotifications(profile?.userId);
  const [markingAll, setMarkingAll] = useState(false);
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
        actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
        mapLink: {
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
        iconWrapWarning: {
          backgroundColor: colors.warningSoft,
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

  function returnToHome() {
    if (isAdmin) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'AdminTabs',
              params: { screen: 'DashboardTab' },
            },
          ],
        }),
      );
      return;
    }
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

  function openSensors() {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'AdminTabs',
            params: { screen: 'SensorsTab' },
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
    if (isAdmin && isSensorAlert(item.message)) {
      openSensors();
    }
  }

  async function onMarkAllRead() {
    if (!profile?.userId || unreadCount === 0 || markingAll) {
      return;
    }
    setMarkingAll(true);
    try {
      await markAllNotificationsRead(profile.userId, items);
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <Screen edges={['bottom']} style={styles.flex}>
      <View style={styles.headerPad}>
        <Text style={styles.title}>Alerts</Text>
        <Text style={styles.subtitle}>
          {isAdmin
            ? unreadCount > 0
              ? `${unreadCount} unread · sensor health and lot updates`
              : 'Sensor offline and restore notices land here'
            : unreadCount > 0
              ? `${unreadCount} unread · tap an alert to mark it read`
              : 'Lot availability and parking updates land here'}
        </Text>

        <GlassCard style={styles.summary}>
          <View style={styles.summaryIcon}>
            <Ionicons
              name={isAdmin ? 'hardware-chip-outline' : 'notifications-outline'}
              size={22}
              color={colors.primary}
            />
          </View>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </Text>
            <Text style={styles.summaryText}>
              {isAdmin
                ? unreadCount > 0
                  ? 'Tap a sensor alert to open Sensors. Mark all read when you’re done.'
                  : 'Mark a sensor faulty on Sensors to test admin alerts.'
                : unreadCount > 0
                  ? 'Use Back or Open Home when you’re done.'
                  : 'Watch a taken pin on Home to get availability alerts here.'}
            </Text>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  isAdmin ? 'Open Dashboard' : 'Open Home'
                }
                onPress={returnToHome}
                style={styles.mapLink}
              >
                <Text style={styles.mapLinkText}>
                  {isAdmin ? 'Open Dashboard' : 'Open Home'}
                </Text>
              </Pressable>
              {isAdmin ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open Sensors"
                  onPress={openSensors}
                  style={styles.mapLink}
                >
                  <Text style={styles.mapLinkText}>Open Sensors</Text>
                </Pressable>
              ) : null}
              {unreadCount > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Mark all alerts as read"
                  disabled={markingAll}
                  onPress={() => void onMarkAllRead()}
                  style={styles.mapLink}
                >
                  <Text style={styles.mapLinkText}>
                    {markingAll ? 'Marking…' : 'Mark all read'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
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
            icon={isAdmin ? 'hardware-chip-outline' : 'notifications-outline'}
            title="No alerts yet"
            subtitle={
              isAdmin
                ? 'Mark a sensor faulty on the Sensors tab to create an admin alert.'
                : 'On Home, tap a red pin and choose Watch lot. We’ll notify you when a space opens.'
            }
            actionLabel={isAdmin ? 'Open Sensors' : 'Open Home'}
            onAction={isAdmin ? openSensors : returnToHome}
          />
        }
        renderItem={({ item }) => {
          const sensorAlert = isSensorAlert(item.message);
          return (
            <GlassCard style={styles.card}>
              <Pressable
                onPress={() => void onAlertPress(item)}
                accessibilityRole="button"
                accessibilityLabel={
                  item.isRead
                    ? sensorAlert && isAdmin
                      ? 'Open Sensors'
                      : 'Read alert'
                    : 'Mark alert as read'
                }
                style={[styles.row, !item.isRead && styles.rowUnread]}
              >
                <View
                  style={[
                    styles.iconWrap,
                    item.isRead && styles.iconWrapRead,
                    sensorAlert && !item.isRead && styles.iconWrapWarning,
                  ]}
                >
                  <Ionicons
                    name={
                      item.isRead
                        ? 'checkmark-circle-outline'
                        : sensorAlert
                          ? 'warning-outline'
                          : 'sparkles-outline'
                    }
                    size={20}
                    color={
                      item.isRead
                        ? colors.textMuted
                        : sensorAlert
                          ? colors.warning
                          : colors.primary
                    }
                  />
                </View>
                <View style={styles.copy}>
                  <View style={styles.headerRow}>
                    <StatusBadge
                      label={item.isRead ? 'Read' : sensorAlert ? 'Sensor' : 'New'}
                      tone={item.isRead ? 'neutral' : sensorAlert ? 'warning' : 'available'}
                    />
                  </View>
                  <Text style={[styles.body, item.isRead && styles.bodyRead]}>{item.message}</Text>
                  <Text style={styles.time}>{formatAlertTime(item.createdTime)}</Text>
                </View>
              </Pressable>
            </GlassCard>
          );
        }}
      />
    </Screen>
  );
}

function isSensorAlert(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('sensor offline') || lower.includes('sensor restored');
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
