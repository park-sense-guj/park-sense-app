import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  AuthDivider,
  AuthFooterLink,
  AuthShell,
  GoogleSignInButton,
} from '../../components/AuthShell';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import type { AuthStackParamList } from '../../navigation/types';
import { registerUser, setSessionPassword } from '../../services/authService';
import {
  isGoogleSignInConfigured,
  readableGoogleSignInError,
  signInWithGoogle,
} from '../../services/googleAuthService';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ fullName: '', email: '', password: '' });
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleReady = isGoogleSignInConfigured();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        errorBox: {
          backgroundColor: colors.occupiedSoft,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          marginBottom: 12,
        },
        error: { color: colors.occupied, fontWeight: '600', fontSize: 13, lineHeight: 18 },
        primaryGap: { marginTop: 4 },
      }),
    [colors],
  );

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
    } catch (err) {
      setFormError(err instanceof Error ? readableRegisterError(err.message) : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleSignIn() {
    setFormError('');
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result === 'cancelled') {
        return;
      }
    } catch (error) {
      setFormError(readableGoogleSignInError(error));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <AuthShell
      variant="register"
      title="Create account"
      subtitle="Join ParkSense to find open slots and get notified when one frees up."
      footer={
        <AuthFooterLink
          prompt="Already have an account?"
          action="Log in"
          onPress={() => navigation.goBack()}
        />
      }
    >
      <TextField
        label="Full name"
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
      {formError ? (
        <View style={styles.errorBox}>
          <Text style={styles.error}>{formError}</Text>
        </View>
      ) : null}
      <Button
        title="Create account"
        onPress={() => void onSubmit()}
        loading={loading}
        disabled={googleLoading}
        style={styles.primaryGap}
      />

      <AuthDivider />

      {googleReady ? (
        <GoogleSignInButton
          loading={googleLoading}
          disabled={loading}
          label="Continue with Google"
          onPress={() => void onGoogleSignIn()}
        />
      ) : null}
    </AuthShell>
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
