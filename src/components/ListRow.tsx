import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  trailing?: string;
  chevron?: boolean;
  destructive?: boolean;
  onPress?: () => void;
};

export function ListRow({
  icon,
  title,
  subtitle,
  trailing,
  chevron = true,
  destructive,
  onPress,
}: Props) {
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 12,
          minHeight: 56,
        },
        iconWrap: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        },
        iconDanger: { backgroundColor: colors.occupiedSoft },
        copy: { flex: 1 },
        title: { fontSize: 16, fontWeight: '700', color: colors.text },
        subtitle: { marginTop: 2, fontSize: 13, color: colors.textMuted, lineHeight: 18 },
        trailing: { color: colors.textMuted, fontWeight: '600', marginRight: 4 },
        dangerText: { color: colors.occupied },
        pressed: { opacity: 0.72 },
      }),
    [colors],
  );

  const content = (
    <View style={styles.row}>
      <View style={[styles.iconWrap, destructive && styles.iconDanger]}>
        <Ionicons name={icon} size={18} color={destructive ? colors.occupied : colors.primary} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, destructive && styles.dangerText]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ? <Text style={styles.trailing}>{trailing}</Text> : null}
      {chevron && onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      ) : null}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}
