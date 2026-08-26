import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import { Platform, Share } from 'react-native';
import {
  buildAdminReportSnapshot,
  normalizeText,
  sanitizeFileSegment,
} from './adminReportSnapshot';

const DEVICE_ID_STORAGE_KEY = 'sadovnik.report.deviceId';

async function getStoredValue(key) {
  const value = await AsyncStorage.getItem(key);
  return value || '';
}

async function setStoredValue(key, value) {
  await AsyncStorage.setItem(key, value);
}

async function downloadWebZip(zipBase64, fileName) {
  if (typeof document === 'undefined') {
    return false;
  }

  const binaryString = typeof globalThis.atob === 'function'
    ? globalThis.atob(zipBase64)
    : Buffer.from(zipBase64, 'base64').toString('binary');
  const bytes = new Uint8Array(binaryString.length);

  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }

  const blob = new Blob([bytes], { type: 'application/zip' });
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = blobUrl;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 0);

  return true;
}

async function readPhotoAsBase64(uri) {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);

    if (!response.ok) {
      throw new Error(`РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕС‡РёС‚Р°С‚СЊ С„Р°Р№Р»: ${uri}`);
    }

    const blob = await response.blob();

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(`РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕС‡РёС‚Р°С‚СЊ С„Р°Р№Р»: ${uri}`));
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result !== 'string') {
          reject(new Error(`РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕС‡РёС‚Р°С‚СЊ С„Р°Р№Р»: ${uri}`));
          return;
        }

        resolve(result.split(',')[1] || '');
      };
      reader.readAsDataURL(blob);
    });
  }

  return await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

async function addPhotoToZip(zip, relativeFileName, sourceUri) {
  const photoUri = normalizeText(sourceUri);

  if (!photoUri) {
    return false;
  }

  try {
    const base64 = await readPhotoAsBase64(photoUri);

    if (!base64) {
      return false;
    }

    zip.file(relativeFileName, base64, { base64: true });
    return true;
  } catch {
    return false;
  }
}

export async function getOrCreateDeviceId() {
  const existingDeviceId = normalizeText(await getStoredValue(DEVICE_ID_STORAGE_KEY));

  if (existingDeviceId) {
    return existingDeviceId;
  }

  const nextDeviceId = `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await setStoredValue(DEVICE_ID_STORAGE_KEY, nextDeviceId);

  return nextDeviceId;
}

export async function buildAdminReportJson(cards, options = {}) {
  const reportCreatedAt = new Date().toISOString();
  const deviceId = await getOrCreateDeviceId();
  const zip = new JSZip();
  const report = await buildAdminReportSnapshot(cards, {
    ...options,
    deviceId,
    reportCreatedAt,
    reportId: `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  }, {
    addFile: (relativeFileName, sourceUri) => addPhotoToZip(zip, relativeFileName, sourceUri),
  });

  return {
    report,
    zip,
  };
}

async function buildAdminReportZipBase64(cards, options = {}) {
  const { report, zip } = await buildAdminReportJson(cards, options);
  const reportJson = JSON.stringify(report, null, 2);

  zip.file('report.json', reportJson);

  const zipBase64 = await zip.generateAsync({
    compression: 'DEFLATE',
    type: 'base64',
  });

  return {
    report,
    reportJson,
    zipBase64,
  };
}

export async function createAdminReportZip(cards, options = {}) {
  const { report, reportJson, zipBase64 } = await buildAdminReportZipBase64(cards, options);
  const datePart = report.createdAt.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const timePart = new Date(report.createdAt || Date.now()).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).replace(':', '-');
  const reportLabel = sanitizeFileSegment(
    report.user.displayName || report.deviceId,
    report.deviceId,
  );
  const fileName = `sadovnik-report-${datePart}-${timePart}-${reportLabel}.zip`;

  if (Platform.OS !== 'web' && FileSystem.cacheDirectory) {
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, zipBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return {
      fileName,
      fileUri,
      report,
      reportJson,
      zipBase64,
    };
  }

  return {
    fileName,
    fileUri: '',
    report,
    reportJson,
    zipBase64,
  };
}

export async function shareAdminReportZip(cards, options = {}) {
  const { fileName, fileUri, zipBase64 } = await createAdminReportZip(cards, options);
  const noticeFileName = fileName || 'report.zip';

  try {
    if (Platform.OS === 'web') {
      const downloaded = await downloadWebZip(zipBase64, noticeFileName);

      if (downloaded) {
        return 'web_downloaded';
      }

      await Share.share({
        title: noticeFileName,
        message: 'ZIP-РѕС‚С‡РµС‚ Sadovnik Diary РїРѕРґРіРѕС‚РѕРІР»РµРЅ РІ РјРѕР±РёР»СЊРЅРѕРј РїСЂРёР»РѕР¶РµРЅРёРё.',
      });
      return 'web_ready';
    }

    const isSharingAvailable = await Sharing.isAvailableAsync();

    if (!isSharingAvailable) {
      await Share.share({
        title: noticeFileName,
        message: 'ZIP-РѕС‚С‡РµС‚ Sadovnik Diary РїРѕРґРіРѕС‚РѕРІР»РµРЅ, РЅРѕ РѕС‚РїСЂР°РІРєР° С„Р°Р№Р»РѕРІ РЅРµРґРѕСЃС‚СѓРїРЅР°.',
      });
      return 'native_unavailable';
    }

    if (!fileUri) {
      await Share.share({
        title: noticeFileName,
        message: 'ZIP-РѕС‚С‡РµС‚ Sadovnik Diary РїРѕРґРіРѕС‚РѕРІР»РµРЅ, РЅРѕ С„Р°Р№Р» РЅРµРґРѕСЃС‚СѓРїРµРЅ РґР»СЏ РѕС‚РїСЂР°РІРєРё.',
      });
      return 'native_unavailable';
    }

    await Sharing.shareAsync(fileUri, {
      dialogTitle: 'РџРѕРґРµР»РёС‚СЊСЃСЏ ZIP-РѕС‚С‡РµС‚РѕРј Sadovnik Diary',
      mimeType: 'application/zip',
      UTI: 'public.zip-archive',
    });

    return 'native_shared';
  } finally {
    if (Platform.OS !== 'web' && fileUri) {
      try {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
      } catch {
        // Ignore cleanup failures.
      }
    }
  }
}
