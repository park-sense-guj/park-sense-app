import { Ionicons } from '@expo/vector-icons';
import { onValue, ref } from 'firebase/database';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFirebaseDatabase } from '../config/firebase';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Uses Firebase Realtime Database `/.info/connected` so we don't need a native
 * network module (avoids ExpoNetwork rebuilds).
 */
export function OfflineBanner() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    const connectedRef = ref(getFirebaseDatabase(), '.info/connected');
    return onValue(connectedRef, (snapshot) => {
      setConnected(snapshot.val() === true);
    });
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        banner: {
          position: 'absolute',
          top: insets.top + 8,
          left: 16,
          right: 16,
          zIndex: 50,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 14,
          backgroundColor: colors.occupiedSoft,
          borderWidth: 1,
          borderColor: colors.occupied,
        },
        text: { flex: 1, color: colors.occupied, fontWeight: '700', fontSize: 13, lineHeight: 18 },
      }),
    [colors, insets.top],
  );

  if (connected) {
    return null;
  }

  return (
    <View style={styles.banner} accessibilityRole="alert" pointerEvents="none">
      <Ionicons name="cloud-offline-outline" size={18} color={colors.occupied} />
      <Text style={styles.text}>
        You’re offline. Live parking updates will resume when you’re back online.
      </Text>
    </View>
  );
}
