import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { darkMapStyle, lightMapStyle } from '../../config/mapStyles';
import { useParkingHistory } from '../../hooks/useParkingHistory';
import { useParkingSlots } from '../../hooks/useParkingSlots';
import { useUserLocation } from '../../hooks/useUserLocation';
import type { UserStackParamList } from '../../navigation/types';
import { playErrorFeedback, playSuccessFeedback } from '../../services/feedbackService';
import {
  endParkingSession,
  findActiveSession,
  startParkingSession,
} from '../../services/historyService';
import {
  distanceMeters,
  distanceToRouteMeters,
  fetchDrivingRoute,
  openExternalNavigation,
  type LatLng,
  type RouteResult,
} from '../../services/mapService';
import { readableNetworkError } from '../../services/networkService';
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
  const { slots, isSensorFaulty } = useParkingSlots();
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
  const [localHistoryId, setLocalHistoryId] = useState<string | null>(null);
  const [leftSession, setLeftSession] = useState(false);
  const [busy, setBusy] = useState(false);

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

  const sessionId = activeOnThisSlot?.historyId ?? localHistoryId;
  const isParked = Boolean(sessionId) && !leftSession;
  const flowStep: FlowStep = leftSession ? 'done' : isParked ? 'parked' : 'drive';
  const canPark = !isParked && !leftSession && slot.status === 'Available' && !sensorOffline;

  const currentStep = routeResult?.steps[stepIndex] ?? null;
  const remainingSteps = Math.max((routeResult?.steps.length ?? 0) - stepIndex, 0);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        flex: { flex: 1, backgroundColor: colors.background },
        map: { flex: 1 },
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

  async function onParked() {
    if (!profile || isParked) {
      return;
    }
    if (!isOnline) {
      playErrorFeedback();
      Alert.alert('You’re offline', 'Reconnect to mark this space as taken on the live map.');
      return;
    }
    setBusy(true);
    try {
      const liveSlot = slots.find((item) => item.slotId === slot.slotId) ?? slot;
      const id = await startParkingSession(profile.userId, liveSlot);
      setLocalHistoryId(id);
      setLeftSession(false);
      setGuiding(false);
      playSuccessFeedback();
      Alert.alert(
        'You’re parked',
        `${slot.slotNumber} is now taken on the map. Open/taken counts update live. Tap Leave slot when you go.`,
        [{ text: 'OK' }],
      );
    } catch (error) {
      playErrorFeedback();
      Alert.alert(
        'Could not start session',
        readableNetworkError(error, 'Try again when your connection is stable.'),
      );
    } finally {
      setBusy(false);
    }
  }

  function onLeave() {
    if (!sessionId || !profile) {
      return;
    }
    if (!isOnline) {
      playErrorFeedback();
      Alert.alert('You’re offline', 'Reconnect to free this space on the live map.');
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
              playSuccessFeedback();
              Alert.alert('Session ended', 'The space is open again. Open/taken counts updated.', [
                {
                  text: 'View Activity',
                  onPress: () =>
                    navigation.dispatch(
                      CommonActions.reset({
                        index: 0,
                        routes: [{ name: 'UserTabs', params: { screen: 'HistoryTab' } }],
                      }),
                    ),
                },
                { text: 'Back to map', onPress: () => navigation.goBack() },
              ]);
            } catch (error) {
              playErrorFeedback();
              Alert.alert(
                'Could not end session',
                readableNetworkError(error, 'Try again when your connection is stable.'),
              );
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  }

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
        ? 'You’re at this space. Leave when you go so others see it as open.'
        : 'Session finished — this space is free on the map again.';
    }
    if (arrived) {
      return 'You’ve arrived. Tap I’m parked when you’re in the space.';
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
      return 'All done — this space is free on the map again.';
    }
    if (isParked) {
      return 'Leave when you go so the pin turns green and lot watchers can be notified.';
    }
    if (arrived) {
      return 'Park in the bay, then confirm with I’m parked.';
    }
    if (guiding) {
      return remainingSteps > 1
        ? `${remainingSteps} turns left · map follows you`
        : 'Almost there · map follows you';
    }
    if (slot.status === 'Occupied') {
      return 'This space was just taken. Go back and pick a green pin.';
    }
    return 'Start guidance for turn-by-turn directions to this space.';
  })();

  const nearDestination =
    arrived ||
    Boolean(
      location && distanceMeters(location, destination) <= DESTINATION_ARRIVE_METERS * 2,
    );
  const showParkAction = flowStep === 'drive' && nearDestination && canPark;

  const badgeLabel = sensorOffline
    ? 'Sensor offline'
    : isParked
      ? 'Your spot'
      : guiding
        ? 'Guiding'
        : arrived
          ? 'Arrived'
          : flowStep === 'done'
            ? 'Done'
            : slot.status === 'Available'
              ? 'Open'
              : 'Taken';

  const badgeTone =
    sensorOffline
      ? ('warning' as const)
      : isParked || slot.status === 'Available' || arrived || flowStep === 'done'
        ? ('available' as const)
        : ('occupied' as const);

  const orbBg = sensorOffline
    ? colors.warningSoft
    : isParked || flowStep === 'done'
      ? colors.primarySoft
      : slot.status === 'Available'
        ? colors.availableSoft
        : colors.occupiedSoft;

  const orbFg = sensorOffline
    ? colors.warning
    : isParked || flowStep === 'done'
      ? colors.primary
      : slot.status === 'Available'
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
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: origin.latitude,
          longitude: origin.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
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
          pinColor={slot.status === 'Available' ? colors.available : colors.occupied}
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
                ? `${slot.slotNumber} freed`
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
              {showParkAction ? (
                <Button
                  title="I’m parked"
                  onPress={() => void onParked()}
                  disabled={!isOnline}
                  loading={busy && !isParked}
                />
              ) : null}
              <Button
                title={guiding ? 'Stop guidance' : 'Start guidance'}
                variant={showParkAction ? 'secondary' : 'primary'}
                onPress={onToggleGuidance}
                loading={routeLoading && !routeResult}
                disabled={sensorOffline || (!location && !denied)}
              />
            </>
          ) : null}

          {flowStep === 'parked' ? (
            <Button
              title="Leave slot"
              variant="danger"
              disabled={!isOnline}
              loading={busy && isParked}
              onPress={onLeave}
            />
          ) : null}

          {flowStep === 'done' ? (
            <Button title="Back to map" onPress={() => navigation.goBack()} />
          ) : null}
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
