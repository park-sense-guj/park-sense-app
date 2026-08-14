import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AuthDivider,
  AuthFooterLink,
  AuthShell,
  BiometricSignInButton,
  GoogleSignInButton,
} from '../../components/AuthShell';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import type { AuthStackParamList } from '../../navigation/types';
import { loginUser, sendPasswordReset, setSessionPassword } from '../../services/authService';
import {
  authenticateWithBiometrics,
  enableBiometrics,
  getBiometricLabel,
  getStoredCredentials,
  isBiometricAvailable,
  isBiometricEnabled,
} from '../../services/biometricService';
import {
  isGoogleSignInConfigured,
  readableGoogleSignInError,
  signInWithGoogle,
} from '../../services/googleAuthService';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState<string | null>(null);
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
        forgotRow: { alignItems: 'flex-end', marginTop: -4, marginBottom: 10 },
        forgot: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
        primaryGap: { marginTop: 4 },
      }),
    [colors],
  );

  useEffect(() => {
    void (async () => {
      const available = await isBiometricAvailable();
      const stored = await getStoredCredentials();
      if (available && stored) {
        setBiometricLabel(await getBiometricLabel());
        setEmail(stored.email);
      }
    })();
  }, []);

  async function submitWithPassword(nextEmail: string, nextPassword: string) {
    setFormError('');
    const nextEmailError = nextEmail.includes('@') ? '' : 'Enter a valid email address.';
    const nextPasswordError = nextPassword.length >= 6 ? '' : 'Password must be at least 6 characters.';
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) {
      return;
    }
    setLoading(true);
    try {
      await loginUser(nextEmail, nextPassword);
      setSessionPassword(nextPassword);
      await maybeOfferBiometrics(nextEmail, nextPassword);
    } catch (err) {
      setFormError(err instanceof Error ? readableAuthError(err.message) : 'Login failed.');
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

  async function onBiometricLogin() {
    const stored = await getStoredCredentials();
    if (!stored || !biometricLabel) {
      return;
    }
    const ok = await authenticateWithBiometrics(`Sign in to ParkSense with ${biometricLabel}`);
    if (!ok) {
      setFormError(`${biometricLabel} was cancelled.`);
      return;
    }
    await submitWithPassword(stored.email, stored.password);
  }

  async function onForgotPassword() {
    setFormError('');
    const nextEmailError = email.includes('@') ? '' : 'Enter your email above to reset your password.';
    setEmailError(nextEmailError);
    if (nextEmailError) {
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordReset(email);
      Alert.alert(
        'Check your email',
        `If an account exists for ${email.trim().toLowerCase()}, we sent a password reset link.`,
      );
    } catch (err) {
      setFormError(err instanceof Error ? readableAuthError(err.message) : 'Could not send reset email.');
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <AuthShell
      variant="login"
      title="Welcome back"
      subtitle="Sign in to see live parking availability near you."
      footer={
        <AuthFooterLink
          prompt="New to ParkSense?"
          action="Create an account"
          onPress={() => navigation.navigate('Register')}
        />
      }
    >
      <TextField
        label="Email"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setEmailError('');
        }}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        placeholder="you@email.com"
        error={emailError}
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setPasswordError('');
        }}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        placeholder="Your password"
        error={passwordError}
      />
      <View style={styles.forgotRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Forgot password"
          disabled={resetLoading || loading || googleLoading}
          onPress={() => void onForgotPassword()}
        >
          <Text style={styles.forgot}>{resetLoading ? 'Sending…' : 'Forgot password?'}</Text>
        </Pressable>
      </View>
      {formError ? (
        <View style={styles.errorBox}>
          <Text style={styles.error}>{formError}</Text>
        </View>
      ) : null}
      <Button
        title="Log in"
        onPress={() => void submitWithPassword(email, password)}
        loading={loading}
        disabled={googleLoading || resetLoading}
        style={styles.primaryGap}
      />

      <AuthDivider />

      {googleReady ? (
        <GoogleSignInButton
          loading={googleLoading}
          disabled={loading}
          onPress={() => void onGoogleSignIn()}
        />
      ) : (
        <View style={styles.errorBox}>
          <Text style={styles.error}>Google Sign-In needs EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env.</Text>
        </View>
      )}

      {biometricLabel ? (
        <BiometricSignInButton
          label={biometricLabel}
          disabled={loading || googleLoading}
          onPress={() => void onBiometricLogin()}
        />
      ) : null}
    </AuthShell>
  );
}

async function maybeOfferBiometrics(email: string, password: string) {
  const available = await isBiometricAvailable();
  const enabled = await isBiometricEnabled();
  if (!available || enabled) {
    return;
  }
  const label = await getBiometricLabel();
  Alert.alert(`Turn on ${label}?`, `Use ${label} next time you sign in, instead of typing your password.`, [
    { text: 'Not now', style: 'cancel' },
    {
      text: `Enable ${label}`,
      onPress: () => {
        void (async () => {
          const ok = await authenticateWithBiometrics(`Enable ${label} for ParkSense`);
          if (ok) {
            await enableBiometrics(email, password);
          }
        })();
      },
    },
  ]);
}

function readableAuthError(message: string): string {
  if (message.includes('invalid-credential') || message.includes('wrong-password')) {
    return 'Email or password is incorrect.';
  }
  if (message.includes('user-not-found')) {
    return 'No account exists for that email.';
  }
  if (message.includes('too-many-requests')) {
    return 'Too many attempts. Try again later.';
  }
  return 'Login failed. Check your details and try again.';
}
