import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';

import { Avatar, initialsFromName } from '../../components/Avatar';
import { BrandHeader } from '../../components/BrandHeader';
import { Button } from '../../components/Button';
import { ListRow } from '../../components/ListRow';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import type { ThemePreference } from '../../config/theme';
import {
  getSessionPassword,
  updateFullName,
  updateUserEmail,
  updateUserPhoto,
} from '../../services/authService';
import {
  authenticateWithBiometrics,
  disableBiometrics,
  enableBiometrics,
  getBiometricLabel,
  getStoredCredentials,
  isBiometricAvailable,
  isBiometricEnabled,
} from '../../services/biometricService';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';

const APPEARANCE_OPTIONS: { value: ThemePreference; title: string; subtitle: string; icon: 'phone-portrait-outline' | 'sunny-outline' | 'moon-outline' }[] = [
  { value: 'system', title: 'System', subtitle: 'Match device light or dark mode', icon: 'phone-portrait-outline' },
  { value: 'light', title: 'Light', subtitle: 'Always use light theme', icon: 'sunny-outline' },
  { value: 'dark', title: 'Dark', subtitle: 'Always use dark theme', icon: 'moon-outline' },
];

export function ProfileScreen() {
  const { colors, preference, setPreference } = useTheme();
  const profile = useAuthStore((state) => state.profile);
  const signOut = useAuthStore((state) => state.signOut);
  const [biometricOn, setBiometricOn] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometrics');
  const [hardware, setHardware] = useState(false);
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const initials = initialsFromName(profile?.fullName);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        flex: { flex: 1 },
        scroll: { paddingBottom: 12 },
        title: { fontSize: 32, fontWeight: '800', color: colors.text, letterSpacing: -0.6 },
        subtitle: { marginTop: 6, marginBottom: 8, color: colors.textMuted },
        photoBlock: { alignItems: 'center', marginTop: 18, marginBottom: 8, gap: 10 },
        photoHint: { color: colors.primaryDark, fontWeight: '700' },
        section: {
          marginTop: 22,
          marginBottom: 4,
          fontSize: 12,
          fontWeight: '800',
          letterSpacing: 1,
          color: colors.textMuted,
        },
      }),
    [colors],
  );

  const nameDirty = fullName.trim() !== (profile?.fullName ?? '');
  const emailDirty = email.trim().toLowerCase() !== (profile?.email ?? '');
  const dirty = nameDirty || emailDirty;

  useEffect(() => {
    setFullName(profile?.fullName ?? '');
    setEmail(profile?.email ?? '');
  }, [profile?.fullName, profile?.email]);

  useEffect(() => {
    void (async () => {
      setHardware(await isBiometricAvailable());
      setBiometricOn(await isBiometricEnabled());
      setBiometricLabel(await getBiometricLabel());
    })();
  }, []);

  async function toggleBiometrics() {
    if (!hardware) {
      Alert.alert(
        `${biometricLabel} unavailable`,
        'Set up Face ID, Touch ID, or a fingerprint in device settings first.',
      );
      return;
    }
    if (biometricOn) {
      Alert.alert(`Turn off ${biometricLabel}?`, "You'll need your password the next time you sign in.", [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Turn off',
          style: 'destructive',
          onPress: () => {
            void disableBiometrics().then(() => setBiometricOn(false));
          },
        },
      ]);
      return;
    }
    const sessionPassword = getSessionPassword();
    if (!sessionPassword || !profile?.email) {
      Alert.alert(
        `Enable ${biometricLabel} after login`,
        'Sign out, then log in with your password. ParkSense will ask to enable biometrics while your password is still in this session.',
      );
      return;
    }
    const ok = await authenticateWithBiometrics(`Enable ${biometricLabel} for ParkSense`);
    if (!ok) {
      return;
    }
    await enableBiometrics(profile.email, sessionPassword);
    setBiometricOn(true);
    Alert.alert(`${biometricLabel} on`, `You can unlock ParkSense with ${biometricLabel} next time.`);
  }

  function confirmSignOut() {
    Alert.alert('Log out of ParkSense?', 'You can sign back in with email or biometrics.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  async function saveProfile() {
    if (!profile) {
      return;
    }
    setSaving(true);
    try {
      if (nameDirty) {
        await updateFullName(profile.userId, fullName);
      }
      if (emailDirty) {
        await updateUserEmail(profile.userId, email, password);
        const stored = await getStoredCredentials();
        if (stored) {
          await enableBiometrics(email.trim().toLowerCase(), stored.password);
        }
        setPassword('');
      }
      Alert.alert('Profile updated', 'Your account details were saved.');
    } catch (error) {
      Alert.alert('Could not update profile', readableProfileError(error));
    } finally {
      setSaving(false);
    }
  }

  function choosePhoto() {
    Alert.alert('Profile photo', 'Choose a photo for your ParkSense account.', [
      { text: 'Take photo', onPress: () => void pickPhoto('camera') },
      { text: 'Photo library', onPress: () => void pickPhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function pickPhoto(source: 'camera' | 'library') {
    if (!profile) {
      return;
    }
    setPhotoBusy(true);
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission needed',
          source === 'camera'
            ? 'Allow camera access to take a profile photo.'
            : 'Allow photo access to set a profile picture.',
        );
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.4,
              base64: true,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.4,
              base64: true,
            });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      const photoUrl = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      await updateUserPhoto(profile.userId, photoUrl);
    } catch (error) {
      Alert.alert('Could not update photo', readableProfileError(error));
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <BrandHeader initials={initials} photoUrl={profile?.photoUrl} />
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Update your name, email, and photo.</Text>

          <Pressable
            onPress={choosePhoto}
            disabled={photoBusy}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            style={styles.photoBlock}
          >
            <Avatar initials={initials} photoUrl={profile?.photoUrl} size={96} />
            <Text style={styles.photoHint}>{photoBusy ? 'Saving photo…' : 'Tap to change photo'}</Text>
          </Pressable>

          <Text style={styles.section}>ACCOUNT</Text>
          <TextField
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            autoCorrect={false}
          />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {emailDirty ? (
            <TextField
              label="Current password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Required to change email"
            />
          ) : null}
          <Button title="Save changes" loading={saving} disabled={!dirty} onPress={() => void saveProfile()} />

          <Text style={styles.section}>APPEARANCE</Text>
          {APPEARANCE_OPTIONS.map((option) => (
            <ListRow
              key={option.value}
              icon={option.icon}
              title={option.title}
              subtitle={option.subtitle}
              trailing={preference === option.value ? 'Selected' : undefined}
              chevron={false}
              onPress={() => void setPreference(option.value)}
            />
          ))}

          <Text style={styles.section}>SECURITY</Text>
          <ListRow
            icon={biometricLabel.includes('Face') ? 'scan-outline' : 'finger-print-outline'}
            title={`${biometricLabel} sign-in`}
            subtitle={
              hardware
                ? `Unlock ParkSense with ${biometricLabel} on this device.`
                : 'Not set up on this device yet.'
            }
            trailing={biometricOn ? 'On' : 'Off'}
            onPress={() => void toggleBiometrics()}
          />

          <Text style={styles.section}>SESSION</Text>
          <ListRow
            icon="log-out-outline"
            title="Log out"
            subtitle="Sign out of this device"
            destructive
            onPress={confirmSignOut}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function readableProfileError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Try again.';
  if (message.includes('invalid-credential') || message.includes('wrong-password')) {
    return 'Current password is incorrect.';
  }
  if (message.includes('email-already-in-use')) {
    return 'That email is already used by another account.';
  }
  if (message.includes('requires-recent-login')) {
    return 'Enter your current password, then try again.';
  }
  if (message.includes('invalid-email')) {
    return 'Enter a valid email address.';
  }
  return message;
}
