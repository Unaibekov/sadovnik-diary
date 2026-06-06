// Local quick access helpers for PIN and biometric unlock.
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const QUICK_AUTH_PIN_KEY = 'sadovnik.quick-auth.pin';
const QUICK_AUTH_BIOMETRIC_KEY = 'sadovnik.quick-auth.biometric-enabled';

async function readStoredValue(key) {
  if (Platform.OS !== 'web') {
    try {
      const secureValue = await SecureStore.getItemAsync(key);

      if (secureValue !== null && secureValue !== undefined) {
        return secureValue;
      }
    } catch {
      // Fall back to AsyncStorage when secure storage is unavailable.
    }
  }

  const fallbackValue = await AsyncStorage.getItem(key);

  return fallbackValue ?? '';
}

async function writeStoredValue(key, value) {
  if (Platform.OS !== 'web') {
    try {
      if (value === null) {
        await SecureStore.deleteItemAsync(key);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
      return;
    } catch {
      // Fall back to AsyncStorage when secure storage is unavailable.
    }
  }

  if (value === null) {
    await AsyncStorage.removeItem(key);
    return;
  }

  await AsyncStorage.setItem(key, value);
}

function getBiometricDescription(authenticationTypes) {
  const hasFace = authenticationTypes.includes(
    LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
  );
  const hasFingerprint = authenticationTypes.includes(
    LocalAuthentication.AuthenticationType.FINGERPRINT,
  );

  if (hasFace && hasFingerprint) {
    return 'Face ID / отпечаток пальца';
  }

  if (hasFace) {
    return 'Face ID';
  }

  if (hasFingerprint) {
    return 'отпечаток пальца';
  }

  return 'биометрия';
}

export async function loadQuickAuthState() {
  const [pinCode, biometricEnabledValue] = await Promise.all([
    readStoredValue(QUICK_AUTH_PIN_KEY),
    readStoredValue(QUICK_AUTH_BIOMETRIC_KEY),
  ]);

  return {
    biometricEnabled: biometricEnabledValue === 'true',
    pinCode,
  };
}

export async function saveQuickAuthPin(pinCode) {
  const normalizedPin = pinCode.trim();

  if (!normalizedPin) {
    await writeStoredValue(QUICK_AUTH_PIN_KEY, null);
    return;
  }

  await writeStoredValue(QUICK_AUTH_PIN_KEY, normalizedPin);
}

export async function saveBiometricEnabled(isEnabled) {
  if (!isEnabled) {
    await writeStoredValue(QUICK_AUTH_BIOMETRIC_KEY, null);
    return;
  }

  await writeStoredValue(QUICK_AUTH_BIOMETRIC_KEY, 'true');
}

export async function getQuickAuthBiometricInfo() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();

  if (!hasHardware) {
    return {
      available: false,
      description: 'На устройстве нет датчика биометрии.',
    };
  }

  const enrolled = await LocalAuthentication.isEnrolledAsync();

  if (!enrolled) {
    return {
      available: false,
      description: 'Биометрия не настроена на устройстве.',
    };
  }

  const authenticationTypes =
    await LocalAuthentication.supportedAuthenticationTypesAsync();

  return {
    available: true,
    description: getBiometricDescription(authenticationTypes),
  };
}

export async function authenticateWithBiometrics() {
  return LocalAuthentication.authenticateAsync({
    cancelLabel: 'Отмена',
    fallbackLabel: 'Использовать PIN',
    promptMessage: 'Подтвердите вход',
  });
}
