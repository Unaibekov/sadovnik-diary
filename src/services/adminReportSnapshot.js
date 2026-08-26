import {
  getCardActiveProblemQuantity,
  getCardCurrentQuantity,
  getCardHealthyQuantity,
  getCardLocationDescription,
} from '../domain/batch';
import { currentUser as defaultCurrentUser } from '../domain/constants';
import { getResolvedBatchStatus } from '../domain/cardSelectors';

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
  'activeProblemQuantity',
  'healthyQuantity',
  'locationDescription',
  'createdAt',
  'updatedAt',
  'originType',
  'parentCardId',
  'parentCode',
  'sourceEventId',
  'generation',
  'healthStatus',
  'isolationStatus',
  'sourceProblemEventId',
  'qrStatus',
  'propagatedAt',
  'propagationMethod',
  'events',
  'extraFields',
  'operations',
]);

const EVENT_EXPORT_FIELDS = new Set([
  'id',
  'eventId',
  'type',
  'title',
  'stage',
  'date',
  'createdAt',
  'createdBy',
  'comment',
  'photoFiles',
  'problemType',
  'riskLevel',
  'affectedQuantity',
  'recoveredQuantity',
  'count',
  'quantity',
  'previousQuantity',
  'currentQuantity',
  'propagationMethod',
  'childCardId',
  'childCode',
  'parentCardId',
  'parentCode',
  'sourceEventId',
  'sourceProblemEventId',
  'parentProblemEventId',
  'generation',
  'location',
  'nextLocation',
  'extraFields',
]);

export function normalizeText(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return `${value}`.replace(/\r?\n/g, ' ').trim();
}

export function normalizeNumber(value, fallback = 0) {
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

    if (allowedFields.has(key)) {
      return extraFields;
    }

    extraFields[key] = value;
    return extraFields;
  }, {});
}

export function sanitizeFileSegment(value, fallback = 'report') {
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

function mergePhotoUris(...values) {
  return getPhotoUris(values.flatMap((value) => (Array.isArray(value) ? value : [value])));
}

function getCardPhotoUris(card) {
  return mergePhotoUris(card?.startPhotoUris, card?.startPhotoUri);
}

function getEventPhotoUris(operation) {
  return mergePhotoUris(operation?.photoUris, operation?.photoUri);
}

function countAttachmentFiles(filePaths, sourceUriCount = 0) {
  if (filePaths.length > 0) {
    return filePaths.length;
  }

  if (sourceUriCount > 0) {
    return 1;
  }

  return 0;
}

async function normalizeEvent(operation, card, zipState, addFile, index) {
  const safeOperation = operation || {};
  const eventId = normalizeText(safeOperation.id) || `${normalizeText(card?.id) || 'card'}-${index + 1}`;
  const eventPhotoUris = getEventPhotoUris(safeOperation);
  const eventPhotoFiles = [];

  await Promise.all(
    eventPhotoUris.map(async (photoUri, photoIndex) => {
      if (typeof addFile !== 'function') {
        return;
      }

      const extension = getFileExtension(photoUri);
      const relativeFileName = `photos/${sanitizeFileSegment(eventId)}_${photoIndex + 1}${extension}`;
      const isAdded = await addFile(relativeFileName, photoUri);

      if (isAdded) {
        eventPhotoFiles.push(relativeFileName);
      }
    }),
  );

  const normalizedEvent = {
    eventId,
    type: normalizeText(safeOperation.type),
    title: normalizeText(safeOperation.title || safeOperation.type),
    stage: normalizeText(safeOperation.stage || card?.stage || ''),
    date: normalizeText(safeOperation.date),
    createdAt: normalizeText(safeOperation.createdAt),
    createdBy: normalizeText(safeOperation.createdBy),
    comment: normalizeText(safeOperation.comment),
    photoFiles: eventPhotoFiles,
    problemType: normalizeText(safeOperation.problemType),
    riskLevel: normalizeText(safeOperation.riskLevel),
    affectedQuantity: normalizeNumber(safeOperation.affectedQuantity, 0),
    recoveredQuantity: normalizeNumber(safeOperation.recoveredQuantity, 0),
    count: normalizeNumber(safeOperation.count, 0),
    quantity: normalizeNumber(safeOperation.quantity, 0),
    previousQuantity: normalizeNumber(safeOperation.previousQuantity, 0),
    currentQuantity: normalizeNumber(safeOperation.currentQuantity, 0),
    propagationMethod: normalizeText(safeOperation.propagationMethod),
    childCardId: normalizeText(safeOperation.childCardId),
    childCode: normalizeText(safeOperation.childCode),
    parentCardId: normalizeText(safeOperation.parentCardId),
    parentCode: normalizeText(safeOperation.parentCode),
    sourceEventId: normalizeText(safeOperation.sourceEventId),
    sourceProblemEventId: normalizeText(safeOperation.sourceProblemEventId),
    parentProblemEventId: normalizeText(safeOperation.parentProblemEventId),
    generation: normalizeNumber(safeOperation.generation, 0),
    location: normalizeText(safeOperation.location || safeOperation.nextLocation),
    extraFields: buildExtraFields(safeOperation, EVENT_EXPORT_FIELDS),
  };

  zipState.eventsCount += 1;
  zipState.photosCount += countAttachmentFiles(
    normalizedEvent.photoFiles,
    eventPhotoUris.length,
  );

  if ([
    'problem',
    'contamination',
    'quarantine',
  ].includes(normalizedEvent.type)) {
    zipState.problemsCount += 1;
  }

  return normalizedEvent;
}

async function normalizeCard(card, zipState, addFile, index) {
  const safeCard = card || {};
  const cardId = normalizeText(safeCard.id) || `card-${index + 1}`;
  const cardPhotoUris = getCardPhotoUris(safeCard);
  const startPhotoFiles = [];
  const operations = Array.isArray(safeCard.operations) ? safeCard.operations : [];
  const normalizedOperations = operations
    .filter((operation) => operation?.type !== 'stageSettingsUpdated');

  await Promise.all(
    cardPhotoUris.map(async (photoUri, photoIndex) => {
      if (typeof addFile !== 'function') {
        return;
      }

      const extension = getFileExtension(photoUri);
      const relativeFileName = `photos/${sanitizeFileSegment(`${cardId}_start`)}_${photoIndex + 1}${extension}`;
      const isAdded = await addFile(relativeFileName, photoUri);

      if (isAdded) {
        startPhotoFiles.push(relativeFileName);
      }
    }),
  );

  const events = await Promise.all(
    normalizedOperations.map((operation, eventIndex) => normalizeEvent(
      operation,
      safeCard,
      zipState,
      addFile,
      eventIndex,
    )),
  );

  const batchStatus = normalizeText(getResolvedBatchStatus(safeCard) || safeCard.batchStatus || safeCard.status || 'active') || 'active';
  const activeProblemQuantity = normalizeNumber(getCardActiveProblemQuantity(safeCard), 0);
  const healthyQuantity = normalizeNumber(getCardHealthyQuantity(safeCard), 0);
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
    activeProblemQuantity,
    healthyQuantity,
    locationDescription: normalizeText(getCardLocationDescription(safeCard)),
    createdAt: normalizeText(safeCard.createdAt),
    updatedAt: normalizeText(safeCard.updatedAt || safeCard.createdAt),
    originType: normalizeText(safeCard.originType),
    parentCardId: normalizeText(safeCard.parentCardId),
    parentCode: normalizeText(safeCard.parentCode),
    sourceEventId: normalizeText(safeCard.sourceEventId),
    generation: normalizeNumber(safeCard.generation, 0),
    healthStatus: normalizeText(safeCard.healthStatus),
    isolationStatus: normalizeText(safeCard.isolationStatus),
    sourceProblemEventId: normalizeText(safeCard.sourceProblemEventId),
    qrStatus: normalizeText(safeCard.qrStatus),
    propagatedAt: normalizeText(safeCard.propagatedAt),
    propagationMethod: normalizeText(safeCard.propagationMethod),
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

  zipState.photosCount += countAttachmentFiles(startPhotoFiles, cardPhotoUris.length);

  return normalizedCard;
}

export async function buildAdminReportSnapshot(cards, options = {}, deps = {}) {
  const reportCreatedAt = normalizeText(options.reportCreatedAt || deps.reportCreatedAt || new Date().toISOString()) || new Date().toISOString();
  const deviceId = normalizeText(options.deviceId || deps.deviceId || 'unknown-device') || 'unknown-device';
  const addFile = typeof deps.addFile === 'function' ? deps.addFile : null;
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

  await Promise.all(
    (Array.isArray(cards) ? cards : []).map(async (card, index) => {
      const normalizedCard = await normalizeCard(card, zipState, addFile, index);
      reportCards[index] = normalizedCard;
    }),
  );

  const currentEmployee = options.currentEmployee || null;
  const currentUser = options.currentUser || defaultCurrentUser || {};
  const report = {
    reportId: normalizeText(options.reportId || deps.reportId || `report-${Date.now()}`) || `report-${Date.now()}`,
    createdAt: reportCreatedAt,
    appVersion: normalizeText(options.appVersion || deps.appVersion || require('../../package.json').version || ''),
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

  return report;
}
