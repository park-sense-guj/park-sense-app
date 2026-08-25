import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Avatar, initialsFromName } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { GlassCard } from '../../components/GlassCard';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { radius } from '../../config/theme';
import type { ThemePreference } from '../../config/theme';
import {
  ABOUT_SHEETS,
  getAppVersionLabel,
  type AboutSheetId,
} from '../../content/aboutContent';
import {
  confirmCurrentPassword,
  deleteUserAccount,
  getSessionPassword,
  updateFullName,
  updateUserEmail,
  updateUserPhoto,
} from '../../services/authService';
import {
  authenticateWithBiometrics,
  disableBiometrics,
  displayBiometricLabel,
  enableBiometrics,
  getBiometricLabel,
  getStoredCredentials,
  isBiometricAvailable,
  isBiometricEnabled,
} from '../../services/biometricService';
import { playSelectionFeedback } from '../../services/feedbackService';
import { pickProfilePhoto, type PhotoSource } from '../../services/photoService';
import { useAuthStore } from '../../store/authStore';
import { usePreferencesStore } from '../../store/preferencesStore';
import { useTheme } from '../../theme/ThemeProvider';

const APPEARANCE_OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
];

type AccountSheet = 'name' | 'email' | null;

export function ProfileScreen() {
  const { colors, preference, setPreference } = useTheme();
  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const signOut = useAuthStore((state) => state.signOut);
  const hapticsEnabled = usePreferencesStore((state) => state.hapticsEnabled);
  const soundCuesEnabled = usePreferencesStore((state) => state.soundCuesEnabled);
  const setHapticsEnabled = usePreferencesStore((state) => state.setHapticsEnabled);
  const setSoundCuesEnabled = usePreferencesStore((state) => state.setSoundCuesEnabled);
  const isGoogleAccount = Boolean(
    firebaseUser?.providerData.some((provider) => provider.providerId === 'google.com'),
  );
  const [biometricOn, setBiometricOn] = useState(false);
  const [biometricLabelRaw, setBiometricLabel] = useState('Biometric');
  const biometricLabel = displayBiometricLabel(biometricLabelRaw);
  const [hardware, setHardware] = useState(false);
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoSheet, setPhotoSheet] = useState(false);
  const [accountSheet, setAccountSheet] = useState<AccountSheet>(null);
  const [aboutSheet, setAboutSheet] = useState<AboutSheetId | null>(null);
  const [passwordModal, setPasswordModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const isAdmin = profile?.role === 'admin';
  const roleLabel = profile?.role === 'admin' ? 'Admin' : 'Driver';
  const initials = initialsFromName(profile?.fullName);
  const nameDirty = fullName.trim() !== (profile?.fullName ?? '');
  const emailDirty = email.trim().toLowerCase() !== (profile?.email ?? '');
  const appVersionLabel = getAppVersionLabel();
  const activeAbout = ABOUT_SHEETS.find((sheet) => sheet.id === aboutSheet) ?? null;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        flex: { flex: 1 },
        scroll: { paddingBottom: 24, gap: 10 },
        pageTitle: {
          fontSize: 24,
          fontWeight: '800',
          color: colors.text,
          letterSpacing: -0.5,
          marginBottom: 2,
        },
        hero: {
          alignItems: 'center',
          paddingVertical: 14,
          paddingHorizontal: 14,
          gap: 4,
        },
        compactCard: {
          paddingVertical: 12,
          paddingHorizontal: 12,
        },
        avatarWrap: { position: 'relative', marginBottom: 2 },
        cameraBadge: {
          position: 'absolute',
          right: -2,
          bottom: -2,
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: colors.cardSolid,
        },
        heroName: {
          fontSize: 18,
          fontWeight: '800',
          color: colors.text,
          letterSpacing: -0.3,
          textAlign: 'center',
        },
        heroEmail: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
        photoHint: { marginTop: 2, fontSize: 12, fontWeight: '600', color: colors.primaryDark },
        cardTitle: {
          fontSize: 11,
          fontWeight: '800',
          letterSpacing: 0.7,
          color: colors.textMuted,
          marginBottom: 2,
        },
        infoRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingVertical: 8,
        },
        infoIcon: {
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        },
        infoCopy: { flex: 1, minWidth: 0 },
        infoLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.2 },
        infoValue: { marginTop: 1, fontSize: 14, fontWeight: '700', color: colors.text },
        infoValueMuted: { color: colors.textMuted },
        infoHint: { marginTop: 2, fontSize: 11, color: colors.textMuted, lineHeight: 14 },
        infoDivider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border,
          marginLeft: 44,
        },
        rowDisabled: { opacity: 0.72 },
        appearanceRow: {
          flexDirection: 'row',
          gap: 3,
          backgroundColor: colors.primaryMuted,
          borderRadius: radius.pill,
          padding: 2,
          marginTop: 6,
        },
        appearanceItem: {
          flex: 1,
          minHeight: 34,
          borderRadius: radius.pill,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          paddingHorizontal: 8,
        },
        appearanceItemActive: {
          backgroundColor: colors.cardSolid,
        },
        appearanceLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
        appearanceLabelActive: { color: colors.primaryDark, fontWeight: '700' },
        toggle: {
          minWidth: 40,
          paddingHorizontal: 8,
          paddingVertical: 5,
          borderRadius: radius.pill,
          backgroundColor: colors.primaryMuted,
          alignItems: 'center',
        },
        toggleOn: { backgroundColor: colors.primary },
        toggleText: { fontSize: 10, fontWeight: '800', color: colors.primaryDark },
        toggleTextOn: { color: colors.white },
        toggleDisabled: { backgroundColor: colors.border },
        toggleTextDisabled: { color: colors.textMuted },
        statusMeta: {
          fontSize: 13,
          fontWeight: '600',
          color: colors.primary,
        },
        aboutSheetCard: {
          backgroundColor: colors.cardSolid,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          padding: 20,
          paddingBottom: 28,
          borderWidth: 1,
          borderColor: colors.glassBorder,
          maxHeight: '88%',
        },
        aboutScroll: { marginTop: 4, marginBottom: 12 },
        aboutSection: { marginBottom: 14 },
        aboutHeading: {
          fontSize: 14,
          fontWeight: '800',
          color: colors.text,
          marginBottom: 4,
        },
        aboutBody: {
          fontSize: 13,
          lineHeight: 19,
          color: colors.textMuted,
        },
        modalRoot: {
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: 'flex-end',
        },
        modalCard: {
          backgroundColor: colors.cardSolid,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          padding: 20,
          paddingBottom: 28,
          borderWidth: 1,
          borderColor: colors.glassBorder,
        },
        modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
        modalHint: { marginTop: 6, marginBottom: 16, color: colors.textMuted, lineHeight: 20 },
        modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
        modalBtn: { flex: 1 },
        photoOption: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          minHeight: 56,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.input,
          paddingHorizontal: 14,
          marginBottom: 10,
        },
        photoOptionIcon: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        },
        photoOptionText: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
        sessionFooter: {
          marginTop: 8,
          marginBottom: 8,
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 8,
        },
        deleteLink: {
          paddingVertical: 10,
          paddingHorizontal: 16,
        },
        deleteLinkText: {
          fontSize: 15,
          fontWeight: '700',
          color: colors.occupied,
          textAlign: 'center',
        },
        deleteHint: {
          fontSize: 12,
          lineHeight: 17,
          color: colors.textMuted,
          textAlign: 'center',
          maxWidth: 280,
        },
      }),
    [colors],
  );

  useEffect(() => {
    setFullName(profile?.fullName ?? '');
    setEmail(profile?.email ?? '');
  }, [profile?.fullName, profile?.email]);

  useEffect(() => {
    void (async () => {
      setHardware(await isBiometricAvailable());
      setBiometricLabel(await getBiometricLabel());
      if (isGoogleAccount) {
        const enabled = await isBiometricEnabled();
        if (enabled) {
          await disableBiometrics();
        }
        setBiometricOn(false);
        return;
      }
      setBiometricOn(await isBiometricEnabled());
    })();
  }, [isGoogleAccount]);

  function openAccountSheet(sheet: Exclude<AccountSheet, null>) {
    if (sheet === 'email' && isGoogleAccount) {
      Alert.alert(
        'Email managed by Google',
        'This account signed in with Google. Update the email in your Google account settings instead.',
      );
      return;
    }
    setFullName(profile?.fullName ?? '');
    setEmail(profile?.email ?? '');
    setPassword('');
    setAccountSheet(sheet);
  }

  function closeAccountSheet() {
    if (saving) {
      return;
    }
    setAccountSheet(null);
    setPassword('');
    setFullName(profile?.fullName ?? '');
    setEmail(profile?.email ?? '');
  }

  async function saveAccountSheet() {
    if (!profile) {
      return;
    }
    setSaving(true);
    try {
      if (accountSheet === 'name') {
        await updateFullName(profile.userId, fullName);
      }
      if (accountSheet === 'email') {
        if (isGoogleAccount) {
          throw new Error('Email is managed by Google for this account.');
        }
        await updateUserEmail(profile.userId, email, password);
        const stored = await getStoredCredentials();
        if (stored) {
          await enableBiometrics(email.trim().toLowerCase(), stored.password);
        }
        setPassword('');
      }
      setAccountSheet(null);
      Alert.alert('Profile updated', 'Your account details were saved.');
    } catch (error) {
      Alert.alert('Could not update profile', readableProfileError(error));
    } finally {
      setSaving(false);
    }
  }

  async function toggleBiometrics() {
    if (isGoogleAccount) {
      Alert.alert(
        `${biometricLabel} unavailable`,
        `${biometricLabel} is only for email and password accounts.`,
      );
      return;
    }
    if (!hardware) {
      Alert.alert(
        `${biometricLabel} unavailable`,
        Platform.OS === 'ios'
          ? 'Set up Face ID or Touch ID in Settings first.'
          : 'Set up a fingerprint or face unlock in device settings first.',
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
    if (sessionPassword && profile?.email) {
      await finishEnableBiometrics(sessionPassword);
      return;
    }
    setConfirmPassword('');
    setConfirmError('');
    setPasswordModal(true);
  }

  async function finishEnableBiometrics(passwordValue: string) {
    if (!profile?.email) {
      return;
    }
    setPasswordModal(false);
    setConfirmPassword('');
    await new Promise((resolve) => setTimeout(resolve, 350));
    const ok = await authenticateWithBiometrics(`Enable ${biometricLabel} for ParkSense`);
    if (!ok) {
      return;
    }
    await enableBiometrics(profile.email, passwordValue);
    setBiometricOn(true);
    Alert.alert(`${biometricLabel} on`, `You can sign in with ${biometricLabel} next time after you log out.`);
  }

  async function submitEnablePassword() {
    setConfirmError('');
    setConfirmBusy(true);
    try {
      await confirmCurrentPassword(confirmPassword);
    } catch (error) {
      setConfirmError(readableProfileError(error));
      setConfirmBusy(false);
      return;
    }
    try {
      await finishEnableBiometrics(confirmPassword);
    } catch (error) {
      Alert.alert(`Could not enable ${biometricLabel}`, readableProfileError(error));
    } finally {
      setConfirmBusy(false);
    }
  }

  function confirmSignOut() {
    Alert.alert('Log out of ParkSense?', 'You can sign back in with email or biometrics.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  function openDeleteAccount() {
    setDeleteError('');
    setDeletePassword('');
    if (isGoogleAccount) {
      Alert.alert(
        'Delete account?',
        'This permanently removes your ParkSense profile, parking history, and alerts. You’ll confirm with Google next.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            style: 'destructive',
            onPress: () => void runDeleteAccount(),
          },
        ],
      );
      return;
    }
    setDeleteModal(true);
  }

  async function runDeleteAccount(password?: string) {
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await deleteUserAccount(isGoogleAccount ? undefined : { password });
      setDeleteModal(false);
      Alert.alert('Account deleted', 'Your ParkSense account has been removed.');
    } catch (error) {
      const message = readableProfileError(error);
      if (isGoogleAccount) {
        Alert.alert('Could not delete account', message);
      } else {
        setDeleteError(message);
      }
    } finally {
      setDeleteBusy(false);
    }
  }

  function choosePhoto() {
    if (photoBusy) {
      return;
    }
    setPhotoSheet(true);
  }

  async function onPickPhoto(source: PhotoSource) {
    if (!profile || photoBusy) {
      return;
    }
    setPhotoSheet(false);
    try {
      const photoUrl = await pickProfilePhoto(source);
      if (!photoUrl) {
        return;
      }
      setPhotoBusy(true);
      await updateUserPhoto(profile.userId, photoUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (
        message.includes('native module') ||
        message.includes('ExpoImagePicker') ||
        message.includes('ExpoImageManipulator')
      ) {
        Alert.alert(
          'Rebuild required',
          'Photo tools need a native rebuild. Run expo run:ios or expo run:android, then try again.',
        );
        return;
      }
      Alert.alert('Could not update photo', readableProfileError(error));
    } finally {
      setPhotoBusy(false);
    }
  }

  const accountSaveDisabled =
    accountSheet === 'name' ? !nameDirty || fullName.trim().length < 2 : !emailDirty || password.length < 6;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={styles.pageTitle}>Profile</Text>

          <GlassCard style={styles.hero}>
            <Pressable
              onPress={choosePhoto}
              disabled={photoBusy}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              style={styles.avatarWrap}
            >
              <Avatar initials={initials} photoUrl={profile?.photoUrl} size={80} />
              <View style={styles.cameraBadge}>
                <Ionicons name={photoBusy ? 'hourglass-outline' : 'camera'} size={14} color={colors.white} />
              </View>
            </Pressable>
            <Text style={styles.heroName}>{profile?.fullName ?? 'ParkSense User'}</Text>
            <Text style={styles.heroEmail}>{profile?.email ?? ''}</Text>
            {isAdmin ? (
              <Text style={styles.photoHint}>{roleLabel}</Text>
            ) : null}
            {photoBusy ? <Text style={styles.photoHint}>Saving photo…</Text> : null}
          </GlassCard>

          <GlassCard style={styles.compactCard}>
            <Text style={styles.cardTitle}>ACCOUNT</Text>
            <Pressable
              onPress={() => openAccountSheet('name')}
              accessibilityRole="button"
              accessibilityLabel="Edit full name"
              style={styles.infoRow}
            >
              <View style={styles.infoIcon}>
                <Ionicons name="person-outline" size={17} color={colors.primary} />
              </View>
              <View style={styles.infoCopy}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {profile?.fullName || 'Add your name'}
                </Text>
              </View>
              <Ionicons name="pencil-outline" size={14} color={colors.textMuted} />
            </Pressable>
            <View style={styles.infoDivider} />
            <Pressable
              onPress={() => openAccountSheet('email')}
              accessibilityRole="button"
              accessibilityLabel={isGoogleAccount ? 'Email managed by Google' : 'Edit email'}
              accessibilityState={{ disabled: isGoogleAccount }}
              style={[styles.infoRow, isGoogleAccount && styles.rowDisabled]}
            >
              <View style={styles.infoIcon}>
                <Ionicons name="mail-outline" size={17} color={colors.primary} />
              </View>
              <View style={styles.infoCopy}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text
                  style={[styles.infoValue, isGoogleAccount && styles.infoValueMuted]}
                  numberOfLines={1}
                >
                  {profile?.email || 'Add your email'}
                </Text>
                {isGoogleAccount ? (
                  <Text style={styles.infoHint}>Managed by Google</Text>
                ) : null}
              </View>
              <Ionicons
                name={isGoogleAccount ? 'lock-closed-outline' : 'pencil-outline'}
                size={14}
                color={colors.textMuted}
              />
            </Pressable>
          </GlassCard>

          <GlassCard style={styles.compactCard}>
            <Text style={styles.cardTitle}>APPEARANCE</Text>
            <View style={styles.appearanceRow}>
              {APPEARANCE_OPTIONS.map((option) => {
                const active = preference === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={option.label}
                    onPress={() => void setPreference(option.value)}
                    style={[styles.appearanceItem, active && styles.appearanceItemActive]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={14}
                      color={active ? colors.primaryDark : colors.textMuted}
                    />
                    <Text style={[styles.appearanceLabel, active && styles.appearanceLabelActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>

          <GlassCard style={styles.compactCard}>
            <Text style={styles.cardTitle}>FEEDBACK</Text>
            <Pressable
              onPress={() => {
                playSelectionFeedback();
                void setHapticsEnabled(!hapticsEnabled);
              }}
              accessibilityRole="button"
              accessibilityLabel="Haptics"
              accessibilityState={{ checked: hapticsEnabled }}
              style={styles.infoRow}
            >
              <View style={styles.infoIcon}>
                <Ionicons name="phone-portrait-outline" size={17} color={colors.primary} />
              </View>
              <View style={styles.infoCopy}>
                <Text style={styles.infoValue}>Haptics</Text>
                <Text style={styles.infoHint}>
                  Light taps on key actions like parking and leaving a slot.
                </Text>
              </View>
              <Text style={styles.statusMeta}>{hapticsEnabled ? 'On' : 'Off'}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </Pressable>
            <View style={styles.infoDivider} />
            <Pressable
              onPress={() => {
                playSelectionFeedback();
                void setSoundCuesEnabled(!soundCuesEnabled);
              }}
              accessibilityRole="button"
              accessibilityLabel="Sound cues"
              accessibilityState={{ checked: soundCuesEnabled }}
              style={styles.infoRow}
            >
              <View style={styles.infoIcon}>
                <Ionicons name="volume-medium-outline" size={17} color={colors.primary} />
              </View>
              <View style={styles.infoCopy}>
                <Text style={styles.infoValue}>Sound cues</Text>
                <Text style={styles.infoHint}>
                  Success and error confirmation cues. Turn off for a quieter experience.
                </Text>
              </View>
              <Text style={styles.statusMeta}>{soundCuesEnabled ? 'On' : 'Off'}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </Pressable>
          </GlassCard>

          <GlassCard style={styles.compactCard}>
            <Text style={styles.cardTitle}>ABOUT</Text>
            {!isAdmin
              ? ABOUT_SHEETS.map((sheet, index) => (
                  <View key={sheet.id}>
                    {index > 0 ? <View style={styles.infoDivider} /> : null}
                    <Pressable
                      onPress={() => setAboutSheet(sheet.id)}
                      accessibilityRole="button"
                      accessibilityLabel={sheet.title}
                      style={styles.infoRow}
                    >
                      <View style={styles.infoIcon}>
                        <Ionicons name={sheet.icon} size={17} color={colors.primary} />
                      </View>
                      <View style={styles.infoCopy}>
                        <Text style={styles.infoValue}>{sheet.title}</Text>
                        <Text style={styles.infoHint}>{sheet.subtitle}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                    </Pressable>
                  </View>
                ))
              : null}
            {!isAdmin ? <View style={styles.infoDivider} /> : null}
            <View style={styles.infoRow} accessibilityLabel={`App version ${appVersionLabel}`}>
              <View style={styles.infoIcon}>
                <Ionicons name="information-circle-outline" size={17} color={colors.primary} />
              </View>
              <View style={styles.infoCopy}>
                <Text style={styles.infoValue}>App Version</Text>
                <Text style={styles.infoHint}>{appVersionLabel}</Text>
              </View>
            </View>
          </GlassCard>

          <GlassCard style={styles.compactCard}>
            <Text style={styles.cardTitle}>SECURITY</Text>
            <Pressable
              onPress={() => void toggleBiometrics()}
              accessibilityRole="button"
              accessibilityLabel={`${biometricLabel} sign-in`}
              accessibilityState={{ disabled: isGoogleAccount }}
              style={[styles.infoRow, isGoogleAccount && styles.rowDisabled]}
            >
              <View style={styles.infoIcon}>
                <Ionicons
                  name={biometricLabel.includes('Face') ? 'scan-outline' : 'finger-print-outline'}
                  size={17}
                  color={colors.primary}
                />
              </View>
              <View style={styles.infoCopy}>
                <Text style={styles.infoValue}>{biometricLabel}</Text>
                <Text style={styles.infoHint}>
                  {isGoogleAccount
                    ? 'Unavailable for Google accounts'
                    : hardware
                      ? 'Faster sign-in after logout'
                      : 'Not available on this device'}
                </Text>
              </View>
              <View
                style={[
                  styles.toggle,
                  biometricOn && !isGoogleAccount && styles.toggleOn,
                  isGoogleAccount && styles.toggleDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.toggleText,
                    biometricOn && !isGoogleAccount && styles.toggleTextOn,
                    isGoogleAccount && styles.toggleTextDisabled,
                  ]}
                >
                  {isGoogleAccount ? 'N/A' : biometricOn ? 'On' : 'Off'}
                </Text>
              </View>
            </Pressable>
          </GlassCard>

          <GlassCard style={styles.compactCard}>
            <Text style={styles.cardTitle}>SESSION</Text>
            <Pressable
              onPress={confirmSignOut}
              accessibilityRole="button"
              accessibilityLabel="Log out"
              style={styles.infoRow}
            >
              <View style={styles.infoIcon}>
                <Ionicons name="log-out-outline" size={17} color={colors.primary} />
              </View>
              <View style={styles.infoCopy}>
                <Text style={styles.infoValue}>Log out</Text>
                <Text style={styles.infoHint}>Sign out of this device</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </Pressable>
          </GlassCard>

          <View style={styles.sessionFooter}>
            <Pressable
              onPress={openDeleteAccount}
              accessibilityRole="button"
              accessibilityLabel="Delete account"
              disabled={deleteBusy}
              style={styles.deleteLink}
            >
              <Text style={styles.deleteLinkText}>
                {deleteBusy ? 'Deleting…' : 'Delete account'}
              </Text>
            </Pressable>
            <Text style={styles.deleteHint}>
              Permanently removes your profile, parking history, and alerts.
            </Text>
          </View>
        </ScrollView>

      <Modal
        visible={aboutSheet !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setAboutSheet(null)}
      >
        <Pressable style={styles.modalRoot} onPress={() => setAboutSheet(null)}>
          <Pressable style={styles.aboutSheetCard} onPress={() => undefined}>
            <Text style={styles.modalTitle}>{activeAbout?.title ?? 'About'}</Text>
            <Text style={styles.modalHint}>{activeAbout?.subtitle}</Text>
            <ScrollView
              style={styles.aboutScroll}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {activeAbout?.sections.map((section) => (
                <View key={`${activeAbout.id}-${section.heading ?? section.body}`} style={styles.aboutSection}>
                  {section.heading ? (
                    <Text style={styles.aboutHeading}>{section.heading}</Text>
                  ) : null}
                  <Text style={styles.aboutBody}>{section.body}</Text>
                </View>
              ))}
            </ScrollView>
            <Button title="Done" variant="secondary" onPress={() => setAboutSheet(null)} />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={photoSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setPhotoSheet(false)}
      >
        <Pressable style={styles.modalRoot} onPress={() => setPhotoSheet(false)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <Text style={styles.modalTitle}>Profile photo</Text>
            <Text style={styles.modalHint}>Choose how you want to update your picture.</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Take photo"
              style={styles.photoOption}
              onPress={() => void onPickPhoto('camera')}
            >
              <View style={styles.photoOptionIcon}>
                <Ionicons name="camera-outline" size={20} color={colors.primary} />
              </View>
              <Text style={styles.photoOptionText}>Take photo</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose from gallery"
              style={styles.photoOption}
              onPress={() => void onPickPhoto('library')}
            >
              <View style={styles.photoOptionIcon}>
                <Ionicons name="images-outline" size={20} color={colors.primary} />
              </View>
              <Text style={styles.photoOptionText}>Choose from gallery</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
            <Button title="Cancel" variant="secondary" onPress={() => setPhotoSheet(false)} />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={accountSheet !== null}
        transparent
        animationType="slide"
        onRequestClose={closeAccountSheet}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <Pressable style={styles.modalRoot} onPress={closeAccountSheet}>
            <Pressable style={styles.modalCard} onPress={() => undefined}>
              <Text style={styles.modalTitle}>
                {accountSheet === 'email' ? 'Edit email' : 'Edit name'}
              </Text>
              <Text style={styles.modalHint}>
                {accountSheet === 'email'
                  ? 'Confirm your password to change the email on this account.'
                  : 'This name is shown on your profile and parking activity.'}
              </Text>
              {accountSheet === 'name' ? (
                <TextField
                  label="Full name"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (!accountSaveDisabled) {
                      void saveAccountSheet();
                    }
                  }}
                />
              ) : (
                <>
                  <TextField
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                  />
                  <TextField
                    label="Current password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    textContentType="password"
                    autoComplete="password"
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      if (!accountSaveDisabled) {
                        void saveAccountSheet();
                      }
                    }}
                  />
                </>
              )}
              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  disabled={saving}
                  onPress={closeAccountSheet}
                  style={styles.modalBtn}
                />
                <Button
                  title="Save"
                  loading={saving}
                  disabled={accountSaveDisabled}
                  onPress={() => void saveAccountSheet()}
                  style={styles.modalBtn}
                />
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={passwordModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!confirmBusy) {
            setPasswordModal(false);
          }
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <Pressable
            style={styles.modalRoot}
            onPress={() => {
              if (!confirmBusy) {
                setPasswordModal(false);
              }
            }}
          >
            <Pressable style={styles.modalCard} onPress={() => undefined}>
              <Text style={styles.modalTitle}>Enable {biometricLabel}</Text>
              <Text style={styles.modalHint}>
                Confirm your password once. Then approve {biometricLabel} on this device.
              </Text>
              <TextField
                label="Current password"
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  if (confirmError) {
                    setConfirmError('');
                  }
                }}
                secureTextEntry
                error={confirmError}
                autoFocus
                textContentType="password"
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (confirmPassword.length >= 6 && !confirmBusy) {
                    void submitEnablePassword();
                  }
                }}
              />
              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  disabled={confirmBusy}
                  onPress={() => setPasswordModal(false)}
                  style={styles.modalBtn}
                />
                <Button
                  title="Enable"
                  loading={confirmBusy}
                  disabled={confirmPassword.length < 6}
                  onPress={() => void submitEnablePassword()}
                  style={styles.modalBtn}
                />
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={deleteModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!deleteBusy) {
            setDeleteModal(false);
          }
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <Pressable
            style={styles.modalRoot}
            onPress={() => {
              if (!deleteBusy) {
                setDeleteModal(false);
              }
            }}
          >
            <Pressable style={styles.modalCard} onPress={() => undefined}>
              <Text style={styles.modalTitle}>Delete account</Text>
              <Text style={styles.modalHint}>
                This permanently removes your profile, parking history, and alerts. Enter your
                password to confirm.
              </Text>
              <TextField
                label="Current password"
                value={deletePassword}
                onChangeText={(value) => {
                  setDeletePassword(value);
                  if (deleteError) {
                    setDeleteError('');
                  }
                }}
                secureTextEntry
                error={deleteError}
                autoFocus
                textContentType="password"
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (deletePassword.length >= 6 && !deleteBusy) {
                    void runDeleteAccount(deletePassword);
                  }
                }}
              />
              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  disabled={deleteBusy}
                  onPress={() => setDeleteModal(false)}
                  style={styles.modalBtn}
                />
                <Button
                  title="Delete"
                  variant="danger"
                  loading={deleteBusy}
                  disabled={deletePassword.length < 6}
                  onPress={() => void runDeleteAccount(deletePassword)}
                  style={styles.modalBtn}
                />
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
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
    return 'Confirm your identity again, then try once more.';
  }
  if (message.includes('invalid-email')) {
    return 'Enter a valid email address.';
  }
  if (message.includes('cancelled')) {
    return 'Confirmation was cancelled.';
  }
  return message;
}
