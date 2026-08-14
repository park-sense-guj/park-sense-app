import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ENABLED_KEY = 'parksense.biometric.enabled';
const EMAIL_KEY = 'parksense.biometric.email';
const PASSWORD_KEY = 'parksense.biometric.password';

export async function getBiometricLabel(): Promise<string> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(2 as LocalAuthentication.AuthenticationType)) {
    return 'Face ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'Iris unlock';
  }
  return Platform.OS === 'ios' ? 'Face ID' : 'Biometrics';
}

export async function isBiometricAvailable(): Promise<boolean> {
  const hardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return hardware && enrolled;
}

export async function isBiometricEnabled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(ENABLED_KEY);
  return value === '1';
}

export async function authenticateWithBiometrics(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Cancel',
    fallbackLabel: 'Use password',
    disableDeviceFallback: false,
  });
  return result.success;
}

export async function enableBiometrics(email: string, password: string): Promise<void> {
  await SecureStore.setItemAsync(ENABLED_KEY, '1');
  await SecureStore.setItemAsync(EMAIL_KEY, email.trim().toLowerCase());
  await SecureStore.setItemAsync(PASSWORD_KEY, password);
}

export async function disableBiometrics(): Promise<void> {
  await SecureStore.deleteItemAsync(ENABLED_KEY);
  await SecureStore.deleteItemAsync(EMAIL_KEY);
  await SecureStore.deleteItemAsync(PASSWORD_KEY);
}

export async function getStoredCredentials(): Promise<{ email: string; password: string } | null> {
  const enabled = await isBiometricEnabled();
  if (!enabled) {
    return null;
  }
  const email = await SecureStore.getItemAsync(EMAIL_KEY);
  const password = await SecureStore.getItemAsync(PASSWORD_KEY);
  if (!email || !password) {
    return null;
  }
  return { email, password };
}
