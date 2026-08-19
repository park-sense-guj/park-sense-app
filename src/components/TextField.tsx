import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { hitSlop, radius } from '../config/theme';
import { useTheme } from '../theme/ThemeProvider';

type Props = TextInputProps & {
  label: string;
  error?: string;
  required?: boolean;
};

export function TextField({
  label,
  error,
  required,
  secureTextEntry,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));
  const showToggle = Boolean(secureTextEntry);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { marginBottom: 14 },
        label: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 6 },
        required: { color: colors.occupied },
        inputWrap: {
          backgroundColor: colors.backgroundAlt,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          borderRadius: radius.md,
          height: 52,
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: 14,
          paddingRight: showToggle ? 4 : 14,
        },
        input: {
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: 0,
          minWidth: 0,
          height: 52,
          fontSize: 16,
          color: colors.text,
          paddingVertical: 0,
          includeFontPadding: false,
        },
        inputError: { borderColor: colors.occupied, backgroundColor: colors.occupiedSoft },
        eye: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
        error: { color: colors.occupied, marginTop: 6, fontSize: 13, fontWeight: '600' },
      }),
    [colors, showToggle],
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <View style={[styles.inputWrap, error ? styles.inputError : null]}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={hidden}
          underlineColorAndroid="transparent"
          accessibilityLabel={label}
          {...rest}
        />
        {showToggle ? (
          <Pressable
            onPress={() => setHidden((value) => !value)}
            hitSlop={hitSlop}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            style={styles.eye}
          >
            <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
