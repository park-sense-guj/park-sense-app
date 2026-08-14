import { memo, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { radius } from '../config/theme';
import { playSelectionFeedback } from '../services/feedbackService';
import { useTheme } from '../theme/ThemeProvider';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

type Props = PressableProps & {
  title: string;
  loading?: boolean;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
};

function ButtonComponent({
  title,
  loading,
  variant = 'primary',
  disabled,
  style,
  onPress,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const inverted = variant === 'primary' || variant === 'danger';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        base: {
          minHeight: 52,
          width: '100%',
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 18,
        },
        primary: { backgroundColor: colors.primary },
        secondary: {
          backgroundColor: colors.primarySoft,
          borderWidth: 1,
          borderColor: colors.border,
        },
        danger: { backgroundColor: colors.occupied },
        ghost: {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.borderStrong,
        },
        disabled: { opacity: 0.5 },
        pressed: { opacity: 0.88 },
        label: { color: colors.white, fontSize: 16, fontWeight: '700' },
        labelDark: { color: colors.primaryDark },
        labelGhost: { color: colors.text },
      }),
    [colors],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      disabled={disabled || loading}
      onPress={(event) => {
        if (variant === 'primary' || variant === 'danger') {
          playSelectionFeedback();
        }
        onPress?.(event);
      }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={inverted ? colors.white : colors.primary} />
      ) : (
        <Text
          style={[styles.label, !inverted && styles.labelDark, variant === 'ghost' && styles.labelGhost]}
          maxFontSizeMultiplier={1.3}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export const Button = memo(ButtonComponent);
