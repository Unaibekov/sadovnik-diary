import {
  currentUser,
  INTRO_STAGE,
  QR_STATUS_LABELS,
  stageMoveTargetLabels,
  stages,
} from './constants';
import { dateFromIso, getTodayIsoDate } from './dates';

export function generatePlantingCode(createdAt, stage) {
  const prefix = stage === 'Клонирование'
    ? 'KL'
    : stage === 'Адаптация'
      ? 'AD'
      : 'VK';
  const datePart = createdAt.replaceAll('-', '');
  const now = new Date();
  const hours = `${now.getHours()}`.padStart(2, '0');
  const minutes = `${now.getMinutes()}`.padStart(2, '0');
  const seconds = `${now.getSeconds()}`.padStart(2, '0');

  return `${prefix}-${datePart}-${hours}${minutes}${seconds}`;
}

export function getCardDisplayName(card) {
  return [
    card.cultureName,
    card.speciesName,
    card.varietyName,
  ].filter(Boolean).join(' ') || card.name || card.code;
}

export function createBatchCreatedOperation(card, createdAtIso = new Date().toISOString()) {
  return {
    id: `batch-created-${card.id || Date.now()}`,
    type: 'batchCreated',
    title: 'Создание партии',
    date: card.createdAt,
    stage: card.stage || INTRO_STAGE,
    quantity: card.quantity,
    code: card.code,
    createdAt: createdAtIso,
    createdBy: card.createdBy || currentUser.id,
  };
}

export function createQrGeneratedOperation(card, createdAtIso = new Date().toISOString()) {
  return {
    id: `qr-generated-${card.id || Date.now()}`,
    type: 'qrGenerated',
    title: 'QR подготовлен к печати',
    date: card.createdAt,
    code: card.code,
    qrStatus: card.qrStatus || 'pending_print',
    createdAt: createdAtIso,
    createdBy: currentUser.id,
  };
}

export function normalizeCultureCard(card) {
  const operations = card.operations || [];
  const hasBatchCreatedOperation = operations.some((operation) => operation.type === 'batchCreated');
  const hasQrGeneratedOperation = operations.some((operation) => operation.type === 'qrGenerated');
  const normalizedQrStatus = card.qrStatus || (card.qrPrinted ? 'printed' : card.code ? 'pending_print' : 'none');
  const normalizedCard = {
    ...card,
    batchStatus: card.batchStatus || (card.status === 'cancelled' ? 'cancelled' : 'active'),
    qrStatus: normalizedQrStatus,
    sterilityStatus: card.sterilityStatus || 'unchecked',
    sourceMaterial: card.sourceMaterial || card.sourcePlantName || '',
    parentBatch: card.parentBatch || '',
    startPhotoNote: card.startPhotoNote || '',
  };
  const normalizedOperations = [
    ...(!hasQrGeneratedOperation && normalizedCard.code
      ? [createQrGeneratedOperation(normalizedCard, normalizedCard.createdAt || new Date().toISOString())]
      : []),
    ...(!hasBatchCreatedOperation
      ? [createBatchCreatedOperation(normalizedCard, normalizedCard.createdAt || new Date().toISOString())]
      : []),
    ...operations,
  ];

  if (hasBatchCreatedOperation && hasQrGeneratedOperation) {
    return normalizedCard;
  }

  return {
    ...normalizedCard,
    operations: normalizedOperations,
  };
}

export function getStatusOperationItems(operation) {
  if (!operation) {
    return [];
  }

  return [
    ['Укоренение', operation.rootedCount || operation.transplantCount],
    ['Размножение', operation.propagationCount],
    ['Продажа', operation.saleCount],
    ['Гибель', operation.deathCount],
    ['Выбраковка', operation.discardCount],
  ].filter(([, value]) => Number(value) > 0);
}

export function getOperationSummaryItems(operation) {
  if (!operation) {
    return [];
  }

  if (operation.type === 'batchCreated') {
    return [
      ['Стадия', operation.stage],
      ['Количество', operation.quantity ? `${operation.quantity} шт.` : ''],
      ['Код', operation.code],
    ].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'stageChange') {
    return [
      ['Откуда', operation.fromStage],
      ['Куда', operation.toStage],
      ['Укоренено', operation.rootedCount ? `${operation.rootedCount} шт.` : ''],
      ['Процент укоренения', operation.rootingPercent !== undefined ? `${operation.rootingPercent}%` : ''],
      ['Остаток', operation.currentQuantity ? `${operation.currentQuantity} шт.` : ''],
    ].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'qrGenerated') {
    return [
      ['Код', operation.code],
      ['QR', QR_STATUS_LABELS[operation.qrStatus] || operation.qrStatus],
    ].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'stageSettingsUpdated') {
    return [
      ['Стадия', operation.stage],
      ['Температура', operation.temperatureRequirement],
      ['Влажность', operation.humidityRequirement],
      ['Освещенность', operation.lightRequirement],
      [
        'Профилактика',
        (operation.preventionItems || []).map((item) => item.name).filter(Boolean).join('; '),
      ],
    ].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'statusChange') {
    return getStatusOperationItems(operation).map(([label, value]) => [label, `${value} шт.`]);
  }

  if ([
    'rooting',
    'death',
    'discard',
    'sale',
    'propagation',
    'adaptationStress',
    'adaptationEnvironment',
    'adaptationHumidityReduction',
    'adaptationCare',
  ].includes(operation.type)) {
    return [
      ['Количество', operation.count ? `${operation.count} шт.` : ''],
      ['Причина', operation.reason],
      ['Тип реализации', operation.saleType],
      ['Получатель', operation.recipient],
      ['Стоимость', operation.saleAmount],
      ['Способ размножения', operation.propagationMethod],
      ['Уровень стресса', operation.stressLevel],
      ['Состояние', operation.conditionDescription],
      ['Температура', operation.environmentTemperature],
      ['Влажность воздуха', operation.environmentAirHumidity || operation.environmentHumidity],
      ['Влажность субстрата', operation.substrateHumidity],
      ['Снижение влажности', operation.humidityReduction],
      ['Освещение', operation.environmentLight],
      ['Проветривание', operation.ventilation],
      ['Тургор', operation.turgor],
      ['Стабильность', operation.stability],
      ['Уход', operation.careType],
      ['Комментарий', operation.comment],
      ['Фото', operation.photoNote],
    ].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'comment') {
    return [['Комментарий', operation.comment]].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'photo') {
    return [['Фото', operation.photoNote]].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'contamination') {
    return [['Описание', operation.contaminationNote]].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'quarantine') {
    return [['Причина', operation.quarantineReason || operation.reason]].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'quarantineReleased') {
    return [['Причина снятия', operation.reason]].filter(([, value]) => Boolean(value));
  }

  return [];
}

export function getCardCurrentQuantity(card) {
  const initialQuantity = Number(card?.quantity) || 0;
  const operations = card?.operations || [];

  return operations.reduce((quantity, operation) => {
    if (operation.type === 'statusChange') {
      const saleCount = Number(operation.saleCount) || 0;
      const deathCount = Number(operation.deathCount) || 0;
      const discardCount = Number(operation.discardCount) || 0;

      return Math.max(quantity - saleCount - deathCount - discardCount, 0);
    }

    if (['sale', 'death', 'discard'].includes(operation.type)) {
      return Math.max(quantity - (Number(operation.count) || 0), 0);
    }

    return quantity;
  }, initialQuantity);
}

export function getCloneStats(card) {
  const initialQuantity = Number(card?.quantity) || 0;
  const operations = card?.operations || [];
  const rootedCount = operations.reduce((sum, operation) => {
    if (operation.type === 'rooting') {
      return sum + (Number(operation.count) || 0);
    }

    if (operation.type === 'statusChange') {
      return sum + (Number(operation.rootedCount || operation.transplantCount) || 0);
    }

    return sum;
  }, 0);
  const deathCount = operations.reduce((sum, operation) => (
    sum + (operation.type === 'death' ? Number(operation.count) || 0 : 0)
  ), 0);
  const discardCount = operations.reduce((sum, operation) => (
    sum + (operation.type === 'discard' ? Number(operation.count) || 0 : 0)
  ), 0);
  const saleCount = operations.reduce((sum, operation) => (
    sum + (operation.type === 'sale' ? Number(operation.count) || 0 : 0)
  ), 0);
  const propagationCount = operations.reduce((sum, operation) => (
    sum + (operation.type === 'propagation' ? Number(operation.count) || 0 : 0)
  ), 0);
  const lossCount = deathCount + discardCount;
  const rootingPercent = initialQuantity > 0
    ? Math.min(Math.round((rootedCount / initialQuantity) * 100), 100)
    : 0;
  const lossPercent = initialQuantity > 0
    ? Math.round((lossCount / initialQuantity) * 100)
    : 0;
  const currentQuantity = getCardCurrentQuantity(card);
  const riskStatus = (card?.batchStatus === 'problem' || lossPercent >= 30)
    ? 'Критический'
    : lossPercent >= 15
      ? 'Повышенный'
      : 'Нормальный';

  return {
    currentQuantity,
    initialQuantity,
    rootedCount,
    rootingPercent,
    deathCount,
    discardCount,
    saleCount,
    propagationCount,
    lossCount,
    lossPercent,
    riskStatus,
  };
}

export function getLatestOperationValue(operations, types, field) {
  const operation = operations.find((item) => types.includes(item.type) && item[field]);

  return operation?.[field] || '';
}

export function getAdaptationStats(card) {
  const operations = card?.operations || [];
  const currentQuantity = getCardCurrentQuantity(card);
  const initialQuantity = Number(card?.quantity) || 0;
  const survivalPercent = initialQuantity > 0
    ? Math.round((currentQuantity / initialQuantity) * 100)
    : 0;
  const deathCount = operations.reduce((sum, operation) => (
    sum + (operation.type === 'death' ? Number(operation.count) || 0 : 0)
  ), 0);
  const discardCount = operations.reduce((sum, operation) => (
    sum + (operation.type === 'discard' ? Number(operation.count) || 0 : 0)
  ), 0);
  const saleCount = operations.reduce((sum, operation) => (
    sum + (operation.type === 'sale' ? Number(operation.count) || 0 : 0)
  ), 0);
  const stressLevel = getLatestOperationValue(operations, ['adaptationStress'], 'stressLevel') || 'Не указан';
  const turgor = getLatestOperationValue(operations, ['adaptationStress', 'adaptationEnvironment', 'adaptationHumidityReduction'], 'turgor') || 'Не указан';
  const stability = getLatestOperationValue(operations, ['adaptationStress', 'adaptationEnvironment', 'adaptationHumidityReduction'], 'stability') || 'Не указана';
  const riskStatus = stressLevel === 'Критический' || card?.batchStatus === 'problem'
    ? 'Критический'
    : stressLevel === 'Высокий'
      ? 'Повышенный'
      : 'Нормальный';

  return {
    initialQuantity,
    currentQuantity,
    survivalPercent,
    deathCount,
    discardCount,
    saleCount,
    lossCount: deathCount + discardCount,
    stressLevel,
    turgor,
    stability,
    riskStatus,
  };
}

export function getDaysInCurrentStage(card) {
  const stageStartDate = card?.stageChangedAt || card?.createdAt;

  if (!stageStartDate) {
    return 0;
  }

  const start = dateFromIso(stageStartDate);
  const today = dateFromIso(getTodayIsoDate());
  const millisecondsInDay = 24 * 60 * 60 * 1000;

  return Math.max(Math.floor((today - start) / millisecondsInDay), 0);
}

export function isPositiveInteger(value) {
  return /^[1-9]\d*$/.test(`${value}`.trim());
}

export function getQrStatus(card) {
  if (card?.qrStatus && !(card.qrStatus === 'none' && card.code)) {
    return card.qrStatus;
  }

  if (card?.qrPrinted) {
    return 'printed';
  }

  return card?.code ? 'pending_print' : 'none';
}

export function canEditIdentityFields(user, card) {
  if (!card?.qrPrinted) {
    return true;
  }

  return user.role === 'admin' || user.role === 'superadmin';
}

export function getNextStage(stage) {
  const currentStageIndex = stages.indexOf(stage);

  if (currentStageIndex < 0 || currentStageIndex >= stages.length - 1) {
    return '';
  }

  return stages[currentStageIndex + 1];
}

export function getStageMoveButtonLabel(nextStage) {
  if (!nextStage) {
    return 'Следующей стадии нет';
  }

  return `Переместить в ${stageMoveTargetLabels[nextStage] || nextStage.toLocaleLowerCase('ru-RU')}`;
}
