import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
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
import { findActiveSession } from '../../services/historyService';
import { playErrorFeedback, playSuccessFeedback } from '../../services/feedbackService';
import { bayKind, holdBay, releaseHold } from '../../services/parkingHoldService';
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
  const { slots, stats, loading, error, now, isSensorFaulty } = useParkingSlots();
  const { items: historyItems } = useParkingHistory(userId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const [holding, setHolding] = useState(false);
  const [releasingHold, setReleasingHold] = useState(false);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const initials = initialsFromName(fullName);
  const lotName = slots[0]?.locationName ?? 'No lot yet';
  const firstLat = slots[0]?.latitude;
  const firstLng = slots[0]?.longitude;
  const selected = useMemo(
    () => slots.find((slot) => slot.slotId === selectedId) ?? null,
    [slots, selectedId],
  );
  const mySessionOnSelected = selected
    ? findActiveSession(historyItems, selected.slotId)
    : undefined;
  const watchingThisLot = Boolean(
    selected && preferredLocation && preferredLocation === selected.locationName,
  );
  const selectedKind = selected
    ? bayKind(selected, {
        userId,
        offline: isSensorFaulty(selected.slotId),
        sessionOnSlot: Boolean(mySessionOnSelected),
      }, now)
    : 'open';
  const offlineCount = stats.offlineSensors;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        top: {
          paddingHorizontal: 20,
          paddingTop: insets.top + 8,
          paddingBottom: 10,
          backgroundColor: colors.background,
        },
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
          marginHorizontal: Platform.OS === 'android' ? 0 : 12,
          marginBottom: Platform.OS === 'android' ? 0 : 16,
        },
        mapCard: {
          flex: 1,
          borderRadius: Platform.OS === 'android' ? 0 : radius.xl,
          overflow: Platform.OS === 'android' ? 'visible' : 'hidden',
          borderWidth: Platform.OS === 'android' ? 0 : 1,
          borderColor: colors.border,
          // Opaque fill covers Android's SurfaceView map (logo still shows).
          backgroundColor: Platform.OS === 'android' ? 'transparent' : colors.mapSurface,
        },
        mapCanvas: {
          ...StyleSheet.absoluteFill,
          width: '100%',
          height: '100%',
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
    [colors, insets.top],
  );

  const mapRef = useRef<MapView | null>(null);
  const lastRegionKey = useRef('');

  const region = useMemo(
    () => ({
      latitude: firstLat ?? DEMO_LOT.center.latitude,
      longitude: firstLng ?? DEMO_LOT.center.longitude,
      latitudeDelta: DEMO_LOT.latitudeDelta,
      longitudeDelta: DEMO_LOT.longitudeDelta,
    }),
    [firstLat, firstLng],
  );

  useEffect(() => {
    if (firstLat == null || firstLng == null) {
      return;
    }
    const key = `${firstLat.toFixed(5)},${firstLng.toFixed(5)}`;
    if (key === lastRegionKey.current) {
      return;
    }
    lastRegionKey.current = key;
    mapRef.current?.animateToRegion(region, 700);
  }, [firstLat, firstLng, region]);

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

  async function onGoThere(slot: ParkingSlot) {
    if (!userId || !fullName) {
      return;
    }
    if (!isOnline) {
      playErrorFeedback();
      Alert.alert('You’re offline', 'Reconnect to hold this bay and start navigation.');
      return;
    }
    setHolding(true);
    try {
      await holdBay(userId, fullName, slot.slotId);
      playSuccessFeedback();
      navigation.navigate('Navigate', { slot });
    } catch (error) {
      playErrorFeedback();
      Alert.alert('Could not hold this bay', readableNetworkError(error, 'Pick another open pin.'));
    } finally {
      setHolding(false);
    }
  }

  async function onReleaseHold(slot: ParkingSlot) {
    if (!userId) {
      return;
    }
    if (!isOnline) {
      playErrorFeedback();
      Alert.alert('You’re offline', 'Reconnect to end this hold.');
      return;
    }

    Alert.alert(
      'End this hold?',
      `This will release ${slot.slotNumber} so other drivers can take it.`,
      [
        { text: 'Keep hold', style: 'cancel' },
        {
          text: 'End hold',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setReleasingHold(true);
              try {
                await releaseHold(userId, slot.slotId);
                playSuccessFeedback();
                setSelectedId(null);
                Alert.alert('Hold ended', `${slot.slotNumber} is no longer reserved for you.`);
              } catch (error) {
                playErrorFeedback();
                Alert.alert(
                  'Could not end hold',
                  readableNetworkError(error, 'Try again in a moment.'),
                );
              } finally {
                setReleasingHold(false);
              }
            })();
          },
        },
      ],
    );
  }

  const sheet = selected
    ? (() => {
        if (selectedKind === 'mine') {
          return {
            hint: 'You’re parked here. The session ends by itself when the IR sensor opens.',
            primaryTitle: 'Open session',
            primaryVariant: 'primary' as const,
            primaryLoading: false,
            primaryDisabled: false,
            onPrimary: () => navigation.navigate('Navigate', { slot: selected }),
            secondaryTitle: 'Close',
            onSecondary: () => setSelectedId(null),
          };
        }
        if (selectedKind === 'heldMine') {
          return {
            hint:
              selected.holdCheckIn === 'admitted'
                ? 'You’re checked in. Cover the IR sensor when you park to start your session.'
                : 'This bay is held for you. Scan the QR on the stall, then cover the IR sensor when you park.',
            primaryTitle: selected.holdCheckIn === 'admitted' ? 'Open navigation' : 'Scan bay QR',
            primaryVariant: 'primary' as const,
            primaryLoading: false,
            primaryDisabled: releasingHold,
            onPrimary: () =>
              navigation.navigate(selected.holdCheckIn === 'admitted' ? 'Navigate' : 'ScanBay', {
                slot: selected,
              }),
            secondaryTitle: 'End hold',
            secondaryVariant: 'danger' as const,
            secondaryLoading: releasingHold,
            secondaryDisabled: !isOnline,
            onSecondary: () => void onReleaseHold(selected),
          };
        }
        if (selectedKind === 'open') {
          return {
            hint: 'This space is free. Go there to hold it, then scan the bay QR and cover the IR sensor.',
            primaryTitle: 'Go there',
            primaryVariant: 'primary' as const,
            primaryLoading: holding,
            primaryDisabled: !isOnline || holding,
            onPrimary: () => void onGoThere(selected),
            secondaryTitle: 'Close',
            onSecondary: () => setSelectedId(null),
          };
        }
        if (selectedKind === 'offline') {
          return {
            hint: 'This sensor is not reaching Firebase. Pins stay on the map; pick another bay if you need to park now.',
            primaryTitle: watchingThisLot ? 'Stop watching' : 'Watch lot',
            primaryVariant: watchingThisLot ? ('danger' as const) : ('primary' as const),
            primaryLoading: watching,
            primaryDisabled: !isOnline,
            onPrimary: () =>
              void (watchingThisLot ? onStopWatching(selected) : onWatchLot(selected)),
            secondaryTitle: 'Close',
            onSecondary: () => setSelectedId(null),
          };
        }
        if (selectedKind === 'held') {
          return {
            hint: `${selected.heldByName || 'Another driver'} is heading here. Watch the lot for a free space.`,
            primaryTitle: watchingThisLot ? 'Stop watching' : 'Watch lot',
            primaryVariant: watchingThisLot ? ('danger' as const) : ('primary' as const),
            primaryLoading: watching,
            primaryDisabled: !isOnline,
            onPrimary: () =>
              void (watchingThisLot ? onStopWatching(selected) : onWatchLot(selected)),
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
    <Screen padded={false} overlayTabBar blobs={false} mapSafe>
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
            ref={mapRef}
            style={styles.mapCanvas}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
            initialRegion={region}
            loadingEnabled
            loadingIndicatorColor={colors.primary}
            loadingBackgroundColor={colors.mapSurface}
            showsUserLocation
            userInterfaceStyle={isDark ? 'dark' : 'light'}
            customMapStyle={isDark ? darkMapStyle : lightMapStyle}
            mapPadding={{ top: 64, right: 8, bottom: 96, left: 8 }}
            accessibilityLabel="Parking map"
            moveOnMarkerPress={false}
            rotateEnabled={false}
            pitchEnabled={false}
            onMapReady={() => {
              mapRef.current?.animateToRegion(region, 1);
            }}
            onPress={dismissSelection}
            onPoiClick={dismissSelection}
          >
            {slots.map((slot) => {
              const kind = bayKind(
                slot,
                {
                  userId,
                  offline: isSensorFaulty(slot.slotId),
                  sessionOnSlot: Boolean(findActiveSession(historyItems, slot.slotId)),
                },
                now,
              );
              return (
                <ParkingMarker
                  key={slot.slotId}
                  slot={slot}
                  selected={selectedId === slot.slotId}
                  kind={kind}
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
                label={loading ? 'Updating…' : `${stats.openForDrivers} open`}
                tone="available"
              />
              <StatusBadge label={`${stats.onlineOccupied} taken`} tone="occupied" />
              {stats.held > 0 ? (
                <StatusBadge label={`${stats.held} held`} tone="info" />
              ) : null}
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

          {!loading && !error && stats.offlineSensors === stats.total && slots.length > 0 ? (
            <View style={styles.mapBanner}>
              <Text style={styles.mapBannerTitle}>All sensors offline</Text>
              <Text style={styles.mapBannerText}>
                Pins stay on the map as Offline. Keep Personal Hotspot on (2.4 GHz, Maximize
                Compatibility), power the three boards, then wait about a minute.
              </Text>
            </View>
          ) : null}

          {!loading && !error && slots.length === 0 ? (
            <View style={styles.mapBanner}>
              <Text style={styles.mapBannerTitle}>No slots on the map yet</Text>
              <Text style={styles.mapBannerText}>Ask an admin to seed the live lot.</Text>
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
                  backgroundColor:
                    selectedKind === 'mine' || selectedKind === 'heldMine'
                      ? colors.primarySoft
                      : selectedKind === 'open'
                        ? colors.availableSoft
                        : selectedKind === 'taken'
                          ? colors.occupiedSoft
                          : colors.warningSoft,
                },
              ]}
            >
              <Ionicons
                name={
                  selectedKind === 'mine' || selectedKind === 'heldMine'
                    ? 'navigate'
                    : selectedKind === 'offline'
                      ? 'cloud-offline-outline'
                      : selectedKind === 'open'
                        ? 'car-outline'
                        : 'car'
                }
                size={22}
                color={
                  selectedKind === 'mine' || selectedKind === 'heldMine'
                    ? colors.primary
                    : selectedKind === 'open'
                      ? colors.available
                      : selectedKind === 'taken'
                        ? colors.occupied
                        : colors.warning
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
                  selectedKind === 'mine'
                    ? 'Your spot'
                    : selectedKind === 'heldMine'
                      ? 'Held for you'
                      : selectedKind === 'held'
                        ? 'Held'
                        : selectedKind === 'offline'
                          ? 'Offline'
                          : selectedKind === 'open'
                            ? 'Open'
                            : 'Taken'
                }
                tone={
                  selectedKind === 'mine' || selectedKind === 'heldMine'
                    ? 'info'
                    : selectedKind === 'open'
                      ? 'available'
                      : selectedKind === 'taken'
                        ? 'occupied'
                        : 'warning'
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
                variant={sheet.secondaryVariant ?? 'secondary'}
                loading={sheet.secondaryLoading}
                disabled={sheet.secondaryDisabled}
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
