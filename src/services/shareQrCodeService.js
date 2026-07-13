import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import QRCode from 'qrcode';
import QRCodeCore from 'qrcode/lib/core/qrcode';
import QRRendererUtils from 'qrcode/lib/renderer/utils';
import pngjs from 'pngjs/browser';
import { Platform, Share } from 'react-native';

const { PNG } = pngjs;
const QR_IMAGE_WIDTH = 480;
const LABEL_PADDING = 24;
const TITLE_SCALE = 5;
const META_SCALE = 4;
const GLYPHS = {
  ' ': ['000', '000', '000', '000', '000', '000', '000'],
  '?': ['111', '001', '010', '000', '010', '000', '010'],
  '.': ['000', '000', '000', '000', '000', '110', '110'],
  ':': ['000', '110', '110', '000', '110', '110', '000'],
  '-': ['000', '000', '000', '111', '000', '000', '000'],
  '/': ['001', '001', '010', '010', '100', '100', '000'],
  '0': ['111', '101', '101', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '010', '010', '111'],
  '2': ['111', '001', '001', '111', '100', '100', '111'],
  '3': ['111', '001', '001', '111', '001', '001', '111'],
  '4': ['101', '101', '101', '111', '001', '001', '001'],
  '5': ['111', '100', '100', '111', '001', '001', '111'],
  '6': ['111', '100', '100', '111', '101', '101', '111'],
  '7': ['111', '001', '001', '010', '010', '100', '100'],
  '8': ['111', '101', '101', '111', '101', '101', '111'],
  '9': ['111', '101', '101', '111', '001', '001', '111'],
  A: ['010', '101', '101', '111', '101', '101', '101'],
  B: ['110', '101', '101', '110', '101', '101', '110'],
  C: ['111', '100', '100', '100', '100', '100', '111'],
  D: ['110', '101', '101', '101', '101', '101', '110'],
  E: ['111', '100', '100', '110', '100', '100', '111'],
  F: ['111', '100', '100', '110', '100', '100', '100'],
  G: ['111', '100', '100', '101', '101', '101', '111'],
  H: ['101', '101', '101', '111', '101', '101', '101'],
  I: ['111', '010', '010', '010', '010', '010', '111'],
  J: ['001', '001', '001', '001', '101', '101', '111'],
  K: ['101', '101', '110', '100', '110', '101', '101'],
  L: ['100', '100', '100', '100', '100', '100', '111'],
  M: ['101', '111', '111', '101', '101', '101', '101'],
  N: ['101', '111', '111', '111', '111', '111', '101'],
  O: ['111', '101', '101', '101', '101', '101', '111'],
  P: ['111', '101', '101', '111', '100', '100', '100'],
  Q: ['111', '101', '101', '101', '111', '001', '001'],
  R: ['111', '101', '101', '111', '110', '101', '101'],
  S: ['111', '100', '100', '111', '001', '001', '111'],
  T: ['111', '010', '010', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '101', '101', '111'],
  V: ['101', '101', '101', '101', '101', '010', '010'],
  W: ['101', '101', '101', '111', '111', '111', '101'],
  X: ['101', '101', '010', '010', '010', '101', '101'],
  Y: ['101', '101', '010', '010', '010', '010', '010'],
  Z: ['111', '001', '010', '010', '100', '100', '111'],
  А: ['010', '101', '101', '111', '101', '101', '101'],
  Б: ['111', '100', '100', '110', '101', '101', '110'],
  В: ['110', '101', '101', '110', '101', '101', '110'],
  Г: ['111', '100', '100', '100', '100', '100', '100'],
  Д: ['011', '101', '101', '101', '101', '111', '101'],
  Е: ['111', '100', '100', '110', '100', '100', '111'],
  Ж: ['101', '101', '101', '111', '101', '101', '101'],
  З: ['111', '001', '001', '011', '001', '001', '111'],
  И: ['101', '101', '111', '111', '111', '101', '101'],
  Й: ['010', '101', '101', '111', '111', '101', '101'],
  К: ['101', '101', '110', '100', '110', '101', '101'],
  Л: ['011', '101', '101', '101', '101', '101', '101'],
  М: ['101', '111', '111', '101', '101', '101', '101'],
  Н: ['101', '101', '101', '111', '101', '101', '101'],
  О: ['111', '101', '101', '101', '101', '101', '111'],
  П: ['111', '101', '101', '101', '101', '101', '101'],
  Р: ['111', '101', '101', '111', '100', '100', '100'],
  С: ['111', '100', '100', '100', '100', '100', '111'],
  Т: ['111', '010', '010', '010', '010', '010', '010'],
  У: ['101', '101', '101', '111', '001', '001', '110'],
  Ф: ['010', '111', '101', '101', '101', '111', '010'],
  Х: ['101', '101', '010', '010', '010', '101', '101'],
  Ц: ['101', '101', '101', '101', '101', '111', '001'],
  Ч: ['101', '101', '101', '011', '001', '001', '001'],
  Ш: ['101', '101', '101', '101', '101', '101', '111'],
  Щ: ['101', '101', '101', '101', '101', '111', '001'],
  Ъ: ['110', '010', '010', '011', '101', '101', '011'],
  Ы: ['101', '101', '101', '111', '101', '101', '111'],
  Ь: ['100', '100', '100', '110', '101', '101', '110'],
  Э: ['111', '001', '001', '111', '001', '001', '111'],
  Ю: ['101', '111', '101', '101', '101', '111', '101'],
  Я: ['111', '101', '101', '111', '010', '101', '101'],
};

function sanitizeFileName(value) {
  return `${value}`
    .trim()
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'qr-code';
}

async function downloadWebQrCode(dataUrl, fileName) {
  if (typeof document === 'undefined') {
    return false;
  }

  const response = await fetch(dataUrl);
  const blob = await response.blob();
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

function getBase64Data(dataUrl) {
  const separatorIndex = dataUrl.indexOf(',');

  if (separatorIndex < 0) {
    return '';
  }

  return dataUrl.slice(separatorIndex + 1);
}

function formatGeneratedAt(value) {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  const pad = (part) => `${part}`.padStart(2, '0');

  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function normalizeLabel(value, fallback) {
  return `${value || fallback}`.replace(/\s+/g, ' ').trim();
}

function fitBitmapText(value, scale, maxWidth) {
  const maxCharacters = Math.max(1, Math.floor(maxWidth / (4 * scale)));
  const upper = value.toUpperCase();

  return upper.length <= maxCharacters ? upper : `${upper.slice(0, Math.max(1, maxCharacters - 3))}...`;
}

function getLabelLines(metadata, qrValue) {
  return [
    normalizeLabel(metadata?.title, 'Партия'),
    formatGeneratedAt(metadata?.generatedAt),
    qrValue,
  ];
}

function setPixel(png, x, y) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) {
    return;
  }

  const offset = (png.width * y + x) << 2;
  png.data[offset] = 0;
  png.data[offset + 1] = 0;
  png.data[offset + 2] = 0;
  png.data[offset + 3] = 255;
}

function drawBitmapText(png, text, y, scale) {
  const glyphWidth = 3 * scale;
  const spacing = scale;
  const textWidth = text.length * (glyphWidth + spacing) - spacing;
  let x = Math.max(0, Math.floor((png.width - textWidth) / 2));

  for (const character of text) {
    const glyph = GLYPHS[character] || GLYPHS['?'];
    glyph.forEach((row, rowIndex) => {
      [...row].forEach((pixel, columnIndex) => {
        if (pixel !== '1') {
          return;
        }

        for (let vertical = 0; vertical < scale; vertical += 1) {
          for (let horizontal = 0; horizontal < scale; horizontal += 1) {
            setPixel(png, x + columnIndex * scale + horizontal, y + rowIndex * scale + vertical);
          }
        }
      });
    });
    x += glyphWidth + spacing;
  }
}

async function generateWebQrPngDataUrl(qrValue, lines, qrOptions) {
  const qrDataUrl = await QRCode.toDataURL(qrValue, qrOptions);
  const qrImage = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = qrDataUrl;
  });
  const canvas = document.createElement('canvas');
  const footerHeight = 144;
  const context = canvas.getContext('2d');

  canvas.width = qrImage.width;
  canvas.height = qrImage.height + footerHeight;
  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(qrImage, 0, 0);
  context.fillStyle = '#000000';
  context.textAlign = 'center';
  context.font = '600 23px system-ui, sans-serif';
  context.fillText(lines[0], canvas.width / 2, qrImage.height + 38, canvas.width - LABEL_PADDING * 2);
  context.font = '600 18px system-ui, sans-serif';
  context.fillText(lines[1], canvas.width / 2, qrImage.height + 79, canvas.width - LABEL_PADDING * 2);
  context.font = '600 18px system-ui, sans-serif';
  context.fillText(lines[2], canvas.width / 2, qrImage.height + 112, canvas.width - LABEL_PADDING * 2);

  return canvas.toDataURL('image/png');
}

async function generateQrPngDataUrl(qrValue, metadata) {
  const qrOptions = {
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    margin: 1,
    type: 'png',
    width: QR_IMAGE_WIDTH,
  };
  const lines = getLabelLines(metadata, qrValue);

  if (Platform.OS === 'web') {
    return generateWebQrPngDataUrl(qrValue, lines, qrOptions);
  }

  const qrData = QRCodeCore.create(qrValue, qrOptions);
  const renderOptions = QRRendererUtils.getOptions(qrOptions);
  const size = QRRendererUtils.getImageWidth(qrData.modules.size, renderOptions);
  const qrPng = new PNG({
    width: size,
    height: size,
  });
  const footerHeight = LABEL_PADDING * 2 + 7 * TITLE_SCALE + 7 * META_SCALE * 2 + 28;
  const png = new PNG({ width: size, height: size + footerHeight });

  png.data.fill(255);
  QRRendererUtils.qrToImageData(qrPng.data, qrData, renderOptions);
  png.data.set(qrPng.data, 0);
  const maxWidth = size - LABEL_PADDING * 2;
  const title = fitBitmapText(lines[0], TITLE_SCALE, maxWidth);
  const generatedAt = fitBitmapText(lines[1], META_SCALE, maxWidth);
  const code = fitBitmapText(lines[2], META_SCALE, maxWidth);
  let labelY = size + LABEL_PADDING;
  drawBitmapText(png, title, labelY, TITLE_SCALE);
  labelY += 7 * TITLE_SCALE + 16;
  drawBitmapText(png, generatedAt, labelY, META_SCALE);
  labelY += 7 * META_SCALE + 12;
  drawBitmapText(png, code, labelY, META_SCALE);

  return `data:image/png;base64,${PNG.sync.write(png).toString('base64')}`;
}

export async function shareQrCode(code, metadata = {}) {
  const qrValue = `${code || ''}`.trim();

  if (!qrValue) {
    throw new Error('QR code is empty');
  }

  const fileName = `sadovnik-diary-qr-${sanitizeFileName(qrValue)}.png`;
  const pngDataUrl = await generateQrPngDataUrl(qrValue, metadata);

  if (Platform.OS === 'web' || !FileSystem.cacheDirectory) {
    const downloaded = await downloadWebQrCode(pngDataUrl, fileName);

    if (downloaded) {
      return 'web_downloaded';
    }

    await Share.share({
      message: qrValue,
      title: fileName,
    });
    return 'web_ready';
  }

  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, getBase64Data(pngDataUrl), {
    encoding: FileSystem.EncodingType.Base64,
  });

  const isSharingAvailable = await Sharing.isAvailableAsync();

  if (!isSharingAvailable) {
    const shareUri =
      Platform.OS === 'android' && typeof FileSystem.getContentUriAsync === 'function'
        ? await FileSystem.getContentUriAsync(fileUri)
        : fileUri;

    await Share.share(
      Platform.OS === 'android'
        ? {
            title: fileName,
            url: shareUri,
          }
        : {
            message: qrValue,
            title: fileName,
          },
      {
        dialogTitle: 'Share QR code',
      },
    );
    return Platform.OS === 'android' ? 'native_shared' : 'native_unavailable';
  }

  try {
    await Sharing.shareAsync(fileUri, {
      dialogTitle: 'Share QR code',
      mimeType: 'image/png',
      UTI: 'public.png',
    });
  } catch (shareError) {
    const shareUri =
      Platform.OS === 'android' && typeof FileSystem.getContentUriAsync === 'function'
        ? await FileSystem.getContentUriAsync(fileUri)
        : fileUri;

    if (Platform.OS === 'android') {
      await Share.share(
        {
          title: fileName,
          url: shareUri,
        },
        {
          dialogTitle: 'Share QR code',
        },
      );
    } else {
      throw shareError;
    }
  }

  return 'native_shared';
}
