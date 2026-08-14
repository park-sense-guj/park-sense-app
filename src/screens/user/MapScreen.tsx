import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { initialsFromName } from '../../components/Avatar';
import { BrandHeader } from '../../components/BrandHeader';
import { Button } from '../../components/Button';
import { ParkingMarker } from '../../components/ParkingMarker';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { darkMapStyle, lightMapStyle } from '../../config/mapStyles';
import { radius } from '../../config/theme';
import { DEMO_LOT } from '../../data/demoLot';
import { useNotifications } from '../../hooks/useNotifications';
import { useParkingHistory } from '../../hooks/useParkingHistory';
import { useParkingSlots } from '../../hooks/useParkingSlots';
import type { UserStackParamList, UserTabParamList } from '../../navigation/types';
import { endParkingSession, findActiveSession } from '../../services/historyService';
import { playErrorFeedback, playSuccessFeedback } from '../../services/feedbackService';
import { readableNetworkError } from '../../services/networkService';
import { readableWatchError, stopWatchingLot, watchLot } from '../../services/watchService';
import { useAuthStore } from '../../store/authStore';
import { useConnectivityStore } from '../../store/connectivityStore';
import { useTheme } from '../../theme/ThemeProvider';
import type { ParkingSlot } from '../../types';

type TabNav = {
  navigate: (screen: keyof UserTabParamList) => void;
};

export function MapScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<UserStackParamList>>();
  const tabNavigation = useNavigation() as unknown as TabNav;
  const insets = useSafeAreaInsets();
  const isOnline = useConnectivityStore((state) => state.isOnline);
  const fullName = useAuthStore((state) => state.profile?.fullName);
  const photoUrl = useAuthStore((state) => state.profile?.photoUrl);
  const userId = useAuthStore((state) => state.profile?.userId);
  const preferredLocation = useAuthStore((state) => state.profile?.preferredLocation);
  const { unreadCount } = useNotifications(userId);
  const { slots, onlineSlots, stats, loading, error } = useParkingSlots();
  const { items: historyItems } = useParkingHistory(userId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const initials = initialsFromName(fullName);
  const lotName = slots[0]?.locationName ?? 'No lot yet';
  const firstLat = onlineSlots[0]?.latitude ?? slots[0]?.latitude;
  const firstLng = onlineSlots[0]?.longitude ?? slots[0]?.longitude;
  const selected = useMemo(
    () => onlineSlots.find((slot) => slot.slotId === selectedId) ?? null,
    [onlineSlots, selectedId],
  );
  const mySessionOnSelected = selected
    ? findActiveSession(historyItems, selected.slotId)
    : undefined;
  const watchingThisLot = Boolean(
    selected && preferredLocation && preferredLocation === selected.locationName,
  );
  const offlineCount = stats.offlineSensors;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        top: { paddingHorizontal: 20, paddingBottom: 10 },
        greeting: { fontSize: 15, color: colors.textMuted },
        name: {
          fontSize: 26,
          fontWeight: '800',
          color: colors.text,
          letterSpacing: -0.6,
          marginTop: 2,
        },
        mapWrap: {
          flex: 1,
          minHeight: 320,
          marginHorizontal: 12,
          marginBottom: 16,
          borderRadius: radius.xl,
        },
        mapCard: {
          flex: 1,
          borderRadius: radius.xl,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.mapSurface,
        },
        chip: {
          position: 'absolute',
          top: 12,
          left: 12,
          right: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          backgroundColor: colors.chip,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.glassBorder,
          paddingVertical: 10,
          paddingHorizontal: 12,
        },
        lot: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
        chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' },
        mapBanner: {
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 96,
          backgroundColor: colors.chip,
          borderRadius: 14,
          padding: 12,
        },
        mapBannerTitle: { fontWeight: '700', color: colors.text, textAlign: 'center' },
        mapBannerText: {
          marginTop: 4,
          textAlign: 'center',
          color: colors.textMuted,
          lineHeight: 18,
        },
        sheet: {
          position: 'absolute',
          left: 14,
          right: 14,
          backgroundColor: colors.cardSolid,
          borderRadius: 24,
          paddingTop: 10,
          paddingHorizontal: 14,
          paddingBottom: 14,
          borderWidth: 1,
          borderColor: colors.glassBorder,
          shadowColor: '#0F172A',
          shadowOpacity: 0.14,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        },
        handle: {
          alignSelf: 'center',
          width: 36,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.borderStrong,
          marginBottom: 12,
        },
        sheetTop: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
        },
        statusOrb: {
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: 'center',
          justifyContent: 'center',
        },
        sheetCopy: { flex: 1, minWidth: 0, gap: 6 },
        titleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        },
        sheetTitle: {
          fontSize: 20,
          fontWeight: '800',
          color: colors.text,
          letterSpacing: -0.4,
          flexShrink: 1,
        },
        sheetSub: {
          fontSize: 13,
          fontWeight: '600',
          color: colors.textMuted,
        },
        closeBtn: {
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: colors.primaryMuted,
          alignItems: 'center',
          justifyContent: 'center',
        },
        sheetHint: {
          marginTop: 12,
          marginBottom: 2,
          color: colors.textMuted,
          fontSize: 13,
          lineHeight: 19,
          fontWeight: '500',
        },
        actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
        actionBtn: { flex: 1, minHeight: 46 },
      }),
    [colors],
  );

  const region = useMemo(
    () => ({
      latitude: firstLat ?? DEMO_LOT.center.latitude,
      longitude: firstLng ?? DEMO_LOT.center.longitude,
      latitudeDelta: DEMO_LOT.latitudeDelta,
      longitudeDelta: DEMO_LOT.longitudeDelta,
    }),
    [firstLat, firstLng],
  );

  const selectGuardUntil = useRef(0);

  const selectSlot = useCallback((slot: ParkingSlot) => {
    // Ignore the map’s follow-up press so we don’t clear / swap the selection.
    selectGuardUntil.current = Date.now() + 450;
    setSelectedId(slot.slotId);
  }, []);

  const dismissSelection = useCallback(() => {
    if (Date.now() < selectGuardUntil.current) {
      return;
    }
    setSelectedId(null);
  }, []);

  async function onWatchLot(slot: ParkingSlot) {
    if (!userId) {
      return;
    }
    if (!isOnline) {
      playErrorFeedback();
      Alert.alert('You’re offline', 'Reconnect to watch this lot for free-space alerts.');
      return;
    }
    if (preferredLocation === slot.locationName) {
      Alert.alert(
        'Already watching',
        `You’re already watching ${slot.locationName}. You’ll get an alert when any space opens there.`,
      );
      return;
    }
    setWatching(true);
    try {
      await watchLot(userId, slot.locationName, slot.slotId);
      playSuccessFeedback();
      Alert.alert(
        'Watching this lot',
        `You’ll get an alert when a space opens at ${slot.locationName}. This applies to every pin in that lot.`,
        [
          { text: 'View alerts', onPress: () => navigation.navigate('Alerts') },
          { text: 'OK', style: 'cancel' },
        ],
      );
    } catch (error) {
      playErrorFeedback();
      Alert.alert('Could not save alert', readableWatchError(error));
    } finally {
      setWatching(false);
    }
  }

  async function onStopWatching(slot: ParkingSlot) {
    if (!userId) {
      return;
    }
    if (!isOnline) {
      playErrorFeedback();
      Alert.alert('You’re offline', 'Reconnect to stop watching this lot.');
      return;
    }
    setWatching(true);
    try {
      await stopWatchingLot(userId, slot.locationName);
      playSuccessFeedback();
      Alert.alert('Stopped watching', `You won’t get alerts for ${slot.locationName} anymore.`);
    } catch (error) {
      playErrorFeedback();
      Alert.alert('Could not stop watching', readableWatchError(error));
    } finally {
      setWatching(false);
    }
  }

  function onLeaveSelected() {
    if (!userId || !mySessionOnSelected) {
      return;
    }
    if (!isOnline) {
      playErrorFeedback();
      Alert.alert('You’re offline', 'Reconnect to free this space on the live map.');
      return;
    }
    Alert.alert('Leave this slot?', 'This frees the pin and ends your session in Activity.', [
      { text: 'Stay parked', style: 'cancel' },
      {
        text: 'Leave slot',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setLeaving(true);
            try {
              await endParkingSession(userId, mySessionOnSelected.historyId);
              setSelectedId(null);
              playSuccessFeedback();
              Alert.alert('You’re free to go', 'The space is open again on the map.');
            } catch (error) {
              playErrorFeedback();
              Alert.alert(
                'Could not leave',
                readableNetworkError(error, 'Try again when your connection is stable.'),
              );
            } finally {
              setLeaving(false);
            }
          })();
        },
      },
    ]);
  }

  const sheet = selected
    ? (() => {
        if (mySessionOnSelected) {
          return {
            hint: isOnline
              ? 'This is your active parking session. Leave when you go so the pin turns green again.'
              : 'You’re offline. Reconnect to leave this slot on the live map.',
            primaryTitle: 'Leave slot',
            primaryVariant: 'danger' as const,
            primaryLoading: leaving,
            primaryDisabled: !isOnline,
            onPrimary: onLeaveSelected,
            secondaryTitle: 'Open session',
            onSecondary: () => navigation.navigate('Navigate', { slot: selected }),
          };
        }
        if (selected.status === 'Available') {
          return {
            hint: 'This space is free. Go there, then tap I’m parked when you arrive.',
            primaryTitle: 'Go there',
            primaryVariant: 'primary' as const,
            primaryLoading: false,
            primaryDisabled: false,
            onPrimary: () => navigation.navigate('Navigate', { slot: selected }),
            secondaryTitle: 'Close',
            onSecondary: () => setSelectedId(null),
          };
        }
        return {
          hint: !isOnline
            ? 'You’re offline. Reconnect to watch this lot for free-space alerts.'
            : watchingThisLot
              ? `You’re watching ${selected.locationName}. Alerts cover every pin in this lot, not just ${selected.slotNumber}.`
              : 'This space is taken. Watch the whole lot to get an alert when any space opens.',
          primaryTitle: watchingThisLot ? 'Stop watching' : 'Watch lot',
          primaryVariant: watchingThisLot ? ('danger' as const) : ('primary' as const),
          primaryLoading: watching,
          primaryDisabled: !isOnline,
          onPrimary: () =>
            void (watchingThisLot ? onStopWatching(selected) : onWatchLot(selected)),
          secondaryTitle: 'Close',
          onSecondary: () => setSelectedId(null),
        };
      })()
    : null;

  return (
    <Screen padded={false} overlayTabBar>
      <View style={styles.top}>
        <BrandHeader
          initials={initials}
          compact
          photoUrl={photoUrl}
          alertsBadge={unreadCount}
          onAlertsPress={() => navigation.navigate('Alerts')}
          onProfilePress={() => tabNavigation.navigate('ProfileTab')}
        />
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.name}>{fullName ?? 'Driver'}</Text>
      </View>

      <View style={styles.mapWrap}>
        <View style={styles.mapCard} collapsable={false}>
          <MapView
            style={StyleSheet.absoluteFill}
            provider={PROVIDER_DEFAULT}
            initialRegion={region}
            showsUserLocation
            userInterfaceStyle={isDark ? 'dark' : 'light'}
            customMapStyle={isDark ? darkMapStyle : lightMapStyle}
            mapPadding={{ top: 64, right: 8, bottom: 96, left: 8 }}
            accessibilityLabel="Parking map"
            moveOnMarkerPress={false}
            rotateEnabled={false}
            pitchEnabled={false}
            onPress={dismissSelection}
            onPoiClick={dismissSelection}
          >
            {onlineSlots.map((slot) => {
              const mine = Boolean(findActiveSession(historyItems, slot.slotId));
              return (
                <ParkingMarker
                  key={slot.slotId}
                  slot={slot}
                  selected={selectedId === slot.slotId}
                  isMine={mine}
                  onPress={() => selectSlot(slot)}
                />
              );
            })}
          </MapView>

          <View style={styles.chip} pointerEvents="box-none">
            <Text style={styles.lot} numberOfLines={1}>
              {lotName}
            </Text>
            <View style={styles.chipRow}>
              <StatusBadge
                label={loading ? 'Updating…' : `${stats.onlineAvailable} open`}
                tone="available"
              />
              <StatusBadge label={`${stats.onlineOccupied} taken`} tone="occupied" />
              {offlineCount > 0 ? (
                <StatusBadge label={`${offlineCount} offline`} tone="warning" />
              ) : null}
            </View>
          </View>

          {!loading && error ? (
            <View style={styles.mapBanner}>
              <Text style={styles.mapBannerTitle}>Couldn’t load live slots</Text>
              <Text style={styles.mapBannerText}>
                Check your connection, then reopen Home. If this continues, publish the latest
                Firebase database rules.
              </Text>
            </View>
          ) : null}

          {!loading && !error && onlineSlots.length === 0 && slots.length > 0 ? (
            <View style={styles.mapBanner}>
              <Text style={styles.mapBannerTitle}>All sensors offline</Text>
              <Text style={styles.mapBannerText}>
                Parking pins are hidden until an admin marks sensors healthy again.
              </Text>
            </View>
          ) : null}

          {!loading && !error && slots.length === 0 ? (
            <View style={styles.mapBanner}>
              <Text style={styles.mapBannerTitle}>No slots on the map yet</Text>
              <Text style={styles.mapBannerText}>Ask an admin to seed the demo lot.</Text>
            </View>
          ) : null}
        </View>
      </View>

      {selected && sheet ? (
        <View style={[styles.sheet, { bottom: Math.max(insets.bottom, 12) + 78 }]}>
          <View style={styles.handle} />
          <View style={styles.sheetTop}>
            <View
              style={[
                styles.statusOrb,
                {
                  backgroundColor: mySessionOnSelected
                    ? colors.primarySoft
                    : selected.status === 'Available'
                      ? colors.availableSoft
                      : colors.occupiedSoft,
                },
              ]}
            >
              <Ionicons
                name={
                  mySessionOnSelected
                    ? 'navigate'
                    : selected.status === 'Available'
                      ? 'car-outline'
                      : 'car'
                }
                size={22}
                color={
                  mySessionOnSelected
                    ? colors.primary
                    : selected.status === 'Available'
                      ? colors.available
                      : colors.occupied
                }
              />
            </View>
            <View style={styles.sheetCopy}>
              <View style={styles.titleRow}>
                <Text style={styles.sheetTitle}>{selected.slotNumber}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  onPress={() => setSelectedId(null)}
                  style={styles.closeBtn}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={16} color={colors.textMuted} />
                </Pressable>
              </View>
              <Text style={styles.sheetSub} numberOfLines={1}>
                {selected.locationName}
              </Text>
              <StatusBadge
                label={
                  mySessionOnSelected
                    ? 'Your spot'
                    : selected.status === 'Available'
                      ? 'Open'
                      : 'Taken'
                }
                tone={
                  mySessionOnSelected || selected.status === 'Available' ? 'available' : 'occupied'
                }
              />
            </View>
          </View>
          <Text style={styles.sheetHint}>{sheet.hint}</Text>
          <View style={styles.actions}>
            <Button
              title={sheet.primaryTitle}
              variant={sheet.primaryVariant}
              loading={sheet.primaryLoading}
              disabled={sheet.primaryDisabled}
              onPress={sheet.onPrimary}
              style={styles.actionBtn}
            />
            {sheet.secondaryTitle !== 'Close' ? (
              <Button
                title={sheet.secondaryTitle}
                variant="secondary"
                onPress={sheet.onSecondary}
                style={styles.actionBtn}
              />
            ) : null}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
