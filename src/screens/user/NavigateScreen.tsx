import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { darkMapStyle, lightMapStyle } from '../../config/mapStyles';
import { useParkingHistory } from '../../hooks/useParkingHistory';
import { useParkingSlots } from '../../hooks/useParkingSlots';
import { useUserLocation } from '../../hooks/useUserLocation';
import type { UserStackParamList } from '../../navigation/types';
import { playErrorFeedback } from '../../services/feedbackService';
import { findActiveSession } from '../../services/historyService';
import {
  distanceMeters,
  distanceToRouteMeters,
  fetchDrivingRoute,
  openExternalNavigation,
  type LatLng,
  type RouteResult,
} from '../../services/mapService';
import { readableNetworkError } from '../../services/networkService';
import { bayKind, holdIsLive } from '../../services/parkingHoldService';
import { useAuthStore } from '../../store/authStore';
import { useConnectivityStore } from '../../store/connectivityStore';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<UserStackParamList, 'Navigate'>;

type FlowStep = 'drive' | 'parked' | 'done';

const SLOW_ROUTE_MS = 4_000;
/** Only re-call Directions if the driver is clearly off the polyline. */
const OFF_ROUTE_METERS = 75;
/** Minimum gap between Directions requests (keeps FYP usage in free quota). */
const REROUTE_COOLDOWN_MS = 45_000;
/** Advance to the next turn when within this of the step end. */
const STEP_ARRIVE_METERS = 28;
const DESTINATION_ARRIVE_METERS = 40;

export function NavigateScreen({ navigation, route }: Props) {
  const { colors, isDark } = useTheme();
  const { slot: routeSlot } = route.params;
  const insets = useSafeAreaInsets();
  const isOnline = useConnectivityStore((state) => state.isOnline);
  const profile = useAuthStore((state) => state.profile);
  const { location, heading, denied, loading: locationLoading } = useUserLocation({
    watch: true,
  });
  const { slots, isSensorFaulty, now } = useParkingSlots();
  const { items: historyItems } = useParkingHistory(profile?.userId);
  const mapRef = useRef<MapView | null>(null);
  const lastRouteAt = useRef(0);
  const rerouting = useRef(false);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [routeSlow, setRouteSlow] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [guiding, setGuiding] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [arrived, setArrived] = useState(false);
  const wasParkedRef = useRef(false);

  const slot = useMemo(
    () => slots.find((item) => item.slotId === routeSlot.slotId) ?? routeSlot,
    [slots, routeSlot],
  );
  const sensorOffline = isSensorFaulty(slot.slotId);

  const activeOnThisSlot = useMemo(
    () => findActiveSession(historyItems, slot.slotId),
    [historyItems, slot.slotId],
  );

  const destination: LatLng = { latitude: slot.latitude, longitude: slot.longitude };
  const origin = location ?? destination;

  const isParked = Boolean(activeOnThisSlot);
  const headingHere =
    holdIsLive(slot, now) && slot.heldByUserId === profile?.userId && !isParked;
  const kind = bayKind(
    slot,
    {
      userId: profile?.userId,
      offline: sensorOffline,
      sessionOnSlot: isParked,
    },
    now,
  );
  if (isParked) {
    wasParkedRef.current = true;
  }
  const flowStep: FlowStep = isParked ? 'parked' : wasParkedRef.current ? 'done' : 'drive';
  const destKey = `${slot.latitude.toFixed(5)},${slot.longitude.toFixed(5)}`;
  const destKeyRef = useRef(destKey);

  const currentStep = routeResult?.steps[stepIndex] ?? null;
  const remainingSteps = Math.max((routeResult?.steps.length ?? 0) - stepIndex, 0);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        flex: { flex: 1, backgroundColor: Platform.OS === 'android' ? 'transparent' : colors.background },
        map: { flex: 1, width: '100%', height: '100%' },
        banner: {
          position: 'absolute',
          left: 16,
          right: 16,
          top: 12,
          borderRadius: 20,
          backgroundColor: colors.cardSolid,
          borderWidth: 1,
          borderColor: colors.glassBorder,
          paddingHorizontal: 14,
          paddingVertical: 12,
          gap: 4,
          shadowColor: '#0F172A',
          shadowOpacity: 0.12,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        },
        bannerLabel: {
          fontSize: 11,
          fontWeight: '800',
          letterSpacing: 0.6,
          color: colors.primaryDark,
          textTransform: 'uppercase',
        },
        bannerText: {
          fontSize: 16,
          fontWeight: '800',
          color: colors.text,
          lineHeight: 22,
        },
        bannerMeta: {
          fontSize: 12,
          fontWeight: '600',
          color: colors.textMuted,
        },
        panel: {
          backgroundColor: colors.cardSolid,
          paddingHorizontal: 16,
          paddingTop: 10,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          borderTopWidth: 1,
          borderColor: colors.glassBorder,
          shadowColor: '#0F172A',
          shadowOpacity: 0.14,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: -4 },
          elevation: 10,
        },
        handle: {
          alignSelf: 'center',
          width: 36,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.borderStrong,
          marginBottom: 12,
        },
        progress: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 14,
          paddingHorizontal: 4,
        },
        progressDot: {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: colors.borderStrong,
        },
        progressDotActive: {
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: colors.primary,
        },
        progressDotDone: {
          backgroundColor: colors.primary,
        },
        progressLine: {
          flex: 1,
          height: 2,
          marginHorizontal: 6,
          backgroundColor: colors.borderStrong,
          borderRadius: 1,
        },
        progressLineDone: {
          backgroundColor: colors.primary,
        },
        progressLabels: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 14,
          paddingHorizontal: 2,
        },
        progressLabel: {
          fontSize: 11,
          fontWeight: '700',
          color: colors.textMuted,
          width: 52,
          textAlign: 'center',
        },
        progressLabelActive: {
          color: colors.primaryDark,
          fontWeight: '800',
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        },
        orb: {
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: 'center',
          justifyContent: 'center',
        },
        headerCopy: { flex: 1, minWidth: 0, gap: 2 },
        title: {
          fontSize: 20,
          fontWeight: '800',
          color: colors.text,
          letterSpacing: -0.4,
        },
        subtitle: {
          fontSize: 13,
          fontWeight: '600',
          color: colors.textMuted,
        },
        metaCard: {
          marginTop: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 14,
          backgroundColor: colors.primarySoft,
          borderWidth: 1,
          borderColor: colors.glassBorder,
        },
        metaText: {
          fontSize: 13,
          fontWeight: '700',
          color: colors.primaryDark,
          lineHeight: 18,
        },
        hint: {
          marginTop: 10,
          color: colors.textMuted,
          fontSize: 13,
          fontWeight: '500',
          lineHeight: 19,
        },
        actions: {
          marginTop: 14,
          gap: 8,
          width: '100%',
        },
        externalLink: {
          alignSelf: 'center',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingVertical: 10,
          marginTop: 2,
        },
        externalLinkText: {
          fontSize: 13,
          fontWeight: '700',
          color: colors.textMuted,
        },
      }),
    [colors],
  );

  const loadRoute = useCallback(
    async (from: LatLng, reason: 'initial' | 'reroute' | 'manual') => {
      if (rerouting.current && reason === 'reroute') {
        return;
      }
      const now = Date.now();
      if (reason === 'reroute' && now - lastRouteAt.current < REROUTE_COOLDOWN_MS) {
        return;
      }
      rerouting.current = true;
      setRouteLoading(true);
      setRouteSlow(false);
      const slowTimer = setTimeout(() => setRouteSlow(true), SLOW_ROUTE_MS);
      try {
        const result = await fetchDrivingRoute(from, destination);
        setRouteResult(result);
        setStepIndex(0);
        setArrived(false);
        lastRouteAt.current = Date.now();
      } finally {
        clearTimeout(slowTimer);
        setRouteSlow(false);
        setRouteLoading(false);
        rerouting.current = false;
      }
    },
    [destination],
  );

  useEffect(() => {
    if (destKeyRef.current === destKey) {
      return;
    }
    destKeyRef.current = destKey;
    setRouteResult(null);
  }, [destKey]);

  // Fetch once when we first get a location (not on every GPS tick).
  useEffect(() => {
    if (!location || routeResult || isParked || flowStep === 'done') {
      return;
    }
    void loadRoute(location, 'initial');
  }, [location, routeResult, isParked, flowStep, loadRoute]);

  // Camera: overview when idle; follow user while guiding.
  useEffect(() => {
    if (!mapRef.current) {
      return;
    }
    if (guiding && location && !isParked) {
      mapRef.current.animateCamera(
        {
          center: location,
          heading: heading ?? 0,
          pitch: 45,
          zoom: 17,
        },
        { duration: 600 },
      );
      return;
    }
    if (routeResult?.coordinates.length) {
      mapRef.current.fitToCoordinates(routeResult.coordinates, {
        edgePadding: { top: guiding ? 120 : 60, right: 40, bottom: 40, left: 40 },
        animated: true,
      });
    }
  }, [guiding, location, heading, routeResult, isParked]);

  // Advance steps + off-route re-fetch while guiding.
  useEffect(() => {
    if (!guiding || !location || !routeResult || isParked) {
      return;
    }

    const toDestination = distanceMeters(location, destination);
    if (toDestination <= DESTINATION_ARRIVE_METERS) {
      setArrived(true);
      setGuiding(false);
      return;
    }

    const steps = routeResult.steps;
    if (steps.length > 0) {
      let index = stepIndex;
      while (
        index < steps.length - 1 &&
        distanceMeters(location, steps[index].end) <= STEP_ARRIVE_METERS
      ) {
        index += 1;
      }
      if (index !== stepIndex) {
        setStepIndex(index);
      }
    }

    if (
      isOnline &&
      !routeResult.isFallback &&
      distanceToRouteMeters(location, routeResult.coordinates) > OFF_ROUTE_METERS
    ) {
      void loadRoute(location, 'reroute');
    }
  }, [
    guiding,
    location,
    routeResult,
    isParked,
    destination,
    stepIndex,
    isOnline,
    loadRoute,
  ]);

  useEffect(() => {
    if (isParked || flowStep === 'done') {
      setGuiding(false);
    }
  }, [isParked, flowStep]);

  async function onOpenMaps() {
    try {
      await openExternalNavigation(destination, `Parking ${slot.slotNumber}`);
    } catch (error) {
      playErrorFeedback();
      Alert.alert(
        'Could not open Maps',
        readableNetworkError(error, 'Try again in a moment.'),
      );
    }
  }

  function onToggleGuidance() {
    if (guiding) {
      setGuiding(false);
      return;
    }
    if (!location) {
      Alert.alert('Location needed', 'Turn on location to start in-app guidance.');
      return;
    }
    if (!routeResult) {
      void loadRoute(location, 'manual').then(() => setGuiding(true));
      return;
    }
    setGuiding(true);
  }

  const etaText = (() => {
    if (isParked || flowStep === 'done') {
      if (routeResult?.durationText && !routeResult.isFallback) {
        return `Drive was about ${routeResult.durationText} · ${routeResult.distanceText}`;
      }
      return isParked
        ? 'Parked — your session is live. It ends when the IR sensor opens.'
        : 'Session finished when the bay opened.';
    }
    if (arrived) {
      return 'You’ve arrived. Cover the IR sensor to start your session automatically.';
    }
    if (!isOnline && !routeResult) {
      return 'You’re offline. Reconnect for turn guidance, or open Apple/Google Maps.';
    }
    if (routeLoading || locationLoading) {
      return routeSlow
        ? 'Connection is slow — still loading your route…'
        : 'Getting your route…';
    }
    if (routeResult?.warning && routeResult.isFallback) {
      return routeResult.warning;
    }
    if (guiding && currentStep) {
      const meta = [currentStep.distanceText, routeResult?.durationText]
        .filter(Boolean)
        .join(' · ');
      return meta ? `Next turn · ${meta}` : 'Follow the guidance above.';
    }
    if (routeResult?.durationText) {
      return `About ${routeResult.durationText} · ${routeResult.distanceText}`;
    }
    if (denied) {
      return 'Location is off. Enable it for in-app guidance, or open Maps.';
    }
    if (!location) {
      return 'Waiting for your location…';
    }
    return 'Route ready. Start guidance to follow turns in the app.';
  })();

  const nextHint = (() => {
    if (sensorOffline) {
      return 'Sensor offline for this space. Go back and pick another pin.';
    }
    if (flowStep === 'done') {
      return 'The bay opened, so your session ended automatically.';
    }
    if (isParked) {
      return 'You’re parked here. Drive away and uncover the IR sensor to end the session.';
    }
    if (arrived) {
      return slot.holdCheckIn === 'admitted'
        ? 'Park in the bay. Covering the IR sensor starts your session — no extra tap.'
        : 'Scan the QR on this stall, then cover the IR sensor to start your session.';
    }
    if (guiding) {
      return remainingSteps > 1
        ? `${remainingSteps} turns left · map follows you`
        : 'Almost there · map follows you';
    }
    if (slot.status === 'Occupied' && !headingHere && !isParked) {
      return 'This space was taken by someone else. Go back and pick an open pin.';
    }
    if (headingHere) {
      return slot.holdCheckIn === 'admitted'
        ? 'You’re checked in. Cover the IR sensor when you park to start the session.'
        : 'This bay is held for you. Scan the QR on the stall, then cover the IR sensor when you park.';
    }
    return 'Start guidance for turn-by-turn directions to this space.';
  })();

  const badgeLabel =
    kind === 'offline'
      ? 'Sensor offline'
      : kind === 'mine'
        ? 'Your spot'
        : kind === 'heldMine'
          ? 'Held for you'
          : kind === 'held'
            ? 'Held'
            : kind === 'open'
              ? 'Open'
              : 'Taken';

  const badgeTone =
    kind === 'open' || kind === 'mine' || kind === 'heldMine'
      ? ('available' as const)
      : kind === 'taken'
        ? ('occupied' as const)
        : ('warning' as const);

  const orbBg =
    kind === 'offline' || kind === 'held'
      ? colors.warningSoft
      : isParked || flowStep === 'done' || kind === 'heldMine'
        ? colors.primarySoft
        : kind === 'open'
          ? colors.availableSoft
          : colors.occupiedSoft;

  const orbFg =
    kind === 'offline' || kind === 'held'
      ? colors.warning
      : isParked || flowStep === 'done' || kind === 'heldMine'
        ? colors.primary
        : kind === 'open'
          ? colors.available
          : colors.occupied;

  const orbIcon =
    flowStep === 'done'
      ? ('checkmark-circle' as const)
      : isParked
        ? ('car' as const)
        : guiding
          ? ('navigate' as const)
          : arrived
            ? ('flag' as const)
            : ('car-outline' as const);

  const driveDone = flowStep !== 'drive';
  const parkDone = flowStep === 'done';
  const parkActive = flowStep === 'parked';
  const leaveActive = flowStep === 'done';

  return (
    <View style={styles.flex}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        initialRegion={{
          latitude: origin.latitude,
          longitude: origin.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        loadingEnabled
        showsUserLocation
        followsUserLocation={guiding && !isParked}
        showsTraffic={guiding}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
        customMapStyle={isDark ? darkMapStyle : lightMapStyle}
        rotateEnabled={guiding}
        pitchEnabled={guiding}
        accessibilityLabel="Route to selected parking slot"
      >
        <Marker
          key={`${slot.slotId}-${slot.status}`}
          coordinate={destination}
          pinColor={
            kind === 'open'
              ? colors.available
              : kind === 'mine' || kind === 'heldMine'
                ? colors.primary
                : kind === 'held' || kind === 'offline'
                  ? colors.warning
                  : colors.occupied
          }
          title={slot.slotNumber}
          tracksViewChanges={false}
        />
        {routeResult && routeResult.coordinates.length > 1 ? (
          <Polyline
            coordinates={routeResult.coordinates}
            strokeColor={colors.primary}
            strokeWidth={5}
          />
        ) : null}
      </MapView>

      {guiding && currentStep && !isParked ? (
        <View style={[styles.banner, { top: Math.max(insets.top, 12) }]}>
          <Text style={styles.bannerLabel}>
            {arrived ? 'Arrived' : `Step ${stepIndex + 1} of ${routeResult?.steps.length ?? 1}`}
          </Text>
          <Text style={styles.bannerText} numberOfLines={3}>
            {arrived ? `You’ve reached ${slot.slotNumber}` : currentStep.instruction}
          </Text>
          {!arrived && currentStep.distanceText ? (
            <Text style={styles.bannerMeta}>{currentStep.distanceText} to next turn</Text>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <View style={styles.handle} />

        <View style={styles.progress} accessibilityRole="progressbar">
          <View
            style={[
              styles.progressDot,
              (driveDone || flowStep === 'drive') && styles.progressDotActive,
              driveDone && styles.progressDotDone,
            ]}
          />
          <View style={[styles.progressLine, driveDone && styles.progressLineDone]} />
          <View
            style={[
              styles.progressDot,
              (parkActive || parkDone) && styles.progressDotActive,
              parkDone && styles.progressDotDone,
            ]}
          />
          <View style={[styles.progressLine, parkDone && styles.progressLineDone]} />
          <View
            style={[
              styles.progressDot,
              leaveActive && styles.progressDotActive,
              leaveActive && styles.progressDotDone,
            ]}
          />
        </View>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressLabel, flowStep === 'drive' && styles.progressLabelActive]}>
            Drive
          </Text>
          <Text style={[styles.progressLabel, parkActive && styles.progressLabelActive]}>Park</Text>
          <Text style={[styles.progressLabel, leaveActive && styles.progressLabelActive]}>
            Leave
          </Text>
        </View>

        <View style={styles.header}>
          <View style={[styles.orb, { backgroundColor: orbBg }]}>
            <Ionicons name={orbIcon} size={22} color={orbFg} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>
              {flowStep === 'done'
                ? `${slot.slotNumber} done`
                : isParked
                  ? `Parked at ${slot.slotNumber}`
                  : `To ${slot.slotNumber}`}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {slot.locationName}
            </Text>
          </View>
          <StatusBadge label={badgeLabel} tone={badgeTone} />
        </View>

        <View style={styles.metaCard}>
          <Text style={styles.metaText}>{etaText}</Text>
        </View>
        <Text style={styles.hint}>{nextHint}</Text>

        <View style={styles.actions}>
          {flowStep === 'drive' ? (
            <>
              {headingHere && slot.holdCheckIn !== 'admitted' ? (
                <Button
                  title="Scan bay QR"
                  variant="secondary"
                  onPress={() => navigation.navigate('ScanBay', { slot })}
                />
              ) : null}
              <Button
                title={guiding ? 'Stop guidance' : 'Start guidance'}
                onPress={onToggleGuidance}
                loading={routeLoading && !routeResult}
                disabled={sensorOffline || (!location && !denied)}
              />
            </>
          ) : (
            <Button title="Back to map" onPress={() => navigation.goBack()} />
          )}
        </View>

        {flowStep === 'drive' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open in Apple or Google Maps"
            onPress={() => void onOpenMaps()}
            style={styles.externalLink}
          >
            <Ionicons name="map-outline" size={14} color={colors.textMuted} />
            <Text style={styles.externalLinkText}>Prefer Apple or Google Maps?</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
