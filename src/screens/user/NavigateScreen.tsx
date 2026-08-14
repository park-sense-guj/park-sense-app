import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { darkMapStyle, lightMapStyle } from '../../config/mapStyles';
import { radius, spacing } from '../../config/theme';
import { useParkingHistory } from '../../hooks/useParkingHistory';
import { useParkingSlots } from '../../hooks/useParkingSlots';
import { useUserLocation } from '../../hooks/useUserLocation';
import type { UserStackParamList } from '../../navigation/types';
import {
  endParkingSession,
  findActiveSession,
  startParkingSession,
} from '../../services/historyService';
import {
  fetchDrivingRoute,
  openExternalNavigation,
  type LatLng,
  type RouteResult,
} from '../../services/mapService';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<UserStackParamList, 'Navigate'>;

type Step = 'drive' | 'parked' | 'done';

export function NavigateScreen({ navigation, route }: Props) {
  const { colors, typography, isDark } = useTheme();
  const { slot: routeSlot } = route.params;
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((state) => state.profile);
  const { location, denied, loading: locationLoading } = useUserLocation();
  const { slots } = useParkingSlots();
  const { items: historyItems } = useParkingHistory(profile?.userId);
  const mapRef = useRef<MapView | null>(null);
  const [routeBundle, setRouteBundle] = useState<{
    key: string;
    result: RouteResult | null;
  }>({ key: '', result: null });
  const [localHistoryId, setLocalHistoryId] = useState<string | null>(null);
  const [leftSession, setLeftSession] = useState(false);
  const [busy, setBusy] = useState(false);

  const slot = useMemo(
    () => slots.find((item) => item.slotId === routeSlot.slotId) ?? routeSlot,
    [slots, routeSlot],
  );

  const activeOnThisSlot = useMemo(
    () => findActiveSession(historyItems, slot.slotId),
    [historyItems, slot.slotId],
  );

  const destination: LatLng = { latitude: slot.latitude, longitude: slot.longitude };
  const origin = location ?? destination;
  const routeKey = location
    ? `${slot.slotId}:${location.latitude.toFixed(5)},${location.longitude.toFixed(5)}`
    : `solo:${slot.slotId}`;

  const sessionId = activeOnThisSlot?.historyId ?? localHistoryId;
  const isParked = Boolean(sessionId) && !leftSession;
  const step: Step = leftSession ? 'done' : isParked ? 'parked' : 'drive';
  const canPark = !isParked && !leftSession && slot.status === 'Available';

  const displayRoute = useMemo((): RouteResult | null => {
    if (!location) {
      return { coordinates: [destination] };
    }
    if (routeBundle.key === routeKey) {
      return routeBundle.result;
    }
    return null;
  }, [location, destination, routeBundle, routeKey]);

  const routeLoading = Boolean(location) && routeBundle.key !== routeKey;
  const styles = useMemo(
    () =>
      StyleSheet.create({
        flex: { flex: 1, backgroundColor: colors.background },
        map: { flex: 1 },
        panel: {
          backgroundColor: colors.sheet,
          paddingHorizontal: spacing.lg,
          paddingTop: 18,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          borderTopWidth: 1,
          borderColor: colors.glassBorder,
        },
        steps: { flexDirection: 'row', gap: 8, marginBottom: 14 },
        stepChip: {
          flex: 1,
          borderRadius: 12,
          paddingVertical: 8,
          paddingHorizontal: 8,
          backgroundColor: colors.primaryMuted,
          alignItems: 'center',
        },
        stepChipActive: {
          backgroundColor: colors.primarySoft,
          borderWidth: 1,
          borderColor: colors.primary,
        },
        stepChipDone: { backgroundColor: colors.primary },
        stepLabel: {
          fontSize: 11,
          fontWeight: '800',
          color: colors.textMuted,
          letterSpacing: 0.3,
        },
        stepLabelActive: { color: colors.primaryDark },
        stepLabelDone: { color: colors.white },
        row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
        copy: { flex: 1 },
        eta: { color: colors.primaryDark, marginVertical: 12, fontWeight: '600', lineHeight: 20 },
        hint: { color: colors.textMuted, marginBottom: 12, lineHeight: 20 },
        actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
        half: { flex: 1 },
        primaryGap: { marginTop: 4 },
      }),
    [colors],
  );

  useEffect(() => {
    if (!location) {
      return;
    }
    let cancelled = false;
    const key = routeKey;
    void fetchDrivingRoute(location, {
      latitude: slot.latitude,
      longitude: slot.longitude,
    }).then((result) => {
      if (!cancelled) {
        setRouteBundle({ key, result });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [location, routeKey, slot.latitude, slot.longitude]);

  useEffect(() => {
    if (!displayRoute?.coordinates.length || !mapRef.current) {
      return;
    }
    mapRef.current.fitToCoordinates(displayRoute.coordinates, {
      edgePadding: { top: 60, right: 40, bottom: 40, left: 40 },
      animated: true,
    });
  }, [displayRoute]);

  async function onParked() {
    if (!profile || isParked) {
      return;
    }
    setBusy(true);
    try {
      const liveSlot = slots.find((item) => item.slotId === slot.slotId) ?? slot;
      const id = await startParkingSession(profile.userId, liveSlot);
      setLocalHistoryId(id);
      setLeftSession(false);
      Alert.alert(
        'You’re parked',
        `${slot.slotNumber} is now taken on the map. Open/taken counts update live. Tap Leave slot when you go.`,
        [{ text: 'OK' }],
      );
    } catch (error) {
      Alert.alert('Could not start session', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  function onLeave() {
    if (!sessionId || !profile) {
      return;
    }
    Alert.alert('Leave this slot?', 'This frees the pin and marks your session finished in Activity.', [
      { text: 'Stay parked', style: 'cancel' },
      {
        text: 'Leave slot',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              await endParkingSession(profile.userId, sessionId);
              setLocalHistoryId(null);
              setLeftSession(true);
              Alert.alert('Session ended', 'The space is open again. Open/taken counts updated.', [
                {
                  text: 'View Activity',
                  onPress: () =>
                    navigation.navigate('UserTabs', {
                      screen: 'HistoryTab',
                    }),
                },
                { text: 'Back to map', onPress: () => navigation.goBack() },
              ]);
            } catch (error) {
              Alert.alert(
                'Could not end session',
                error instanceof Error ? error.message : 'Try again.',
              );
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  }

  const etaText = (() => {
    if (routeLoading || locationLoading) {
      return 'Getting your route…';
    }
    if (displayRoute?.durationText) {
      return `About ${displayRoute.durationText} · ${displayRoute.distanceText}`;
    }
    if (denied) {
      return 'Location is off. Open Maps for turn-by-turn directions.';
    }
    if (!location) {
      return 'Waiting for your location to preview a route.';
    }
    return 'Route preview is ready. Open Maps for turn-by-turn directions.';
  })();

  const nextHint = (() => {
    if (step === 'done') {
      return 'All done — this space is free on the map again.';
    }
    if (isParked) {
      return 'You’re parked here. Leave when you go so others see it as open.';
    }
    if (slot.status === 'Occupied') {
      return 'This space was just taken. Go back and pick a green pin.';
    }
    return 'Open Maps to drive there, then tap I’m parked when you arrive.';
  })();

  return (
    <View style={styles.flex}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: origin.latitude,
          longitude: origin.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation
        userInterfaceStyle={isDark ? 'dark' : 'light'}
        customMapStyle={isDark ? darkMapStyle : lightMapStyle}
        rotateEnabled={false}
        pitchEnabled={false}
        accessibilityLabel="Route to selected parking slot"
      >
        <Marker
          key={`${slot.slotId}-${slot.status}`}
          coordinate={destination}
          pinColor={slot.status === 'Available' ? colors.available : colors.occupied}
          title={slot.slotNumber}
          tracksViewChanges={false}
        />
        {displayRoute && displayRoute.coordinates.length > 1 ? (
          <Polyline
            coordinates={displayRoute.coordinates}
            strokeColor={colors.primary}
            strokeWidth={5}
          />
        ) : null}
      </MapView>

      <View style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.steps}>
          <StepChip label="1 · Drive" active={step === 'drive'} done={step !== 'drive'} styles={styles} />
          <StepChip
            label="2 · Park"
            active={step === 'parked'}
            done={step === 'done'}
            styles={styles}
          />
          <StepChip label="3 · Leave" active={step === 'done'} done={false} styles={styles} />
        </View>

        <View style={styles.row}>
          <View style={styles.copy}>
            <Text style={typography.title}>To {slot.slotNumber}</Text>
            <Text style={typography.caption}>{slot.locationName}</Text>
          </View>
          <StatusBadge
            label={isParked ? 'Your spot' : slot.status}
            tone={isParked || slot.status === 'Available' ? 'available' : 'occupied'}
          />
        </View>
        <Text style={styles.eta}>{etaText}</Text>
        <Text style={styles.hint}>{nextHint}</Text>

        <Button
          title="Open in Maps"
          onPress={() => void openExternalNavigation(destination, `Parking ${slot.slotNumber}`)}
          style={styles.primaryGap}
        />
        <View style={styles.actions}>
          <Button
            title={isParked ? 'Parked ✓' : 'I’m parked'}
            variant="secondary"
            disabled={!canPark}
            loading={busy && !isParked}
            onPress={() => void onParked()}
            style={styles.half}
          />
          <Button
            title="Leave slot"
            variant="danger"
            disabled={!isParked}
            loading={busy && isParked}
            onPress={onLeave}
            style={styles.half}
          />
        </View>
      </View>
    </View>
  );
}

function StepChip({
  label,
  active,
  done,
  styles,
}: {
  label: string;
  active: boolean;
  done: boolean;
  styles: {
    stepChip: object;
    stepChipActive: object;
    stepChipDone: object;
    stepLabel: object;
    stepLabelActive: object;
    stepLabelDone: object;
  };
}) {
  return (
    <View style={[styles.stepChip, active && styles.stepChipActive, done && styles.stepChipDone]}>
      <Text
        style={[styles.stepLabel, active && styles.stepLabelActive, done && styles.stepLabelDone]}
      >
        {label}
      </Text>
    </View>
  );
}
