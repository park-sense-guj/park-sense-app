import { Ionicons } from '@expo/vector-icons';
import { memo, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import type { MarkerPressEvent } from 'react-native-maps';

import { useTheme } from '../theme/ThemeProvider';
import type { BayKind, ParkingSlot } from '../types';

type Props = {
  slot: ParkingSlot;
  selected?: boolean;
  kind?: BayKind;
  onPress: () => void;
};

/** Outer box stays fixed so selection never resizes the marker (avoids flicker). */
const BOX = 44;
const BUBBLE = 32;

function ParkingMarkerComponent({ slot, selected, kind = 'open', onPress }: Props) {
  const { colors } = useTheme();
  const [tracks, setTracks] = useState(true);

  useEffect(() => {
    setTracks(true);
    const timer = setTimeout(() => setTracks(false), 400);
    return () => clearTimeout(timer);
    // Re-snapshot only when color meaning changes. Selection updates live on iOS;
    // Android needs a short refresh when selected flips.
  }, [kind, Platform.OS === 'android' ? selected : false]);

  const fill =
    kind === 'mine' || kind === 'heldMine'
      ? colors.primary
      : kind === 'held'
        ? colors.warning
        : kind === 'offline'
          ? colors.textMuted
          : kind === 'open'
            ? colors.available
            : colors.occupied;

  const iconName =
    kind === 'mine' || kind === 'heldMine'
      ? ('navigate' as const)
      : kind === 'offline'
        ? ('cloud-offline-outline' as const)
        : ('car' as const);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          width: BOX,
          height: BOX,
          alignItems: 'center',
          justifyContent: 'center',
        },
        ring: {
          position: 'absolute',
          width: selected ? BOX : 0,
          height: selected ? BOX : 0,
          borderRadius: BOX / 2,
          borderWidth: selected ? 2 : 0,
          borderColor: fill,
          opacity: 0.45,
        },
        bubble: {
          width: BUBBLE,
          height: BUBBLE,
          borderRadius: BUBBLE / 2,
          backgroundColor: fill,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: selected ? 3 : 2,
          borderColor: colors.white,
        },
      }),
    [colors.white, fill, selected],
  );

  return (
    <Marker
      coordinate={{ latitude: slot.latitude, longitude: slot.longitude }}
      identifier={slot.slotId}
      onPress={(event: MarkerPressEvent) => {
        event.stopPropagation?.();
        onPress();
      }}
      tappable
      tracksViewChanges={tracks}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={selected ? 1000 : kind === 'mine' || kind === 'heldMine' ? 100 : 1}
      accessibilityLabel={`${slot.slotNumber}, ${kind}`}
    >
      <View style={styles.wrap} collapsable={false}>
        <View style={styles.ring} pointerEvents="none" />
        <View style={styles.bubble} pointerEvents="none" collapsable={false}>
          <Ionicons name={iconName} size={15} color={colors.white} />
        </View>
      </View>
    </Marker>
  );
}

export const ParkingMarker = memo(ParkingMarkerComponent);
