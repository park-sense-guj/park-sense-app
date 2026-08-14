import { BlurView } from 'expo-blur';
import { type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadow } from '../config/theme';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
};

export function GlassCard({ children, style, intensity = 28 }: Props) {
  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={intensity} tint="light" style={[styles.card, shadow.card, style]}>
        {children}
      </BlurView>
    );
  }

  return <View style={[styles.card, styles.android, shadow.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
    padding: 16,
  },
  android: {
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
});
