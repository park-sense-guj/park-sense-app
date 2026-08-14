import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BiometricLock } from './src/components/BiometricLock';
import { BlobBackground } from './src/components/BlobBackground';
import { colors } from './src/config/theme';
import { RootNavigator } from './src/navigation/RootNavigator';
import { isBiometricEnabled } from './src/services/biometricService';
import { useAuthStore } from './src/store/authStore';

export default function App() {
  const initializing = useAuthStore((state) => state.initializing);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const profile = useAuthStore((state) => state.profile);
  const biometricUnlocked = useAuthStore((state) => state.biometricUnlocked);
  const hydrate = useAuthStore((state) => state.hydrate);
  const unlockBiometric = useAuthStore((state) => state.unlockBiometric);
  const onUnlocked = useCallback(() => unlockBiometric(), [unlockBiometric]);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricChecked, setBiometricChecked] = useState(false);

  useEffect(() => hydrate(), [hydrate]);

  useEffect(() => {
    let cancelled = false;
    void isBiometricEnabled().then((enabled) => {
      if (cancelled) {
        return;
      }
      setBiometricEnabled(enabled);
      setBiometricChecked(true);
      if (!enabled) {
        unlockBiometric();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [firebaseUser, unlockBiometric]);

  const signedIn = Boolean(firebaseUser && profile);
  const booting = initializing || (signedIn && !biometricChecked);
  const showLock = signedIn && biometricEnabled && !biometricUnlocked;

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {booting ? (
          <View style={styles.boot}>
            <BlobBackground />
            <View style={styles.ripple} />
            <View style={styles.badge} accessibilityLabel="ParkSense">
              <Text style={styles.badgeText}>P</Text>
            </View>
            <Text style={styles.brand}>
              Park<Text style={styles.accent}>Sense</Text>
            </Text>
            <Text style={styles.tagline}>SMART PARKING · LIVE STATUS</Text>
            <ActivityIndicator color={colors.primary} style={styles.spinner} />
          </View>
        ) : showLock ? (
          <BiometricLock onUnlocked={onUnlocked} />
        ) : (
          <RootNavigator />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  ripple: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1,
    borderColor: 'rgba(15, 118, 110, 0.16)',
  },
  badge: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.white, fontSize: 34, fontWeight: '800' },
  brand: { marginTop: 16, fontSize: 30, fontWeight: '800', color: colors.text },
  accent: { color: colors.primary },
  tagline: { marginTop: 8, fontSize: 11, letterSpacing: 1.4, fontWeight: '700', color: colors.textMuted },
  spinner: { marginTop: 28 },
});
