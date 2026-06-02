import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import QRCode from 'qrcode';
import { Platform, Share } from 'react-native';

function sanitizeFileName(value) {
  return `${value}`
    .trim()
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'qr-code';
}

export async function shareQrCode(code) {
  const qrValue = `${code || ''}`.trim();

  if (!qrValue) {
    throw new Error('QR code is empty');
  }

  const fileName = `sadovnik-diary-qr-${sanitizeFileName(qrValue)}.svg`;
  const svg = await QRCode.toString(qrValue, {
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    margin: 1,
    type: 'svg',
  });

  if (Platform.OS === 'web' || !FileSystem.cacheDirectory) {
    await Share.share({
      message: qrValue,
      title: fileName,
    });
    return 'web_ready';
  }

  const isSharingAvailable = await Sharing.isAvailableAsync();

  if (!isSharingAvailable) {
    await Share.share({
      message: qrValue,
      title: fileName,
    });
    return 'native_unavailable';
  }

  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, svg, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  await Sharing.shareAsync(fileUri, {
    dialogTitle: 'Поделиться QR-кодом',
    mimeType: 'image/svg+xml',
    UTI: 'public.svg-image',
  });

  return 'native_shared';
}
