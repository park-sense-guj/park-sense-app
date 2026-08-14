import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BlobBackground } from './src/components/BlobBackground';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { OfflineBanner } from './src/components/OfflineBanner';
import { RootNavigator } from './src/navigation/RootNavigator';
import { configureGoogleSignIn } from './src/services/googleAuthService';
import { useAuthStore } from './src/store/authStore';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';

function AppContent() {
  const { colors, isDark } = useTheme();
  const initializing = useAuthStore((state) => state.initializing);
  const hydrate = useAuthStore((state) => state.hydrate);

  const themedStyles = useMemo(
    () =>
      StyleSheet.create({
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
          borderColor: colors.border,
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
        tagline: {
          marginTop: 8,
          fontSize: 11,
          letterSpacing: 1.4,
          fontWeight: '700',
          color: colors.textMuted,
        },
        spinner: { marginTop: 28 },
        shell: { flex: 1 },
      }),
    [colors],
  );

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  useEffect(() => hydrate(), [hydrate]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {initializing ? (
        <View style={themedStyles.boot}>
          <BlobBackground />
          <View style={themedStyles.ripple} />
          <View style={themedStyles.badge} accessibilityLabel="ParkSense">
            <Text style={themedStyles.badgeText}>P</Text>
          </View>
          <Text style={themedStyles.brand}>
            Park<Text style={themedStyles.accent}>Sense</Text>
          </Text>
          <Text style={themedStyles.tagline}>SMART PARKING · LIVE STATUS</Text>
          <ActivityIndicator color={colors.primary} style={themedStyles.spinner} />
        </View>
      ) : (
        <View style={themedStyles.shell}>
          <OfflineBanner />
          <ErrorBoundary>
            <RootNavigator />
          </ErrorBoundary>
        </View>
      )}
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
