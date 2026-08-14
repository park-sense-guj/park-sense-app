import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from './Avatar';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  initials?: string;
  compact?: boolean;
  photoUrl?: string | null;
};

export function BrandHeader({ initials = 'P', compact = false, photoUrl }: Props) {
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
      }),
    [colors],
  );

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <Text style={styles.brand} accessibilityRole="header">
        Park<Text style={styles.brandAccent}>Sense</Text>
      </Text>
      <Avatar initials={initials} photoUrl={photoUrl} size={40} />
    </View>
  );
}
