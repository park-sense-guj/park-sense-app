import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, subtitle, icon = 'leaf-outline', actionLabel, onAction }: Props) {
  const { colors, typography } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { padding: 28, alignItems: 'center' },
        iconWrap: {
          width: 56,
          height: 56,
          borderRadius: 18,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
        },
        title: { textAlign: 'center' },
        subtitle: { marginTop: 8, textAlign: 'center', maxWidth: 280 },
        action: { marginTop: 18, minWidth: 180 },
      }),
    [colors],
  );

  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={[typography.heading, styles.title]}>{title}</Text>
      {subtitle ? <Text style={[typography.caption, styles.subtitle]}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}
