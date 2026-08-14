import { memo, type ReactNode, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius } from '../config/theme';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Kept for call-site compatibility; blur is disabled for smoother scrolling. */
  intensity?: number;
};

function GlassCardComponent({ children, style }: Props) {
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          borderRadius: radius.lg,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.glassBorder,
          backgroundColor: colors.cardSolid,
          padding: 16,
        },
      }),
    [colors],
  );

  return <View style={[styles.card, style]}>{children}</View>;
}

export const GlassCard = memo(GlassCardComponent);
