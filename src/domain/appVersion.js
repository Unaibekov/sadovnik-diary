import { Platform } from 'react-native';
import Constants from 'expo-constants';

const UNKNOWN_VALUE = 'unknown';

function normalizeBuildNumber(value) {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  return `${value}`;
}

export function getAppVersionInfo() {
  const expoConfig = Constants.expoConfig || {};
  const configBuildNumber = Platform.OS === 'ios'
    ? expoConfig.ios?.buildNumber
    : Platform.OS === 'android'
      ? expoConfig.android?.versionCode
      : expoConfig.ios?.buildNumber || expoConfig.android?.versionCode;
  const version = Constants.nativeApplicationVersion || expoConfig.version || UNKNOWN_VALUE;
  const buildNumber = normalizeBuildNumber(Constants.nativeBuildVersion) ||
    normalizeBuildNumber(configBuildNumber);

  return {
    buildNumber: buildNumber || UNKNOWN_VALUE,
    version,
  };
}

export function formatAppVersionLabel({ buildNumber, version }) {
  return `v${version} (Build ${buildNumber})`;
}
