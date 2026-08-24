import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Button } from '../../components/Button';
import { GlassCard } from '../../components/GlassCard';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { useParkingSlots } from '../../hooks/useParkingSlots';
import type { UserStackParamList } from '../../navigation/types';
import { playErrorFeedback, playSuccessFeedback } from '../../services/feedbackService';
import { readableNetworkError } from '../../services/networkService';
import {
  ensureHoldPass,
  formatHoldCountdown,
  holdIsLive,
  releaseHold,
} from '../../services/parkingHoldService';
import { encodePassQr, formatPassId } from '../../services/parkingPassService';
import { useAuthStore } from '../../store/authStore';
import { useConnectivityStore } from '../../store/connectivityStore';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<UserStackParamList, 'ArrivalPass'>;

export function ArrivalPassScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const { slot: routeSlot } = route.params;
  const isOnline = useConnectivityStore((state) => state.isOnline);
  const profile = useAuthStore((state) => state.profile);
  const { slots, now } = useParkingSlots();
  const [tick, setTick] = useState(() => Date.now());
  const [releasing, setReleasing] = useState(false);
  const ensureAttempted = useRef(false);

  const slot = useMemo(
    () => slots.find((item) => item.slotId === routeSlot.slotId) ?? routeSlot,
    [slots, routeSlot],
  );
  const mine = holdIsLive(slot, now) && slot.heldByUserId === profile?.userId;
  const expired = Boolean(slot.heldUntil) && (slot.heldUntil ?? 0) <= tick;
  const token = slot.holdToken;
  const checkIn = slot.holdCheckIn;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: { flex: 1, gap: 14, paddingBottom: 12 },
        lede: { color: colors.textMuted, lineHeight: 20, marginTop: -4 },
        qrCard: { alignItems: 'center', paddingVertical: 22, paddingHorizontal: 16, gap: 12 },
        qrFrame: {
          padding: 16,
          borderRadius: 20,
          backgroundColor: '#FFFFFF',
        },
        slotTitle: {
          fontSize: 22,
          fontWeight: '800',
          color: colors.text,
          letterSpacing: -0.4,
        },
        slotMeta: { fontSize: 13, fontWeight: '600', color: colors.textMuted, textAlign: 'center' },
        timer: {
          fontSize: 28,
          fontWeight: '800',
          color: expired ? colors.occupied : colors.primaryDark,
          letterSpacing: -0.6,
        },
        passId: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 1.4 },
        hint: { color: colors.textMuted, fontSize: 13, fontWeight: '500', lineHeight: 19, textAlign: 'center' },
        actions: { gap: 8, marginTop: 'auto' },
        fallback: { alignItems: 'center', gap: 8, paddingVertical: 28 },
      }),
    [colors, expired],
  );

  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!profile || !mine || token || ensureAttempted.current || !isOnline) {
      return;
    }
    ensureAttempted.current = true;
    void ensureHoldPass(profile.userId, profile.fullName, slot.slotId, {
      email: profile.email,
      photoUrl: profile.photoUrl,
    }).catch((error) => {
      ensureAttempted.current = false;
      playErrorFeedback();
      Alert.alert(
        'Could not create QR',
        readableNetworkError(error, 'Go back and hold the bay again.'),
      );
    });
  }, [profile, mine, token, isOnline, slot.slotId]);

  function onEndHold() {
    if (!profile) {
      return;
    }
    Alert.alert('End this hold?', `This will release ${slot.slotNumber} and invalidate the QR code.`, [
      { text: 'Keep pass', style: 'cancel' },
      {
        text: 'End hold',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setReleasing(true);
            try {
              await releaseHold(profile.userId, slot.slotId);
              playSuccessFeedback();
              navigation.goBack();
            } catch (error) {
              playErrorFeedback();
              Alert.alert('Could not end hold', readableNetworkError(error, 'Try again in a moment.'));
            } finally {
              setReleasing(false);
            }
          })();
        },
      },
    ]);
  }

  const badge =
    checkIn === 'admitted'
      ? { label: 'Admitted', tone: 'available' as const }
      : !mine || expired
        ? { label: 'Expired', tone: 'occupied' as const }
        : { label: 'Show at reception', tone: 'info' as const };

  return (
    <Screen>
      <View style={styles.content}>
        <Text style={styles.lede}>
          Reception scans this code to confirm you held {slot.slotNumber}. Keep the screen bright
          and the code fully visible.
        </Text>

        <GlassCard style={styles.qrCard}>
          <StatusBadge label={badge.label} tone={badge.tone} />
          <Text style={styles.slotTitle}>{slot.slotNumber}</Text>
          <Text style={styles.slotMeta}>{slot.locationName}</Text>
          {mine && token && !expired ? (
            <View style={styles.qrFrame} accessibilityLabel="Arrival QR code">
              <QRCode
                value={encodePassQr(token)}
                size={220}
                backgroundColor="#FFFFFF"
                color="#0F172A"
              />
            </View>
          ) : (
            <View style={styles.fallback}>
              <Text style={styles.timer}>{expired || !mine ? 'Pass ended' : 'Preparing QR…'}</Text>
              <Text style={styles.hint}>
                {expired || !mine
                  ? 'Hold the bay again from Home to get a new arrival code.'
                  : 'Creating a secure pass for reception.'}
              </Text>
            </View>
          )}
          {mine && !expired && slot.heldUntil ? (
            <Text style={styles.timer}>{formatHoldCountdown(slot.heldUntil, tick)}</Text>
          ) : null}
          {token ? <Text style={styles.passId}>PASS {formatPassId(token)}</Text> : null}
          <Text style={styles.hint}>
            {checkIn === 'admitted'
              ? 'Reception already confirmed you. Park and cover the IR sensor.'
              : 'Do not screenshot an old code. Reception only accepts the live QR on this screen.'}
          </Text>
        </GlassCard>

        <View style={styles.actions}>
          <Button
            title="Get directions"
            onPress={() => navigation.navigate('Navigate', { slot })}
            disabled={!mine}
          />
          <Button
            title="End hold"
            variant="danger"
            loading={releasing}
            disabled={!isOnline || !mine}
            onPress={onEndHold}
          />
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button">
            <Text style={[styles.hint, { marginTop: 4 }]}>Back to map</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
