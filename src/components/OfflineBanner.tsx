import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useConnectivityStore } from '../store/connectivityStore';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Uses Firebase Realtime Database `/.info/connected` so we don't need a native
 * network module (avoids ExpoNetwork rebuilds).
 */
export function OfflineBanner() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isOnline = useConnectivityStore((state) => state.isOnline);
  const ready = useConnectivityStore((state) => state.ready);

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

  if (!ready || isOnline) {
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
