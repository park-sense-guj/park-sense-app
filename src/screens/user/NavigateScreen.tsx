import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { colors, radius, shadow, spacing, typography } from '../../config/theme';
import { useUserLocation } from '../../hooks/useUserLocation';
import type { UserStackParamList } from '../../navigation/types';
import { endParkingSession, startParkingSession } from '../../services/historyService';
import {
  fetchDrivingRoute,
  openExternalNavigation,
  type LatLng,
  type RouteResult,
} from '../../services/mapService';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<UserStackParamList, 'Navigate'>;

export function NavigateScreen({ route }: Props) {
  const { slot } = route.params;
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((state) => state.profile);
  const { location, denied } = useUserLocation();
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const destination: LatLng = { latitude: slot.latitude, longitude: slot.longitude };

  useEffect(() => {
    if (!location) {
      return;
    }
    void fetchDrivingRoute(location, {
      latitude: slot.latitude,
      longitude: slot.longitude,
    }).then(setRouteResult);
  }, [location, slot.latitude, slot.longitude]);

  async function onParked() {
    if (!profile) {
      return;
    }
    setBusy(true);
    try {
      const id = await startParkingSession(profile.userId, slot);
      setHistoryId(id);
      Alert.alert('Session started', `${slot.slotNumber} is now in your parking history.`);
    } catch (error) {
      Alert.alert('Could not start session', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function onLeave() {
    if (!historyId) {
      return;
    }
    Alert.alert('Leave this slot?', 'This will mark the parking session as finished.', [
      { text: 'Stay parked', style: 'cancel' },
      {
        text: 'Leave slot',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              await endParkingSession(historyId);
              setHistoryId(null);
              Alert.alert('Session ended', 'Your exit time was saved to history.');
            } catch (error) {
              Alert.alert('Could not end session', error instanceof Error ? error.message : 'Try again.');
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  }

  const origin = location ?? destination;

  return (
    <View style={styles.flex}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: origin.latitude,
          longitude: origin.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation
        accessibilityLabel="Route to selected parking slot"
      >
        <Marker coordinate={destination} pinColor={colors.available} title={slot.slotNumber} />
        {routeResult ? (
          <Polyline coordinates={routeResult.coordinates} strokeColor={colors.primary} strokeWidth={5} />
        ) : null}
      </MapView>

      <View style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.row}>
          <View style={styles.copy}>
            <Text style={typography.title}>To {slot.slotNumber}</Text>
            <Text style={typography.caption}>{slot.locationName}</Text>
          </View>
          <StatusBadge label={slot.status} tone={slot.status === 'Available' ? 'available' : 'occupied'} />
        </View>
        {routeResult?.durationText ? (
          <Text style={styles.eta}>
            About {routeResult.durationText} · {routeResult.distanceText}
          </Text>
        ) : (
          <Text style={styles.eta}>
            {denied
              ? 'Location access is off. You can still open Maps for directions.'
              : 'Route preview is a straight line until a Google Directions key is added.'}
          </Text>
        )}
        <Button
          title="Open in Maps"
          onPress={() => void openExternalNavigation(destination, `Parking ${slot.slotNumber}`)}
        />
        <View style={styles.actions}>
          <Button
            title={historyId ? 'Parked' : "I'm parked"}
            variant="secondary"
            disabled={Boolean(historyId)}
            loading={busy && !historyId}
            onPress={() => void onParked()}
            style={styles.half}
          />
          <Button
            title="Leave slot"
            variant="danger"
            disabled={!historyId}
            loading={busy && Boolean(historyId)}
            onPress={onLeave}
            style={styles.half}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  map: { flex: 1 },
  panel: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.96)' : colors.cardSolid,
    paddingHorizontal: spacing.lg,
    paddingTop: 18,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow.clay,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  copy: { flex: 1 },
  eta: { color: colors.primaryDark, marginVertical: 12, fontWeight: '600', lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  half: { flex: 1 },
});
