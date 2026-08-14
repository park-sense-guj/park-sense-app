import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlobBackground } from '../../components/BlobBackground';
import { Button } from '../../components/Button';
import { GlassCard } from '../../components/GlassCard';
import { TextField } from '../../components/TextField';
import { colors, spacing } from '../../config/theme';
import type { AuthStackParamList } from '../../navigation/types';
import { registerUser, setSessionPassword } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const unlockBiometric = useAuthStore((state) => state.unlockBiometric);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ fullName: '', email: '', password: '' });
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setFormError('');
    const next = {
      fullName: fullName.trim().length < 2 ? 'Enter your full name.' : '',
      email: email.includes('@') ? '' : 'Enter a valid email address.',
      password: password.length >= 6 ? '' : 'Password must be at least 6 characters.',
    };
    setErrors(next);
    if (next.fullName || next.email || next.password) {
      return;
    }
    setLoading(true);
    try {
      await registerUser({ fullName, email, password, contactNo });
      setSessionPassword(password);
      unlockBiometric();
    } catch (err) {
      setFormError(err instanceof Error ? readableRegisterError(err.message) : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <BlobBackground />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.brand}>
            Park<Text style={styles.accent}>Sense</Text>
          </Text>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.lede}>Drivers and admins use the same form. Required fields are marked with *.</Text>
          <GlassCard style={styles.card}>
            <TextField
              label="Full name"
              required
              value={fullName}
              onChangeText={(value) => {
                setFullName(value);
                setErrors((current) => ({ ...current, fullName: '' }));
              }}
              autoCapitalize="words"
              textContentType="name"
              autoComplete="name"
              placeholder="Muhammad Ali"
              error={errors.fullName}
            />
            <TextField
              label="Email"
              required
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setErrors((current) => ({ ...current, email: '' }));
              }}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              placeholder="you@email.com"
              error={errors.email}
            />
            <TextField
              label="Contact number"
              value={contactNo}
              onChangeText={setContactNo}
              keyboardType="phone-pad"
              autoCapitalize="none"
              textContentType="telephoneNumber"
              placeholder="Optional"
            />
            <TextField
              label="Password"
              required
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setErrors((current) => ({ ...current, password: '' }));
              }}
              secureTextEntry
              autoComplete="password-new"
              textContentType="newPassword"
              placeholder="At least 6 characters"
              error={errors.password}
            />
            {formError ? <Text style={styles.error}>{formError}</Text> : null}
            <Button title="Sign up" onPress={() => void onSubmit()} loading={loading} />
            <Button title="Back to login" variant="ghost" onPress={() => navigation.goBack()} style={styles.secondary} />
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function readableRegisterError(message: string): string {
  if (message.includes('email-already-in-use')) {
    return 'That email is already registered. Try logging in.';
  }
  if (message.includes('invalid-email')) {
    return 'That email address is not valid.';
  }
  if (message.includes('weak-password')) {
    return 'Choose a stronger password (at least 6 characters).';
  }
  return 'Could not create the account. Try again.';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  brand: { fontSize: 20, fontWeight: '800', color: colors.text },
  accent: { color: colors.primary },
  title: { marginTop: 18, fontSize: 32, fontWeight: '800', color: colors.text, letterSpacing: -0.6 },
  lede: { marginTop: 8, marginBottom: spacing.lg, color: colors.textMuted, lineHeight: 20 },
  card: { padding: 20 },
  error: { color: colors.occupied, marginBottom: 12, fontWeight: '600' },
  secondary: { marginTop: 10 },
});
