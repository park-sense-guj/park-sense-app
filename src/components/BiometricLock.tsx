import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import {
  authenticateWithBiometrics,
  getBiometricLabel,
  isBiometricEnabled,
} from '../services/biometricService';
import { BlobBackground } from './BlobBackground';
import { Button } from './Button';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  onUnlocked: () => void;
};

export function BiometricLock({ onUnlocked }: Props) {
  const { colors } = useTheme();
  const [label, setLabel] = useState('Biometrics');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
        ripple: {
          position: 'absolute',
          width: 260,
          height: 260,
          borderRadius: 130,
          borderWidth: 1,
          borderColor: colors.border,
        },
        rippleInner: {
          position: 'absolute',
          width: 190,
          height: 190,
          borderRadius: 95,
          borderWidth: 1,
          borderColor: colors.borderStrong,
        },
        logo: {
          width: 84,
          height: 84,
          borderRadius: 26,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        },
        logoMark: { color: colors.white, fontSize: 36, fontWeight: '800' },
        brand: { marginTop: 16, fontSize: 28, fontWeight: '800', color: colors.text },
        accent: { color: colors.primary },
        tag: { marginTop: 8, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: colors.textMuted },
        iconWrap: { marginTop: 28 },
        spinner: { marginTop: 18 },
        error: { marginTop: 14, color: colors.occupied, textAlign: 'center', fontWeight: '600' },
        button: { marginTop: 24, alignSelf: 'stretch' },
      }),
    [colors],
  );

  useEffect(() => {
    void (async () => {
      const enabled = await isBiometricEnabled();
      if (!enabled) {
        onUnlocked();
        return;
      }
      setLabel(await getBiometricLabel());
      setBusy(false);
      const ok = await authenticateWithBiometrics(`Unlock ParkSense with ${await getBiometricLabel()}`);
      if (ok) {
        onUnlocked();
      }
    })();
  }, [onUnlocked]);

  async function retry() {
    setError('');
    setBusy(true);
    try {
      const ok = await authenticateWithBiometrics(`Unlock ParkSense with ${label}`);
      if (ok) {
        onUnlocked();
      } else {
        setError(`${label} was cancelled. Try again to continue.`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <BlobBackground />
      <View style={styles.center}>
        <View style={styles.ripple} />
        <View style={styles.rippleInner} />
        <View style={styles.logo}>
          <Text style={styles.logoMark}>P</Text>
        </View>
        <Text style={styles.brand}>
          Park<Text style={styles.accent}>Sense</Text>
        </Text>
        <Text style={styles.tag}>UNLOCK WITH {label.toUpperCase()}</Text>
        <View style={styles.iconWrap}>
          <Ionicons
            name={label.includes('Face') ? 'scan-outline' : 'finger-print-outline'}
            size={36}
            color={colors.primary}
          />
        </View>
        {busy ? <ActivityIndicator color={colors.primary} style={styles.spinner} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={`Use ${label}`} onPress={() => void retry()} loading={busy} style={styles.button} />
      </View>
    </View>
  );
}
