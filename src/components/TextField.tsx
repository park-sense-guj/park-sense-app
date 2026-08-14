import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, hitSlop, radius } from '../config/theme';

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
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));
  const showToggle = Boolean(secureTextEntry);

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
          secureTextEntry={hidden}
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

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  required: { color: colors.occupied },
  inputWrap: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    minHeight: 52,
    paddingVertical: 12,
  },
  inputError: { borderColor: colors.occupied, backgroundColor: colors.occupiedSoft },
  eye: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.occupied, marginTop: 6, fontSize: 13, fontWeight: '600' },
});
