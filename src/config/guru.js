function getExpoExtra() {
  try {
    // Lazy require keeps Node unit tests independent from Expo runtime modules.
    const importedModule = require('expo-constants');
    const Constants = importedModule?.default || importedModule;

    return Constants?.expoConfig?.extra || {};
  } catch {
    return {};
  }
}

const expoExtra = getExpoExtra();

function getWebDevAiBackendUrl() {
  if (typeof window === 'undefined' || !window.location) {
    return '';
  }

  const { hostname, protocol } = window.location;

  if (!/^https?:$/i.test(protocol)) {
    return '';
  }

  if (!['localhost', '127.0.0.1'].includes(`${hostname || ''}`.trim().toLowerCase())) {
    return '';
  }

  return 'http://localhost:8787';
}

const configuredAiBackendUrl = typeof expoExtra.aiBackendUrl === 'string'
  ? expoExtra.aiBackendUrl.trim()
  : '';
const configuredGuruApiTimeoutMs = Number(expoExtra.guruApiTimeoutMs);

export const AI_BACKEND_BASE_URL = configuredAiBackendUrl || getWebDevAiBackendUrl();
export const SADOVNIK_AI_CHAT_ENDPOINT = '/api/ai/chat';
export const GURU_API_TIMEOUT_MS = Number.isFinite(configuredGuruApiTimeoutMs) && configuredGuruApiTimeoutMs > 0
  ? configuredGuruApiTimeoutMs
  : 35000;
export const GURU_DEFAULT_MODEL = typeof expoExtra.guruModel === 'string'
  ? expoExtra.guruModel.trim()
  : '';
