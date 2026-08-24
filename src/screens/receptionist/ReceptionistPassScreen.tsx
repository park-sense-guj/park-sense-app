import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';

import { PassVerdictCard } from '../../components/PassVerdictCard';
import { Screen } from '../../components/Screen';
import { useParkingPasses } from '../../hooks/useParkingPasses';
import { useParkingSlots } from '../../hooks/useParkingSlots';
import type { ReceptionistStackParamList } from '../../navigation/types';
import { playErrorFeedback, playSuccessFeedback } from '../../services/feedbackService';
import { readableNetworkError } from '../../services/networkService';
import {
  admitPass,
  denyPass,
  evaluatePass,
  inspectPass,
  type PassVerdict,
} from '../../services/parkingPassService';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<ReceptionistStackParamList, 'PassDetail'>;

export function ReceptionistPassScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const { token } = route.params;
  const profile = useAuthStore((state) => state.profile);
  const { passes } = useParkingPasses();
  const { slots, now } = useParkingSlots();
  const [fetched, setFetched] = useState<PassVerdict | null>(null);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);

  const livePass = passes.find((item) => item.token === token) ?? fetched?.pass ?? null;
  const liveSlot = livePass
    ? (slots.find((item) => item.slotId === livePass.slotId) ?? fetched?.slot ?? null)
    : (fetched?.slot ?? null);
  const verdict = livePass ? evaluatePass(livePass, liveSlot, now) : fetched;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: { paddingBottom: 28, gap: 12 },
        error: { color: colors.occupied, fontWeight: '700', lineHeight: 20 },
      }),
    [colors],
  );

  useEffect(() => {
    let active = true;
    void inspectPass(token)
      .then((next) => {
        if (active) {
          setFetched(next);
          setLoadError('');
        }
      })
      .catch((error) => {
        if (active) {
          setLoadError(readableNetworkError(error, 'Could not verify this pass.'));
        }
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function onAdmit() {
    if (!profile || !verdict?.pass) {
      return;
    }
    setBusy(true);
    try {
      const next = await admitPass(verdict.pass.token, profile);
      setFetched(next);
      playSuccessFeedback();
    } catch (error) {
      playErrorFeedback();
      Alert.alert('Could not admit', readableNetworkError(error, 'Scan again and retry.'));
    } finally {
      setBusy(false);
    }
  }

  function onDeny() {
    if (!profile || !verdict?.pass) {
      return;
    }
    Alert.alert(
      'Deny this arrival?',
      'The hold will be released and this QR will no longer work.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deny',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusy(true);
              try {
                const next = await denyPass(verdict.pass!.token, profile);
                setFetched(next);
                playSuccessFeedback();
              } catch (error) {
                playErrorFeedback();
                Alert.alert('Could not deny', readableNetworkError(error, 'Try again in a moment.'));
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loadError && !verdict ? <Text style={styles.error}>{loadError}</Text> : null}
        {verdict ? (
          <PassVerdictCard
            verdict={verdict}
            now={now}
            busy={busy}
            onAdmit={() => void onAdmit()}
            onDeny={onDeny}
            onScanAgain={() => navigation.navigate('ReceptionistTabs', { screen: 'ScanTab' })}
          />
        ) : (
          <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Checking this pass…</Text>
        )}
      </ScrollView>
    </Screen>
  );
}
