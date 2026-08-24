import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import type { ReceptionistStackParamList } from '../../navigation/types';
import { playErrorFeedback, playSelectionFeedback } from '../../services/feedbackService';
import { parsePassQr } from '../../services/parkingPassService';
import { useConnectivityStore } from '../../store/connectivityStore';
import { useTheme } from '../../theme/ThemeProvider';

export function ReceptionistScanScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ReceptionistStackParamList>>();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const isOnline = useConnectivityStore((state) => state.isOnline);
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [manualError, setManualError] = useState('');
  const lock = useRef(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        flex: { flex: 1 },
        camera: { ...StyleSheet.absoluteFill },
        overlay: {
          ...StyleSheet.absoluteFill,
          justifyContent: 'space-between',
          paddingTop: insets.top + 16,
          paddingBottom: Math.max(insets.bottom, 16) + 88,
          paddingHorizontal: 20,
        },
        copy: { gap: 6 },
        title: {
          fontSize: 28,
          fontWeight: '800',
          color: colors.white,
          letterSpacing: -0.6,
        },
        subtitle: { color: 'rgba(255,255,255,0.82)', fontWeight: '600', lineHeight: 20 },
        frameWrap: { alignItems: 'center', justifyContent: 'center', flex: 1 },
        frame: {
          width: 240,
          height: 240,
          borderRadius: 28,
          borderWidth: 3,
          borderColor: 'rgba(255,255,255,0.92)',
        },
        footer: { gap: 10 },
        row: { flexDirection: 'row', gap: 10 },
        chip: {
          flex: 1,
          minHeight: 48,
          borderRadius: 16,
          backgroundColor: 'rgba(15,23,42,0.55)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.18)',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
        },
        chipText: { color: colors.white, fontWeight: '800', fontSize: 14 },
        fallback: { flex: 1, justifyContent: 'center', gap: 14 },
        fallbackTitle: {
          fontSize: 26,
          fontWeight: '800',
          color: colors.text,
          letterSpacing: -0.5,
        },
        fallbackBody: { color: colors.textMuted, lineHeight: 20, fontWeight: '500' },
        modalRoot: {
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: 'flex-end',
        },
        modalCard: {
          backgroundColor: colors.cardSolid,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          padding: 20,
          paddingBottom: 28,
        },
        modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
        modalHint: { marginTop: 6, marginBottom: 16, color: colors.textMuted, lineHeight: 20 },
      }),
    [colors, insets.bottom, insets.top],
  );

  function openPass(raw: string) {
    if (lock.current) {
      return;
    }
    const token = parsePassQr(raw);
    if (!token) {
      lock.current = true;
      playErrorFeedback();
      Alert.alert(
        'Not a ParkSense pass',
        'Ask the driver to open the arrival QR in the app. Screenshots of old codes will not work.',
        [{ text: 'OK', onPress: () => { lock.current = false; } }],
      );
      return;
    }
    if (!isOnline) {
      lock.current = true;
      playErrorFeedback();
      Alert.alert('You’re offline', 'Reconnect to verify whether this pass is genuine.', [
        { text: 'OK', onPress: () => { lock.current = false; } },
      ]);
      return;
    }
    lock.current = true;
    playSelectionFeedback();
    navigation.navigate('PassDetail', { token });
    setTimeout(() => {
      lock.current = false;
    }, 1200);
  }

  function submitManual() {
    setManualError('');
    const token = parsePassQr(manualValue);
    if (!token) {
      setManualError('Enter the pass token from the driver’s screen.');
      return;
    }
    setManualOpen(false);
    setManualValue('');
    openPass(token);
  }

  if (!permission) {
    return (
      <Screen>
        <View />
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        <View style={styles.fallback}>
          <Text style={styles.fallbackTitle}>Camera access</Text>
          <Text style={styles.fallbackBody}>
            Reception needs the camera to scan arrival QR codes. You can also type a pass token if
            the camera is unavailable.
          </Text>
          <Button title="Allow camera" onPress={() => void requestPermission()} />
          <Button title="Enter pass token" variant="secondary" onPress={() => setManualOpen(true)} />
        </View>
        {manualModal()}
      </Screen>
    );
  }

  function manualModal() {
    return (
      <Modal visible={manualOpen} transparent animationType="slide" onRequestClose={() => setManualOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <Pressable style={styles.modalRoot} onPress={() => setManualOpen(false)}>
            <Pressable style={styles.modalCard} onPress={() => undefined}>
              <Text style={styles.modalTitle}>Enter pass token</Text>
              <Text style={styles.modalHint}>
                Type or paste the code from the driver’s arrival screen if the camera cannot scan.
              </Text>
              <TextField
                label="Pass token"
                value={manualValue}
                onChangeText={(value) => {
                  setManualValue(value);
                  setManualError('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                error={manualError}
                placeholder="parksense:pass:…"
              />
              <Button title="Check pass" onPress={submitManual} />
              <Button title="Cancel" variant="secondary" onPress={() => setManualOpen(false)} />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  return (
    <View style={styles.flex}>
      {focused ? (
        <CameraView
          style={styles.camera}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => openPass(data)}
        />
      ) : (
        <View style={[styles.camera, { backgroundColor: '#0B1412' }]} />
      )}
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.copy}>
          <Text style={styles.title}>Scan arrival</Text>
          <Text style={styles.subtitle}>
            {isOnline
              ? 'Point the camera at the driver’s live ParkSense QR. Confirm the person matches the pass before admitting.'
              : 'You’re offline. Reconnect before scanning — passes cannot be verified without Firebase.'}
          </Text>
        </View>
        <View style={styles.frameWrap} pointerEvents="none">
          <View style={styles.frame} />
        </View>
        <View style={styles.footer}>
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={torch ? 'Turn torch off' : 'Turn torch on'}
              onPress={() => setTorch((value) => !value)}
              style={styles.chip}
            >
              <Ionicons name={torch ? 'flash' : 'flash-outline'} size={16} color={colors.white} />
              <Text style={styles.chipText}>{torch ? 'Torch on' : 'Torch'}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enter pass token"
              onPress={() => setManualOpen(true)}
              style={styles.chip}
            >
              <Ionicons name="keypad-outline" size={16} color={colors.white} />
              <Text style={styles.chipText}>Type code</Text>
            </Pressable>
          </View>
        </View>
      </View>
      {manualModal()}
    </View>
  );
}
