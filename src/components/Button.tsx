import * as Haptics from 'expo-haptics';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radius, shadow } from '../config/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

type Props = PressableProps & {
  title: string;
  loading?: boolean;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  loading,
  variant = 'primary',
  disabled,
  style,
  onPress,
  ...rest
}: Props) {
  const inverted = variant === 'primary' || variant === 'danger';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      disabled={disabled || loading}
      onPress={(event) => {
        void Haptics.selectionAsync().catch(() => undefined);
        onPress?.(event);
      }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        inverted ? shadow.clay : shadow.soft,
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

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
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
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.92 },
  label: { color: colors.white, fontSize: 16, fontWeight: '700' },
  labelDark: { color: colors.primaryDark },
  labelGhost: { color: colors.text },
});
