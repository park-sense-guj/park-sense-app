import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '../../components/BrandHeader';
import { EmptyState } from '../../components/EmptyState';
import { GlassCard } from '../../components/GlassCard';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { initialsFromName } from '../../components/Avatar';
import { groupArrivalPasses, useParkingPasses } from '../../hooks/useParkingPasses';
import { useNotifications } from '../../hooks/useNotifications';
import { useParkingSlots } from '../../hooks/useParkingSlots';
import type { ReceptionistStackParamList, ReceptionistTabParamList } from '../../navigation/types';
import { formatHoldRemaining, holdIsLive } from '../../services/parkingHoldService';
import { formatPassId } from '../../services/parkingPassService';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';
import type { ParkingPass } from '../../types';

type TabNav = {
  navigate: (screen: keyof ReceptionistTabParamList) => void;
};

export function ReceptionistArrivalsScreen() {
  const { colors } = useTheme();
  const stackNavigation = useNavigation<NativeStackNavigationProp<ReceptionistStackParamList>>();
  const tabNavigation = useNavigation() as unknown as TabNav;
  const profile = useAuthStore((state) => state.profile);
  const { unreadCount } = useNotifications(profile?.userId);
  const { passes, loading, error } = useParkingPasses();
  const { slots, now } = useParkingSlots();
  const groups = useMemo(() => groupArrivalPasses(passes, slots, now), [passes, slots, now]);
  const initials = initialsFromName(profile?.fullName ?? 'R');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        flex: { flex: 1 },
        content: { paddingBottom: 28, gap: 14 },
        greeting: { fontSize: 16, color: colors.textMuted },
        name: {
          fontSize: 32,
          fontWeight: '800',
          color: colors.text,
          letterSpacing: -0.7,
          marginTop: 2,
        },
        lede: { marginTop: 6, marginBottom: 8, color: colors.textMuted, lineHeight: 20 },
        section: { fontSize: 12, fontWeight: '800', letterSpacing: 0.7, color: colors.textMuted },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 4,
        },
        copy: { flex: 1, minWidth: 0, gap: 2 },
        title: { fontSize: 16, fontWeight: '800', color: colors.text },
        meta: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
        error: { color: colors.occupied, fontWeight: '700' },
      }),
    [colors],
  );

  function openPass(pass: ParkingPass) {
    stackNavigation.navigate('PassDetail', { token: pass.token });
  }

  function passMeta(pass: ParkingPass): string {
    const slot = slots.find((item) => item.slotId === pass.slotId);
    const until = slot?.heldUntil ?? pass.expiresAt;
    const live = slot ? holdIsLive(slot, now) && slot.heldByUserId === pass.userId : false;
    if (live) {
      return `${pass.slotNumber} · ${formatHoldRemaining(until, now)}`;
    }
    if (pass.status === 'admitted') {
      return `${pass.slotNumber} · admitted`;
    }
    if (pass.status === 'consumed') {
      return `${pass.slotNumber} · parked`;
    }
    if (pass.status === 'denied') {
      return `${pass.slotNumber} · denied`;
    }
    return `${pass.slotNumber} · ${pass.status}`;
  }

  function renderPass(pass: ParkingPass, badge: { label: string; tone: 'info' | 'available' | 'warning' | 'occupied' | 'neutral' }) {
    return (
      <GlassCard key={pass.token}>
        <Pressable
          onPress={() => openPass(pass)}
          accessibilityRole="button"
          accessibilityLabel={`Open pass for ${pass.userName}`}
          style={styles.row}
        >
          <View style={styles.copy}>
            <Text style={styles.title}>{pass.userName}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {passMeta(pass)} · {formatPassId(pass.token)}
            </Text>
          </View>
          <StatusBadge label={badge.label} tone={badge.tone} />
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>
      </GlassCard>
    );
  }

  const empty =
    !loading &&
    groups.incoming.length === 0 &&
    groups.waiting.length === 0 &&
    groups.attention.length === 0 &&
    groups.recent.length === 0;

  return (
    <Screen>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BrandHeader
          initials={initials}
          photoUrl={profile?.photoUrl}
          alertsBadge={unreadCount}
          onAlertsPress={() => stackNavigation.navigate('Alerts')}
          onProfilePress={() => tabNavigation.navigate('ProfileTab')}
        />
        <Text style={styles.greeting}>Reception</Text>
        <Text style={styles.name}>{profile?.fullName ?? 'Receptionist'}</Text>
        <Text style={styles.lede}>
          Incoming holds, drivers waiting to park, and passes that need a second look.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {empty ? (
          <EmptyState
            icon="qr-code-outline"
            title="No arrivals yet"
            subtitle="When a driver holds a bay, their pass appears here. Scan their QR on the Scan tab to verify them."
            actionLabel="Open scanner"
            onAction={() => tabNavigation.navigate('ScanTab')}
          />
        ) : null}

        {groups.incoming.length > 0 ? (
          <>
            <Text style={styles.section}>INCOMING HOLDS</Text>
            {groups.incoming.map((pass) => renderPass(pass, { label: 'Waiting', tone: 'info' }))}
          </>
        ) : null}
        {groups.waiting.length > 0 ? (
          <>
            <Text style={styles.section}>ADMITTED</Text>
            {groups.waiting.map((pass) => renderPass(pass, { label: 'Admitted', tone: 'available' }))}
          </>
        ) : null}
        {groups.attention.length > 0 ? (
          <>
            <Text style={styles.section}>NEEDS ATTENTION</Text>
            {groups.attention.map((pass) =>
              renderPass(pass, {
                label: pass.status === 'consumed' ? 'Unchecked' : 'Expired',
                tone: 'warning',
              }),
            )}
          </>
        ) : null}
        {groups.recent.length > 0 ? (
          <>
            <Text style={styles.section}>RECENT</Text>
            {groups.recent.map((pass) =>
              renderPass(pass, {
                label:
                  pass.status === 'denied'
                    ? 'Denied'
                    : pass.status === 'consumed'
                      ? 'Parked'
                      : 'Done',
                tone: pass.status === 'denied' ? 'occupied' : 'neutral',
              }),
            )}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
