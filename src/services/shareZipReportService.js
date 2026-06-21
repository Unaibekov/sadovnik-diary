import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import { Platform, Share } from 'react-native';
import { getCardCurrentQuantity, getCardLocationDescription } from '../domain/batch';
import { currentUser as defaultCurrentUser } from '../domain/constants';
import { getResolvedBatchStatus } from '../domain/cardSelectors';

const DEVICE_ID_STORAGE_KEY = 'sadovnik.report.deviceId';

const CARD_FIELDS = new Set([
  'id',
  'code',
  'cultureName',
  'speciesName',
  'varietyName',
  'stage',
  'batchStatus',
  'sterilityStatus',
  'quantity',
  'currentQuantity',
  'locationDescription',
  'createdAt',
  'updatedAt',
  'events',
  'extraFields',
  'operations',
]);

const EVENT_FIELDS = new Set([
  'id',
  'eventId',
  'type',
  'title',
  'stage',
  'date',
  'createdAt',
  'createdBy',
  'comment',
  'photoNote',
  'photoFiles',
  'problemType',
  'riskLevel',
  'count',
  'previousQuantity',
  'currentQuantity',
  'reason',
  'lossReason',
  'quarantineReason',
  'contaminationNote',
  'saleType',
  'recipient',
  'saleAmount',
  'propagationMethod',
  'fromStage',
  'toStage',
  'stageChangedAt',
  'rootedCount',
  'rootingPercent',
  'stressLevel',
  'turgor',
  'stability',
  'environmentTemperature',
  'environmentAirHumidity',
  'environmentHumidity',
  'substrateHumidity',
  'environmentLight',
  'ventilation',
  'humidityReduction',
  'careType',
  'growthRate',
  'conditionDescription',
  'readinessForPlanting',
  'survivalRate',
  'careIntervalDays',
  'wateringIntervalDays',
  'waterVolume',
  'productName',
  'dosage',
  'applicationMethod',
  'plantReaction',
  'diseaseName',
  'pestName',
  'diseaseSeverity',
  'placement',
  'densityChange',
  'problemDescription',
  'previousLocation',
  'nextLocation',
  'greenhouseName',
  'rackName',
  'shelfName',
  'plantingLocation',
  'plantingScheme',
  'plotArea',
  'soilType',
  'completionResult',
  'extraFields',
]);

function normalizeText(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return `${value}`.replace(/\r?\n/g, ' ').trim();
}

function normalizeNumber(value, fallback = 0) {
  const normalizedValue = Number(value);

  return Number.isFinite(normalizedValue) ? normalizedValue : fallback;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function buildExtraFields(source, allowedFields) {
  if (!isPlainObject(source)) {
    return {};
  }

  return Object.keys(source).reduce((extraFields, key) => {
    if (allowedFields.has(key)) {
      return extraFields;
    }

    const value = source[key];

    if (value === undefined) {
      return extraFields;
    }

    if (key === 'extraFields' && isPlainObject(value)) {
      return {
        ...extraFields,
        ...value,
      };
    }

    extraFields[key] = value;
    return extraFields;
  }, {});
}

function sanitizeFileSegment(value, fallback = 'report') {
  const normalized = normalizeText(value)
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized || fallback;
}

function getFileExtension(uri) {
  const normalizedUri = normalizeText(uri);
  const withoutQuery = normalizedUri.split('?')[0].split('#')[0];
  const lastDot = withoutQuery.lastIndexOf('.');

  if (lastDot < 0) {
    return '.jpg';
  }

  const extension = withoutQuery.slice(lastDot).toLowerCase();

  return extension.length > 1 && extension.length <= 8 ? extension : '.jpg';
}

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
      throw new Error(`Не удалось прочитать файл: ${uri}`);
    }

    const blob = await response.blob();

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(`Не удалось прочитать файл: ${uri}`));
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result !== 'string') {
          reject(new Error(`Не удалось прочитать файл: ${uri}`));
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

async function addPhotoToZip(zip, sourceUri, relativeFileName) {
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

function getPhotoUris(value) {
  const items = Array.isArray(value) ? value : [value];
  const seen = new Set();

  return items
    .map((item) => normalizeText(item))
    .filter((item) => {
      if (!item || seen.has(item)) {
        return false;
      }

      seen.add(item);
      return true;
    });
}

function getCardPhotoUris(card) {
  return [
    ...getPhotoUris(card?.startPhotoUris),
    ...getPhotoUris(card?.startPhotoUri),
  ];
}

function getEventPhotoUris(operation) {
  return [
    ...getPhotoUris(operation?.photoUris),
    ...getPhotoUris(operation?.photoUri),
  ];
}

function countAttachmentFiles(filePaths, photoNote, sourceUriCount = 0) {
  if (filePaths.length > 0) {
    return filePaths.length;
  }

  if (sourceUriCount > 0) {
    return 1;
  }

  return normalizeText(photoNote) ? 1 : 0;
}

function normalizeEvent(operation, card, zip, zipState, index) {
  const safeOperation = operation || {};
  const eventId = normalizeText(safeOperation.id) || `${normalizeText(card?.id) || 'card'}-${index + 1}`;
  const eventPhotoUris = getEventPhotoUris(safeOperation);
  const eventPhotoFiles = [];

  return Promise.all(
    eventPhotoUris.map(async (photoUri, photoIndex) => {
      const extension = getFileExtension(photoUri);
      const relativeFileName = `photos/${sanitizeFileSegment(eventId)}_${photoIndex + 1}${extension}`;

      const isAdded = await addPhotoToZip(zip, photoUri, relativeFileName);
      if (isAdded) {
        eventPhotoFiles.push(relativeFileName);
      }
    }),
  ).then(() => {
    const normalizedEvent = {
      eventId,
      type: normalizeText(safeOperation.type),
      title: normalizeText(safeOperation.title || safeOperation.type),
      stage: normalizeText(safeOperation.stage || card?.stage || ''),
      date: normalizeText(safeOperation.date),
      createdAt: normalizeText(safeOperation.createdAt),
      createdBy: normalizeText(safeOperation.createdBy),
      comment: normalizeText(safeOperation.comment),
      photoNote: normalizeText(safeOperation.photoNote),
      photoFiles: eventPhotoFiles,
      problemType: normalizeText(safeOperation.problemType),
      riskLevel: normalizeText(safeOperation.riskLevel),
      count: normalizeNumber(safeOperation.count, 0),
      previousQuantity: normalizeNumber(safeOperation.previousQuantity, 0),
      currentQuantity: normalizeNumber(safeOperation.currentQuantity, 0),
      extraFields: buildExtraFields(safeOperation, EVENT_FIELDS),
    };

    zipState.eventsCount += 1;
    zipState.photosCount += countAttachmentFiles(
      normalizedEvent.photoFiles,
      normalizedEvent.photoNote,
      eventPhotoUris.length,
    );

    if ([
      'problem',
      'contamination',
      'quarantine',
      'greenhouseDisease',
    ].includes(normalizedEvent.type)) {
      zipState.problemsCount += 1;
    }

    return normalizedEvent;
  });
}

function normalizeCard(card, zip, zipState, index) {
  const safeCard = card || {};
  const cardId = normalizeText(safeCard.id) || `card-${index + 1}`;
  const cardPhotoUris = getCardPhotoUris(safeCard);
  const startPhotoFiles = [];
  const operations = Array.isArray(safeCard.operations) ? safeCard.operations : [];
  const normalizedOperations = operations
    .filter((operation) => operation?.type !== 'stageSettingsUpdated');

  return Promise.all(
    cardPhotoUris.map(async (photoUri, photoIndex) => {
      const extension = getFileExtension(photoUri);
      const relativeFileName = `photos/${sanitizeFileSegment(`${cardId}_start`)}_${photoIndex + 1}${extension}`;

      const isAdded = await addPhotoToZip(zip, photoUri, relativeFileName);
      if (isAdded) {
        startPhotoFiles.push(relativeFileName);
      }
    }),
  )
    .then(async () => {
      const events = await Promise.all(
        normalizedOperations.map((operation, eventIndex) => normalizeEvent(
          operation,
          safeCard,
          zip,
          zipState,
          eventIndex,
        )),
      );

      const batchStatus = normalizeText(getResolvedBatchStatus(safeCard) || safeCard.batchStatus || safeCard.status || 'active') || 'active';
      const normalizedCard = {
        cardId,
        code: normalizeText(safeCard.code),
        cultureName: normalizeText(safeCard.cultureName),
        speciesName: normalizeText(safeCard.speciesName),
        varietyName: normalizeText(safeCard.varietyName),
        stage: normalizeText(safeCard.stage),
        batchStatus,
        sterilityStatus: normalizeText(safeCard.sterilityStatus),
        quantity: normalizeNumber(safeCard.quantity, 0),
        currentQuantity: normalizeNumber(getCardCurrentQuantity(safeCard), 0),
        locationDescription: normalizeText(getCardLocationDescription(safeCard)),
        createdAt: normalizeText(safeCard.createdAt),
        updatedAt: normalizeText(safeCard.updatedAt || safeCard.createdAt),
        events,
        extraFields: buildExtraFields(safeCard, CARD_FIELDS),
      };

      normalizedCard.extraFields = {
        ...normalizedCard.extraFields,
        ...(startPhotoFiles.length > 0 ? { startPhotoFiles } : {}),
      };

      zipState.cardsCount += 1;

      if (batchStatus === 'active') {
        zipState.activeCount += 1;
      } else if (batchStatus === 'sold') {
        zipState.soldCount += 1;
      } else if (batchStatus === 'quarantine') {
        zipState.quarantineCount += 1;
      } else if (batchStatus === 'problem') {
        zipState.problemCount += 1;
      } else if (batchStatus === 'partial') {
        zipState.partialCount += 1;
      } else if (batchStatus === 'archived') {
        zipState.archivedCount += 1;
      }

      zipState.photosCount += countAttachmentFiles(startPhotoFiles, safeCard.startPhotoNote, cardPhotoUris.length);

      return normalizedCard;
    })
    .catch(() => {
      const fallbackCard = {
        cardId,
        code: normalizeText(safeCard.code),
        cultureName: normalizeText(safeCard.cultureName),
        speciesName: normalizeText(safeCard.speciesName),
        varietyName: normalizeText(safeCard.varietyName),
        stage: normalizeText(safeCard.stage),
        batchStatus: normalizeText(safeCard.batchStatus || safeCard.status || 'active') || 'active',
        sterilityStatus: normalizeText(safeCard.sterilityStatus),
        quantity: normalizeNumber(safeCard.quantity, 0),
        currentQuantity: normalizeNumber(getCardCurrentQuantity(safeCard), 0),
        locationDescription: normalizeText(getCardLocationDescription(safeCard)),
        createdAt: normalizeText(safeCard.createdAt),
        updatedAt: normalizeText(safeCard.updatedAt || safeCard.createdAt),
        events: [],
        extraFields: buildExtraFields(safeCard, CARD_FIELDS),
      };

      zipState.cardsCount += 1;
      zipState.photosCount += countAttachmentFiles(startPhotoFiles, safeCard.startPhotoNote, cardPhotoUris.length);

      return fallbackCard;
    });
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
  const reportCards = new Array(Array.isArray(cards) ? cards.length : 0);
  const zipState = {
    activeCount: 0,
    archivedCount: 0,
    cardsCount: 0,
    eventsCount: 0,
    partialCount: 0,
    photosCount: 0,
    problemCount: 0,
    problemsCount: 0,
    quarantineCount: 0,
    soldCount: 0,
  };
  const zip = new JSZip();

  await Promise.all(
    (Array.isArray(cards) ? cards : []).map(async (card, index) => {
      const normalizedCard = await normalizeCard(card, zip, zipState, index);
      reportCards[index] = normalizedCard;
    }),
  );

  const currentEmployee = options.currentEmployee || null;
  const currentUser = options.currentUser || defaultCurrentUser || {};
  const report = {
    reportId: `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: reportCreatedAt,
    appVersion: require('../../package.json').version || '',
    deviceId,
    user: {
      userId: normalizeText(currentEmployee?.localUserId || currentUser.id || 'unknown-user') || 'unknown-user',
      firstName: normalizeText(currentEmployee?.firstName || ''),
      lastName: normalizeText(currentEmployee?.lastName || ''),
      displayName: normalizeText(currentEmployee?.displayName || 'Не указан') || 'Не указан',
      role: normalizeText(currentUser.role || 'employee') || 'employee',
    },
    testLocation: normalizeText(options.testLocation || ''),
    summary: {
      cardsCount: zipState.cardsCount,
      eventsCount: zipState.eventsCount,
      photosCount: zipState.photosCount,
      problemsCount: zipState.problemsCount,
      activeCount: zipState.activeCount,
      soldCount: zipState.soldCount,
      quarantineCount: zipState.quarantineCount,
      problemCount: zipState.problemCount,
      partialCount: zipState.partialCount,
      archivedCount: zipState.archivedCount,
    },
    cards: reportCards,
  };

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
  const reportLabel = sanitizeFileSegment(
    report.user.displayName || report.deviceId,
    report.deviceId,
  );
  const fileName = `sadovnik-report-${datePart}-${reportLabel}.zip`;

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
        message: 'ZIP-отчет Sadovnik Diary подготовлен в мобильном приложении.',
      });
      return 'web_ready';
    }

    const isSharingAvailable = await Sharing.isAvailableAsync();

    if (!isSharingAvailable) {
      await Share.share({
        title: noticeFileName,
        message: 'ZIP-отчет Sadovnik Diary подготовлен, но отправка файлов недоступна.',
      });
      return 'native_unavailable';
    }

    if (!fileUri) {
      await Share.share({
        title: noticeFileName,
        message: 'ZIP-отчет Sadovnik Diary подготовлен, но файл недоступен для отправки.',
      });
      return 'native_unavailable';
    }

    await Sharing.shareAsync(fileUri, {
      dialogTitle: 'Поделиться ZIP-отчетом Sadovnik Diary',
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
