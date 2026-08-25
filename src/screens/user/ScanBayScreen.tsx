import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { useParkingSlots } from '../../hooks/useParkingSlots';
import type { UserStackParamList } from '../../navigation/types';
import { playErrorFeedback, playSelectionFeedback, playSuccessFeedback } from '../../services/feedbackService';
import { readableNetworkError } from '../../services/networkService';
import { resolveScannedBay } from '../../services/parkingBayQrService';
import { checkInAtBay } from '../../services/parkingHoldService';
import { useAuthStore } from '../../store/authStore';
import { useConnectivityStore } from '../../store/connectivityStore';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<UserStackParamList, 'ScanBay'>;

export function ScanBayScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const expected = route.params.slot;
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const isOnline = useConnectivityStore((state) => state.isOnline);
  const profile = useAuthStore((state) => state.profile);
  const { slots } = useParkingSlots();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [manualError, setManualError] = useState('');
  const [checking, setChecking] = useState(false);
  const lock = useRef(false);

  const liveExpected = slots.find((item) => item.slotId === expected.slotId) ?? expected;
  const alreadyIn =
    liveExpected.holdCheckIn === 'admitted' && liveExpected.heldByUserId === profile?.userId;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        flex: { flex: 1 },
        camera: { ...StyleSheet.absoluteFill },
        overlay: {
          ...StyleSheet.absoluteFill,
          justifyContent: 'space-between',
          paddingTop: insets.top + 16,
          paddingBottom: Math.max(insets.bottom, 16) + 24,
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

  function finishCheckIn(slotNumber: string) {
    playSuccessFeedback();
    Alert.alert(
      'Checked in',
      `${slotNumber} is yours. Cover the IR sensor to start your session.`,
      [{ text: 'OK', onPress: () => navigation.navigate('Navigate', { slot: liveExpected }) }],
    );
  }

  async function handleScan(raw: string) {
    if (lock.current || checking || !profile) {
      return;
    }
    const bay = resolveScannedBay(raw, slots.length > 0 ? slots : [liveExpected]);
    if (!bay) {
      lock.current = true;
      playErrorFeedback();
      Alert.alert(
        'Not a ParkSense bay',
        'Point the camera at the printed QR on this stall. You can also type the code if the sticker is damaged.',
        [{ text: 'OK', onPress: () => { lock.current = false; } }],
      );
      return;
    }
    if (!isOnline) {
      lock.current = true;
      playErrorFeedback();
      Alert.alert('You’re offline', 'Reconnect to check in at this bay.', [
        { text: 'OK', onPress: () => { lock.current = false; } },
      ]);
      return;
    }

    lock.current = true;
    setChecking(true);
    playSelectionFeedback();
    try {
      const checked = await checkInAtBay(
        profile.userId,
        profile.fullName,
        bay.slotId,
        liveExpected.slotId,
      );
      finishCheckIn(checked.slotNumber);
    } catch (error) {
      playErrorFeedback();
      Alert.alert('Could not check in', readableNetworkError(error, 'Try scanning again.'));
      lock.current = false;
    } finally {
      setChecking(false);
    }
  }

  function submitManual() {
    setManualError('');
    const bay = resolveScannedBay(manualValue, slots.length > 0 ? slots : [liveExpected]);
    if (!bay) {
      setManualError('Enter the bay code printed under the QR, such as parksense:bay:slot-a-01.');
      return;
    }
    setManualOpen(false);
    setManualValue('');
    void handleScan(bay.slotId);
  }

  function manualModal() {
    return (
      <Modal visible={manualOpen} transparent animationType="slide" onRequestClose={() => setManualOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <Pressable style={styles.modalRoot} onPress={() => setManualOpen(false)}>
            <Pressable style={styles.modalCard} onPress={() => undefined}>
              <Text style={styles.modalTitle}>Enter bay code</Text>
              <Text style={styles.modalHint}>
                Type the payload printed under the sticker, or the stall number (for example A-01).
              </Text>
              <TextField
                label="Bay code"
                value={manualValue}
                onChangeText={(value) => {
                  setManualValue(value);
                  setManualError('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                error={manualError}
                placeholder="parksense:bay:slot-a-01"
              />
              <Button title="Check in" onPress={submitManual} />
              <Button title="Cancel" variant="secondary" onPress={() => setManualOpen(false)} />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    );
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
            ParkSense needs the camera to scan the QR on bay {liveExpected.slotNumber}. You can
            also type the code if the camera is unavailable.
          </Text>
          <Button title="Allow camera" onPress={() => void requestPermission()} />
          <Button title="Type bay code" variant="secondary" onPress={() => setManualOpen(true)} />
        </View>
        {manualModal()}
      </Screen>
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
          onBarcodeScanned={({ data }) => void handleScan(data)}
        />
      ) : (
        <View style={[styles.camera, { backgroundColor: '#0B1412' }]} />
      )}
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.copy}>
          <Text style={styles.title}>Scan {liveExpected.slotNumber}</Text>
          <Text style={styles.subtitle}>
            {alreadyIn
              ? 'You’re already checked in here. Cover the IR sensor when you park.'
              : isOnline
                ? `Point the camera at the printed QR on stall ${liveExpected.slotNumber}.`
                : 'You’re offline. Reconnect before scanning — check-in needs Firebase.'}
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
              accessibilityLabel="Enter bay code"
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
