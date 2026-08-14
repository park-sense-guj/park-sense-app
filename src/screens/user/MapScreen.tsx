import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { initialsFromName } from '../../components/Avatar';
import { BrandHeader } from '../../components/BrandHeader';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { radius } from '../../config/theme';
import { darkMapStyle, lightMapStyle } from '../../config/mapStyles';
import { DEMO_LOT } from '../../data/demoLot';
import { useParkingSlots } from '../../hooks/useParkingSlots';
import type { UserStackParamList } from '../../navigation/types';
import { updatePreferredLocation } from '../../services/authService';
import { createNotification } from '../../services/notificationService';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';
import { useNotifications } from '../../hooks/useNotifications';
import type { ParkingSlot } from '../../types';

export function MapScreen() {
  const { colors, typography, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<UserStackParamList>>();
  const insets = useSafeAreaInsets();
  const fullName = useAuthStore((state) => state.profile?.fullName);
  const photoUrl = useAuthStore((state) => state.profile?.photoUrl);
  const userId = useAuthStore((state) => state.profile?.userId);
  const { unreadCount } = useNotifications(userId);
  const { slots, stats, loading } = useParkingSlots();
  const [selected, setSelected] = useState<ParkingSlot | null>(null);
  const [watching, setWatching] = useState(false);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const initials = initialsFromName(fullName);
  const lotName = slots[0]?.locationName ?? 'No lot yet';
  const firstLat = slots[0]?.latitude;
  const firstLng = slots[0]?.longitude;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        top: { paddingHorizontal: 20, paddingBottom: 10 },
        greeting: { fontSize: 15, color: colors.textMuted },
        name: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.6, marginTop: 2 },
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
        mapBannerText: { marginTop: 4, textAlign: 'center', color: colors.textMuted },
        sheet: {
          position: 'absolute',
          left: 12,
          right: 12,
          backgroundColor: colors.sheet,
          borderRadius: 28,
          padding: 18,
          borderWidth: 1,
          borderColor: colors.glassBorder,
        },
        handle: {
          alignSelf: 'center',
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.borderStrong,
          marginBottom: 12,
        },
        sheetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
        sheetCopy: { flex: 1 },
        sheetHint: { marginTop: 10, color: colors.textMuted, lineHeight: 20 },
        actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
        actionBtn: { flex: 1 },
        dismissHit: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
        dismiss: { color: colors.textMuted, fontWeight: '600' },
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

  const selectSlot = useCallback((slot: ParkingSlot) => {
    setSelected(slot);
  }, []);

  async function watchSlot(slot: ParkingSlot) {
    if (!userId) {
      return;
    }
    setWatching(true);
    try {
      await updatePreferredLocation(userId, slot.locationName);
      await createNotification({
        userId,
        slotId: slot.slotId,
        message: `We will notify you when a slot opens at ${slot.locationName}. Watching ${slot.slotNumber}.`,
      });
      Alert.alert('Watching this lot', `You'll get an alert when a space opens at ${slot.locationName}.`);
    } catch (error) {
      Alert.alert('Could not save alert', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setWatching(false);
    }
  }

  return (
    <Screen padded={false} overlayTabBar blobs={false}>
      <View style={styles.top}>
        <BrandHeader
          initials={initials}
          compact
          photoUrl={photoUrl}
          alertsBadge={unreadCount}
          onAlertsPress={() => navigation.navigate('Alerts')}
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
          >
            {slots.map((slot) => (
              <Marker
                key={slot.slotId}
                coordinate={{ latitude: slot.latitude, longitude: slot.longitude }}
                pinColor={slot.status === 'Available' ? colors.available : colors.occupied}
                title={slot.slotNumber}
                description={`${slot.status} · ${slot.locationName}`}
                onPress={() => selectSlot(slot)}
                tracksViewChanges={false}
                accessibilityLabel={`${slot.slotNumber}, ${slot.status}`}
              />
            ))}
          </MapView>

          <View style={styles.chip} pointerEvents="box-none">
            <Text style={styles.lot} numberOfLines={1}>
              {lotName}
            </Text>
            <View style={styles.chipRow}>
              <StatusBadge
                label={loading ? 'Updating…' : `${stats.available} open`}
                tone="available"
              />
              <StatusBadge label={`${stats.occupied} taken`} tone="occupied" />
            </View>
          </View>

          {!loading && slots.length === 0 ? (
            <View style={styles.mapBanner}>
              <Text style={styles.mapBannerTitle}>No slots on the map yet</Text>
              <Text style={styles.mapBannerText}>Ask an admin to seed the demo lot.</Text>
            </View>
          ) : null}
        </View>
      </View>

      {selected ? (
        <View style={[styles.sheet, { bottom: Math.max(insets.bottom, 12) + 78 }]}>
          <View style={styles.handle} />
          <View style={styles.sheetRow}>
            <View style={styles.sheetCopy}>
              <Text style={typography.title}>{selected.slotNumber}</Text>
              <Text style={typography.caption}>{selected.locationName}</Text>
            </View>
            <StatusBadge
              label={selected.status}
              tone={selected.status === 'Available' ? 'available' : 'occupied'}
            />
          </View>
          <Text style={styles.sheetHint}>
            {selected.status === 'Available'
              ? 'This space is free. Navigate to start driving there.'
              : 'This space is taken. Watch the lot to get an alert when it opens.'}
          </Text>
          <View style={styles.actions}>
            <Button
              title="Navigate"
              disabled={selected.status !== 'Available'}
              onPress={() => navigation.navigate('Navigate', { slot: selected })}
              style={styles.actionBtn}
            />
            <Button
              title="Notify me"
              variant="secondary"
              loading={watching}
              onPress={() => void watchSlot(selected)}
              style={styles.actionBtn}
            />
          </View>
          <Pressable onPress={() => setSelected(null)} style={styles.dismissHit} accessibilityRole="button">
            <Text style={styles.dismiss}>Close</Text>
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}
