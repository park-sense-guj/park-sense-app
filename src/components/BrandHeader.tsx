import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from './Avatar';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  initials?: string;
  compact?: boolean;
  photoUrl?: string | null;
  alertsBadge?: number;
  onAlertsPress?: () => void;
  onProfilePress?: () => void;
};

function BrandHeaderComponent({
  initials = 'P',
  compact = false,
  photoUrl,
  alertsBadge = 0,
  onAlertsPress,
  onProfilePress,
}: Props) {
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
        },
        rowCompact: {
          marginBottom: 8,
        },
        brand: {
          fontSize: 22,
          fontWeight: '800',
          color: colors.text,
          letterSpacing: -0.4,
        },
        brandAccent: { color: colors.primary },
        actions: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        },
        bell: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: colors.border,
        },
        avatarBtn: {
          borderRadius: 20,
        },
        badge: {
          position: 'absolute',
          top: -2,
          right: -2,
          minWidth: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: colors.occupied,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 4,
          borderWidth: 2,
          borderColor: colors.background,
        },
        badgeText: { color: colors.white, fontSize: 9, fontWeight: '800' },
      }),
    [colors],
  );

  const avatar = <Avatar initials={initials} photoUrl={photoUrl} size={40} />;

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <Text style={styles.brand} accessibilityRole="header">
        Park<Text style={styles.brandAccent}>Sense</Text>
      </Text>
      <View style={styles.actions}>
        {onAlertsPress ? (
          <Pressable
            onPress={onAlertsPress}
            accessibilityRole="button"
            accessibilityLabel={
              alertsBadge > 0 ? `Alerts, ${alertsBadge} unread` : 'Alerts'
            }
            style={({ pressed }) => [styles.bell, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="notifications-outline" size={18} color={colors.primaryDark} />
            {alertsBadge > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{alertsBadge > 9 ? '9+' : String(alertsBadge)}</Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
        {onProfilePress ? (
          <Pressable
            onPress={onProfilePress}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            style={({ pressed }) => [styles.avatarBtn, pressed && { opacity: 0.85 }]}
          >
            {avatar}
          </Pressable>
        ) : (
          avatar
        )}
      </View>
    </View>
  );
}

export const BrandHeader = memo(BrandHeaderComponent);
