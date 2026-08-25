import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Button } from '../../components/Button';
import { GlassCard } from '../../components/GlassCard';
import { Screen } from '../../components/Screen';
import type { AdminStackParamList } from '../../navigation/types';
import { encodeBayQr } from '../../services/parkingBayQrService';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<AdminStackParamList, 'BayQr'>;

export function AdminBayQrScreen({ route }: Props) {
  const { colors } = useTheme();
  const { slot } = route.params;
  const payload = encodeBayQr(slot.slotId);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: { flex: 1, gap: 14, paddingBottom: 16 },
        lede: { color: colors.textMuted, lineHeight: 20, marginTop: -4 },
        card: { alignItems: 'center', paddingVertical: 22, paddingHorizontal: 16, gap: 12 },
        qrFrame: {
          padding: 16,
          borderRadius: 20,
          backgroundColor: '#FFFFFF',
        },
        slotTitle: {
          fontSize: 28,
          fontWeight: '800',
          color: colors.text,
          letterSpacing: -0.5,
        },
        slotMeta: { fontSize: 13, fontWeight: '600', color: colors.textMuted, textAlign: 'center' },
        payload: {
          fontSize: 12,
          fontWeight: '700',
          color: colors.textMuted,
          letterSpacing: 0.2,
          textAlign: 'center',
        },
        hint: {
          color: colors.textMuted,
          fontSize: 13,
          fontWeight: '500',
          lineHeight: 19,
          textAlign: 'center',
        },
        actions: { gap: 8, marginTop: 'auto' },
      }),
    [colors],
  );

  async function onShare() {
    try {
      await Share.share({
        title: `${slot.slotNumber} bay QR`,
        message: `${slot.slotNumber}\n${payload}`,
      });
    } catch {
      Alert.alert('Could not share', 'Screenshot this screen and print the QR for the stall instead.');
    }
  }

  return (
    <Screen>
      <View style={styles.content}>
        <Text style={styles.lede}>
          Print this code once and stick it on stall {slot.slotNumber}. Drivers scan it to check in.
          The payload never changes.
        </Text>
        <GlassCard style={styles.card}>
          <Text style={styles.slotTitle}>{slot.slotNumber}</Text>
          <Text style={styles.slotMeta}>{slot.locationName}</Text>
          <View style={styles.qrFrame} accessibilityLabel={`${slot.slotNumber} bay QR code`}>
            <QRCode value={payload} size={220} backgroundColor="#FFFFFF" color="#0F172A" />
          </View>
          <Text style={styles.payload} selectable>
            {payload}
          </Text>
          <Text style={styles.hint}>
            Screenshot or share this screen, then print it. A damaged sticker can still be typed as
            this exact string.
          </Text>
        </GlassCard>
        <View style={styles.actions}>
          <Button title="Share / print" onPress={() => void onShare()} />
        </View>
      </View>
    </Screen>
  );
}
