import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import { spacing } from '../../config/theme';
import type { AuthStackParamList } from '../../navigation/types';
import { loginUser, setSessionPassword } from '../../services/authService';
import {
  authenticateWithBiometrics,
  enableBiometrics,
  getBiometricLabel,
  getStoredCredentials,
  isBiometricAvailable,
  isBiometricEnabled,
} from '../../services/biometricService';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const unlockBiometric = useAuthStore((state) => state.unlockBiometric);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background },
        flex: { flex: 1 },
        content: { flexGrow: 1, paddingHorizontal: spacing.lg, justifyContent: 'center' },
        hero: { alignItems: 'center', marginBottom: 28 },
        ripple: {
          position: 'absolute',
          width: 180,
          height: 180,
          borderRadius: 90,
          borderWidth: 1,
          borderColor: colors.border,
        },
        logo: {
          width: 76,
          height: 76,
          borderRadius: 24,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        },
        logoMark: { color: colors.white, fontSize: 32, fontWeight: '800' },
        brand: { marginTop: 14, fontSize: 30, fontWeight: '800', color: colors.text },
        accent: { color: colors.primary },
        tag: { marginTop: 6, fontSize: 11, letterSpacing: 1.4, fontWeight: '700', color: colors.textMuted },
        card: { padding: 20 },
        heading: { fontSize: 20, fontWeight: '800', color: colors.text },
        hint: { marginTop: 4, marginBottom: 16, color: colors.textMuted },
        error: { color: colors.occupied, marginBottom: 12, fontWeight: '600' },
        secondary: { marginTop: 10 },
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
      unlockBiometric();
      await maybeOfferBiometrics(nextEmail, nextPassword);
    } catch (err) {
      setFormError(err instanceof Error ? readableAuthError(err.message) : 'Login failed.');
    } finally {
      setLoading(false);
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

  return (
    <View style={styles.root}>
      <BlobBackground />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 36, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <View style={styles.ripple} />
            <View style={styles.logo}>
              <Text style={styles.logoMark}>P</Text>
            </View>
            <Text style={styles.brand}>
              Park<Text style={styles.accent}>Sense</Text>
            </Text>
            <Text style={styles.tag}>SMART PARKING · LIVE STATUS</Text>
          </View>

          <GlassCard style={styles.card}>
            <Text style={styles.heading}>Welcome back</Text>
            <Text style={styles.hint}>Log in to see open slots around you.</Text>
            <TextField
              label="Email"
              required
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
              required
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setPasswordError('');
              }}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              placeholder="••••••••"
              error={passwordError}
            />
            {formError ? <Text style={styles.error}>{formError}</Text> : null}
            <Button title="Log in" onPress={() => void submitWithPassword(email, password)} loading={loading} />
            {biometricLabel ? (
              <Button
                title={`Sign in with ${biometricLabel}`}
                variant="secondary"
                onPress={() => void onBiometricLogin()}
                style={styles.secondary}
                accessibilityHint={`Uses ${biometricLabel} instead of typing your password`}
              />
            ) : null}
            <Button
              title="Create an account"
              variant="ghost"
              onPress={() => navigation.navigate('Register')}
              style={styles.secondary}
            />
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

async function maybeOfferBiometrics(email: string, password: string) {
  const available = await isBiometricAvailable();
  const enabled = await isBiometricEnabled();
  if (!available || enabled) {
    return;
  }
  const label = await getBiometricLabel();
  Alert.alert(`Turn on ${label}?`, `Unlock ParkSense with ${label} next time instead of typing your password.`, [
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
