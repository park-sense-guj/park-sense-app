import { BlurView } from 'expo-blur';
import { type ReactNode, useMemo } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius } from '../config/theme';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
};

export function GlassCard({ children, style, intensity = 28 }: Props) {
  const { colors, isDark, shadow } = useTheme();
  const tint = isDark ? 'dark' : 'light';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          borderRadius: radius.lg,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.glassBorder,
          backgroundColor: colors.glass,
          padding: 16,
        },
        android: {
          backgroundColor: colors.cardSolid,
        },
      }),
    [colors],
  );

  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={intensity} tint={tint} style={[styles.card, shadow.card, style]}>
        {children}
      </BlurView>
    );
  }

  return <View style={[styles.card, styles.android, shadow.card, style]}>{children}</View>;
}
