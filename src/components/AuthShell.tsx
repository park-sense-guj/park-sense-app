import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, spacing } from '../config/theme';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Full branded hero on login; compact top bar on register. */
  variant?: 'login' | 'register';
};

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  variant = 'login',
}: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const isLogin = variant === 'login';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background },
        flex: { flex: 1 },
        content: {
          flexGrow: 1,
          paddingHorizontal: spacing.lg,
        },
        hero: {
          marginHorizontal: -spacing.lg,
          paddingHorizontal: spacing.lg,
          paddingBottom: 28,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          overflow: 'hidden',
        },
        heroInner: {
          alignItems: 'center',
          paddingTop: 4,
        },
        logoRing: {
          width: 64,
          height: 64,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.16)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.28)',
        },
        logo: {
          width: 48,
          height: 48,
          borderRadius: 16,
          backgroundColor: colors.white,
          alignItems: 'center',
          justifyContent: 'center',
        },
        logoMark: { color: colors.primary, fontSize: 22, fontWeight: '800' },
        brand: {
          marginTop: 10,
          fontSize: 26,
          fontWeight: '800',
          color: colors.white,
          letterSpacing: -0.5,
        },
        tag: {
          marginTop: 4,
          fontSize: 13,
          fontWeight: '600',
          color: 'rgba(255,255,255,0.82)',
          textAlign: 'center',
          lineHeight: 18,
          paddingHorizontal: 16,
        },
        compactTop: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          marginBottom: 22,
        },
        compactLogo: {
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        },
        compactLogoMark: { color: colors.white, fontSize: 20, fontWeight: '800' },
        compactBrand: {
          fontSize: 22,
          fontWeight: '800',
          color: colors.text,
          letterSpacing: -0.4,
        },
        accent: { color: colors.primary },
        sheet: {
          marginTop: isLogin ? -22 : 0,
          backgroundColor: colors.cardSolid,
          borderRadius: radius.xl,
          paddingHorizontal: 20,
          paddingTop: 22,
          paddingBottom: 20,
          borderWidth: 1,
          borderColor: colors.glassBorder,
        },
        heading: {
          fontSize: 22,
          fontWeight: '800',
          color: colors.text,
          letterSpacing: -0.4,
        },
        hint: {
          marginTop: 4,
          marginBottom: 14,
          color: colors.textMuted,
          lineHeight: 20,
          fontSize: 14,
        },
        footer: {
          marginTop: 22,
          alignItems: 'center',
          paddingBottom: 8,
        },
      }),
    [colors, isLogin],
  );

  const heroColors: [string, string, string] = isDark
    ? [colors.primaryDark, colors.primary, '#0F766E']
    : [colors.primaryDark, colors.primary, colors.primaryMid];

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: isLogin ? 0 : insets.top + 20,
              paddingBottom: insets.bottom + 28,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          {isLogin ? (
            <LinearGradient
              colors={heroColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.hero, { paddingTop: insets.top + 12 }]}
            >
              <View style={styles.heroInner}>
                <View style={styles.logoRing}>
                  <View style={styles.logo}>
                    <Text style={styles.logoMark}>P</Text>
                  </View>
                </View>
                <Text style={styles.brand}>ParkSense</Text>
                <Text style={styles.tag}>Find open parking in real time — then navigate there.</Text>
              </View>
            </LinearGradient>
          ) : (
            <View style={styles.compactTop}>
              <View style={styles.compactLogo}>
                <Text style={styles.compactLogoMark}>P</Text>
              </View>
              <Text style={styles.compactBrand}>
                Park<Text style={styles.accent}>Sense</Text>
              </Text>
            </View>
          )}

          <View style={styles.sheet}>
            <Text style={styles.heading}>{title}</Text>
            <Text style={styles.hint}>{subtitle}</Text>
            {children}
          </View>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

type DividerProps = {
  label?: string;
};

export function AuthDivider({ label = 'or' }: DividerProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          marginTop: 16,
          marginBottom: 12,
        },
        line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
        label: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.8,
          color: colors.textMuted,
          textTransform: 'uppercase',
        },
      }),
    [colors],
  );

  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

type AltMethod = {
  key: string;
  label: string;
  accessibilityLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  /** Soft teal chip vs neutral white chip */
  tone?: 'neutral' | 'primary';
};

type AuthAltMethodsProps = {
  methods: AltMethod[];
};

/** Compact side-by-side alt sign-in chips (Google / Face ID). */
export function AuthAltMethods({ methods }: AuthAltMethodsProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          gap: 8,
        },
        chip: {
          flex: 1,
          minHeight: 44,
          borderRadius: radius.md,
          borderWidth: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: 10,
          paddingHorizontal: 12,
        },
        chipNeutral: {
          backgroundColor: isDark ? colors.backgroundAlt : colors.white,
          borderColor: colors.borderStrong,
        },
        chipPrimary: {
          backgroundColor: colors.primarySoft,
          borderColor: colors.border,
        },
        iconWrap: {
          width: 26,
          height: 26,
          borderRadius: 13,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.primaryMuted,
        },
        iconWrapNeutral: {
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.primaryMuted,
        },
        label: {
          fontSize: 13,
          fontWeight: '700',
          color: colors.primaryDark,
          textAlign: 'center',
        },
        labelPrimary: {
          color: colors.primaryDark,
        },
        pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
        disabled: { opacity: 0.5 },
      }),
    [colors, isDark],
  );

  if (methods.length === 0) {
    return null;
  }

  return (
    <View style={styles.row}>
      {methods.map((method) => {
        const primary = method.tone === 'primary';
        return (
          <Pressable
            key={method.key}
            accessibilityRole="button"
            accessibilityLabel={method.accessibilityLabel}
            accessibilityState={{
              disabled: Boolean(method.disabled || method.loading),
              busy: Boolean(method.loading),
            }}
            disabled={method.disabled || method.loading}
            onPress={method.onPress}
            style={({ pressed }) => [
              styles.chip,
              primary ? styles.chipPrimary : styles.chipNeutral,
              (method.disabled || method.loading) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.iconWrap, !primary && styles.iconWrapNeutral]}>
              <Ionicons name={method.icon} size={15} color={method.iconColor} />
            </View>
            <Text
              style={[styles.label, primary && styles.labelPrimary]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
            >
              {method.loading ? '…' : method.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type GoogleButtonProps = {
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  label?: string;
};

export function GoogleSignInButton({
  loading,
  disabled,
  onPress,
  label = 'Continue with Google',
}: GoogleButtonProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          minHeight: 52,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          backgroundColor: isDark ? colors.backgroundAlt : colors.white,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          paddingHorizontal: 18,
        },
        pressed: { opacity: 0.88 },
        disabled: { opacity: 0.5 },
        label: { fontSize: 15, fontWeight: '700', color: colors.text },
        icon: { marginTop: 1 },
      }),
    [colors, isDark],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name="logo-google" size={18} color={colors.primaryDark} style={styles.icon} />
      <Text style={styles.label}>{loading ? 'Connecting…' : label}</Text>
    </Pressable>
  );
}

type BiometricButtonProps = {
  label: string;
  disabled?: boolean;
  onPress: () => void;
};

export function BiometricSignInButton({ label, disabled, onPress }: BiometricButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          marginTop: 10,
          minHeight: 48,
          borderRadius: radius.md,
          backgroundColor: colors.primarySoft,
          borderWidth: 1,
          borderColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingHorizontal: 16,
        },
        pressed: { opacity: 0.88 },
        disabled: { opacity: 0.5 },
        label: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
      }),
    [colors],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Sign in with ${label}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <Ionicons
        name={label.includes('Face') ? 'scan-outline' : 'finger-print-outline'}
        size={18}
        color={colors.primaryDark}
      />
      <Text style={styles.label}>Sign in with {label}</Text>
    </Pressable>
  );
}

type FooterLinkProps = {
  prompt: string;
  action: string;
  onPress: () => void;
};

export function AuthFooterLink({ prompt, action, onPress }: FooterLinkProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 4,
        },
        prompt: { color: colors.textMuted, fontSize: 14 },
        action: { color: colors.primary, fontSize: 14, fontWeight: '800' },
      }),
    [colors],
  );

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={action}>
      <View style={styles.row}>
        <Text style={styles.prompt}>{prompt}</Text>
        <Text style={styles.action}>{action}</Text>
      </View>
    </Pressable>
  );
}
