// Утилиты для партий растений, количества и статусов карточек.
import {
  currentUser,
  INTRO_STAGE,
  QR_STATUS_LABELS,
  EMPTY_CATALOG_VALUE,
  stageMoveTargetLabels,
  stages,
} from './constants';
import { dateFromIso, getTodayIsoDate, isoFromDate } from './dates';
import { getProblemBatchStatusFromOperations } from './statusProblemValidation';
import {
  getLatestProblemRiskLevelFromOperations,
  getProblemStateFromOperations,
} from './problemState';

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
  ].filter((value) => Boolean(value) && value !== EMPTY_CATALOG_VALUE).join(' ') || card.name || card.code;
}

export function getCardLocationDescription(card) {
  const latestMovement = (card?.operations || []).find((operation) => operation.type === 'movement');

  return latestMovement?.nextLocation || card?.locationDescription || '';
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
    qrStatus: card.qrStatus || (card.code ? 'pending_print' : 'none'),
    createdAt: createdAtIso,
    createdBy: card.createdBy || currentUser.id,
    createdByName: card.createdByName || card.createdBy || currentUser.id,
  };
}

export function createQrGeneratedOperation(card, createdAtIso = new Date().toISOString(), user = currentUser) {
  return {
    id: `qr-generated-${card.id || Date.now()}`,
    type: 'qrGenerated',
    title: 'QR подготовлен к печати',
    date: card.createdAt,
    code: card.code,
    qrStatus: card.qrStatus || 'pending_print',
    createdAt: createdAtIso,
    createdBy: user.id,
    createdByName: user.fullName || user.id,
  };
}

export function normalizeCultureCard(card) {
  const operations = card.operations || [];
  const hasBatchCreatedOperation = operations.some((operation) => operation.type === 'batchCreated');
  const normalizedQrStatus = card.qrStatus || (card.qrPrinted ? 'printed' : card.code ? 'pending_print' : 'none');
  const normalizedStartPhotoUris = Array.isArray(card.startPhotoUris)
    ? card.startPhotoUris.filter(Boolean)
    : card.startPhotoUri
      ? [card.startPhotoUri]
      : [];
  const normalizedCard = {
    ...card,
    batchStatus: card.batchStatus === 'draft'
      ? 'active'
      : (card.batchStatus || (card.status === 'cancelled' ? 'cancelled' : 'active')),
    qrStatus: normalizedQrStatus,
    sterilityStatus: card.sterilityStatus || 'unchecked',
    sourceMaterial: card.sourceMaterial || card.sourcePlantName || '',
    parentBatch: card.parentBatch || '',
    startPhotoUri: normalizedStartPhotoUris[0] || '',
    startPhotoUris: normalizedStartPhotoUris,
  };
  const normalizedExistingOperations = operations.map((operation, index) => ({
    ...operation,
    id: operation.id || `${normalizedCard.id || 'card'}-${operation.type || 'operation'}-${operation.createdAt || operation.date || 'unknown'}-${index}`,
  }));
  const normalizedOperations = hasBatchCreatedOperation
    ? normalizedExistingOperations
    : [
      createBatchCreatedOperation(normalizedCard, normalizedCard.createdAt || new Date().toISOString()),
      ...normalizedExistingOperations,
    ];

  return {
    ...normalizedCard,
    operations: normalizedOperations,
    activeProblemQuantity: getCardActiveProblemQuantity({
      ...normalizedCard,
      operations: normalizedOperations,
    }),
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

export function getOperationSummaryItems(operation, card) {
  if (!operation) {
    return [];
  }
  const totalQuantity = Number(operation.totalQuantity || operation.cardQuantity || card?.quantity) || 0;
  const formatCountWithTotal = (value) => {
    if (value === undefined || value === null || value === '') {
      return '';
    }

    return totalQuantity
      ? `${value} из ${totalQuantity} шт.`
      : `${value} шт.`;
  };

  if (operation.type === 'planting') {
    return [
      ['Место высадки', operation.plantingLocation],
      ['Схема посадки', operation.plantingScheme],
      ['Площадь / участок', operation.plotArea],
      ['Тип грунта', operation.soilType],
      ['Комментарий', operation.comment],
    ].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'plantingObservation') {
    return [
      ['Приживаемость', operation.survivalRate],
      ['Уровень стресса', operation.stressLevel],
      ['Тургор', operation.turgor],
      ['Комментарий', operation.comment],
    ].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'plantingCare') {
    return [
      ['Тип ухода', operation.careType],
      ['Препарат', operation.productName],
      ['Дозировка', operation.dosage],
      ['Способ внесения', operation.applicationMethod],
      ['Реакция растений', operation.plantReaction],
      ['Комментарий', operation.comment],
    ].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'plantingCompletion') {
    return [
      ['Итог высадки', operation.completionResult],
      ['Комментарий', operation.comment],
    ].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'batchCreated') {
    return [
      ['Стадия', operation.stage],
      ['Количество', operation.quantity ? `${operation.quantity} шт.` : ''],
      ['QR', QR_STATUS_LABELS[operation.qrStatus] || operation.qrStatus],
    ].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'stageChange') {
    return [
      ['Укоренено', operation.rootedCount ? `${operation.rootedCount} шт.` : ''],
      ['Процент укоренения', operation.rootingPercent !== undefined ? `${operation.rootingPercent}%` : ''],
      ['Остаток', operation.currentQuantity !== undefined ? formatCountWithTotal(operation.currentQuantity) : ''],
    ].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'qrGenerated') {
    return [
      ['Код', operation.code],
      ['QR', QR_STATUS_LABELS[operation.qrStatus] || operation.qrStatus],
    ].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'statusChange') {
    return getStatusOperationItems(operation).map(([label, value]) => [label, `${value} шт.`]);
  }

  if (operation.type === 'movement') {
    return [
      ['Местоположение', `${operation.previousLocation || 'Не указано'} → ${operation.nextLocation || 'Не указано'}`],
      ['Комментарий', operation.comment],
    ].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'introLoss') {
    return [
      ['Остаток', operation.previousQuantity !== undefined && operation.currentQuantity !== undefined
        ? `${operation.previousQuantity} → ${operation.currentQuantity}`
        : ''],
      ['Причина', operation.reason || operation.lossReason],
    ].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'adaptationStress') {
    const legacyAdaptationEnvironmentItems = [
      ['Температура', operation.environmentTemperature],
      ['Влажность воздуха', operation.environmentAirHumidity || operation.environmentHumidity],
      ['Влажность субстрата', operation.substrateHumidity],
      ['Освещение', operation.environmentLight],
      ['Проветривание', operation.ventilation],
    ].filter(([, value]) => Boolean(value));

    return [
      ['Уровень стресса', operation.stressLevel],
      ['Стабильность', operation.stability],
      ['Тургор', operation.turgor],
      ['Комментарий', operation.comment],
      ...legacyAdaptationEnvironmentItems,
    ].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'hardeningObservation') {
    return [
      ['Уровень стресса', operation.stressLevel],
      ['Тургор', operation.turgor],
      ['Готовность к высадке', operation.readinessForPlanting],
      ['Комментарий', operation.comment],
    ].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'hardeningCare') {
    return [
      ['Тип ухода', operation.careType],
      ['Препарат', operation.productName],
      ['Дозировка', operation.dosage],
      ['Способ внесения', operation.applicationMethod],
      ['Реакция растений', operation.plantReaction],
      ['Комментарий', operation.comment],
    ].filter(([, value]) => Boolean(value));
  }

  if ([
    'rooting',
    'death',
    'discard',
    'sale',
    'propagation',
    'adaptationStress',
    'adaptationCare',
    'greenhouseObservation',
    'greenhouseCare',
    'hardeningObservation',
    'hardeningCare',
    'movement',
    'transplant',
    'introLoss',
  ].includes(operation.type)) {
    if (operation.type === 'propagation') {
      return [
        [operation.childCardId ? 'Создано в партии' : 'Добавлено', operation.count ? `${operation.count} шт.` : ''],
        ['Код дочерней партии', operation.childCode],
        ['Остаток', operation.currentQuantity !== undefined ? `${operation.currentQuantity} шт.` : ''],
        ['Способ размножения', operation.propagationMethod],
        ['Комментарий', operation.comment],
      ].filter(([, value]) => Boolean(value));
    }

    return [
      ['Количество', formatCountWithTotal(operation.count)],
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
      ['Интервал ухода', operation.careIntervalDays ? `${operation.careIntervalDays} дн.` : ''],
      ['Скорость роста', operation.growthRate],
      ['Уровень риска', operation.riskLevel],
      ['Болезнь', operation.diseaseName],
      ['Вредитель', operation.pestName],
      ['Степень поражения', operation.diseaseSeverity],
      ['Объем полива', operation.waterVolume],
      ['Интервал полива', operation.wateringIntervalDays ? `${operation.wateringIntervalDays} дн.` : ''],
      ['Препарат', operation.productName],
      ['Дозировка', operation.dosage],
      ['Способ', operation.applicationMethod],
      ['Реакция растений', operation.plantReaction],
      ['Размещение', operation.placement],
      ['Плотность', operation.densityChange],
      ['Комментарий', operation.comment],
    ].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'comment') {
    return [['Комментарий', operation.comment]].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'problem') {
    const affectedQuantity = Number(operation.affectedQuantity) || 0;
    const problemTotalQuantity = Number(operation.currentQuantity) || getCardCurrentQuantity(card);

    return [
      ['Тип проблемы', operation.problemType],
      ['Уровень риска', operation.riskLevel],
      ['Затронуто', affectedQuantity ? `${affectedQuantity} из ${problemTotalQuantity} шт.` : ''],
      ['Описание проблемы', operation.problemDescription],
      ['Комментарий', operation.comment],
    ].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'problemRecovery') {
    const recoveredQuantity = Number(operation.recoveredQuantity) || 0;
    const problemTotalQuantity = Number(operation.activeProblemQuantityBefore) || Number(operation.currentProblemQuantity) || 0;

    return [
      ['Выздоровело', recoveredQuantity ? `${recoveredQuantity} из ${problemTotalQuantity} шт.` : ''],
      ['Уровень риска', operation.riskLevel],
      ['Комментарий', operation.comment],
    ].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'problemIsolation') {
    return [
      ['Изолировано', operation.count || operation.quantity ? `${operation.count || operation.quantity} шт.` : ''],
      ['Новая партия', operation.childCode],
      ['Местоположение', operation.location || operation.nextLocation],
      ['Комментарий', operation.comment],
    ].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'clonedFromParent') {
    return [
      ['Родительская партия', operation.parentCode],
      ['Количество', operation.quantity ? `${operation.quantity} шт.` : ''],
      ['Поколение', operation.generation],
      ['Способ размножения', operation.propagationMethod],
    ].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'isolatedFromParent') {
    return [
      ['Родительская партия', operation.parentCode],
      ['Количество', operation.quantity ? `${operation.quantity} шт.` : ''],
      ['Местоположение', operation.location],
      ['Поколение', operation.generation],
    ].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'contamination') {
    return [['Описание', operation.contaminationNote]].filter(([, value]) => Boolean(value));
  }

  if (operation.type === 'quarantine') {
    return [['Причина', operation.quarantineReason || operation.reason]].filter(([, value]) => Boolean(value));
  }

  return [];
}

export function formatQuantityDisplay(currentQuantity, totalQuantity) {
  const normalizedCurrentQuantity = Number(currentQuantity) || 0;
  const normalizedTotalQuantity = Number(totalQuantity) || 0;

  if (
    normalizedTotalQuantity > 0 &&
    normalizedCurrentQuantity !== normalizedTotalQuantity &&
    normalizedCurrentQuantity <= normalizedTotalQuantity
  ) {
    return `${normalizedCurrentQuantity} из ${normalizedTotalQuantity} шт.`;
  }

  return `${normalizedCurrentQuantity} шт.`;
}

export function getCardActiveProblemQuantity(card) {
  return getProblemStateFromOperations(card?.operations || [], {
    currentQuantity: getCardCurrentQuantity(card),
    originType: card?.originType || '',
    stage: card?.stage || '',
  }).activeProblemQuantity;
}

export function getCardRemainingProblemQuantity(card) {
  return getProblemStateFromOperations(card?.operations || [], {
    activeProblemQuantity: getCardActiveProblemQuantity(card),
    currentQuantity: getCardCurrentQuantity(card),
    originType: card?.originType || '',
    stage: card?.stage || '',
  }).remainingProblemQuantity;
}

export function getLatestActiveProblemOperation(card) {
  return getProblemStateFromOperations(card?.operations || [], {
    activeProblemQuantity: getCardActiveProblemQuantity(card),
    currentQuantity: getCardCurrentQuantity(card),
    originType: card?.originType || '',
    stage: card?.stage || '',
  }).latestProblemOperation;
}

export function getCardHealthyQuantity(card) {
  return Math.max(getCardCurrentQuantity(card) - getCardActiveProblemQuantity(card), 0);
}

export function getLatestProblemRiskLevel(card) {
  return getLatestProblemRiskLevelFromOperations(card?.operations || []);
}

export function formatProblemAwareQuantityDisplay(card) {
  const activeProblemQuantity = getCardActiveProblemQuantity(card);
  const propagationQuantity = getCardPropagationQuantity(card);
  const sourceQuantity = getCardSourceQuantity(card);
  const lossQuantity = getCardLossQuantity(card);

  if (activeProblemQuantity <= 0) {
    if (propagationQuantity > 0) {
      return [
        `${getCardCurrentQuantity(card)} всего`,
        `${sourceQuantity} исходных`,
        `${propagationQuantity} размножено`,
        lossQuantity > 0 ? `потери ${lossQuantity}` : '',
      ].filter(Boolean).join(' · ');
    }

    return formatQuantityDisplay(sourceQuantity, card?.quantity);
  }

  return `${getCardHealthyQuantity(card)} здоровых · ${activeProblemQuantity} с проблемой`;
}

export function getCardPropagationQuantity(card) {
  const operations = card?.operations || [];
  const propagationQuantity = operations.reduce((sum, operation) => {
    if (operation.type === 'statusChange') {
      return sum + (Number(operation.propagationCount) || 0);
    }

    if (operation.type === 'propagation' && !operation.childCardId) {
      return sum + (Number(operation.count) || 0);
    }

    return sum;
  }, 0);
  const spentQuantity = operations.reduce((sum, operation) => {
    if (operation.type === 'statusChange') {
      return sum +
        (Number(operation.saleCount) || 0) +
        (Number(operation.deathCount) || 0) +
        (Number(operation.discardCount) || 0);
    }

    if (['sale', 'death', 'discard', 'introLoss'].includes(operation.type)) {
      return sum + (Number(operation.count) || 0);
    }

    return sum;
  }, 0);
  const sourceSpentQuantity = Math.min(Number(card?.quantity) || 0, spentQuantity);
  const propagationSpentQuantity = Math.max(spentQuantity - sourceSpentQuantity, 0);

  return Math.max(propagationQuantity - propagationSpentQuantity, 0);
}

export function getCardSourceQuantity(card) {
  return Math.max(getCardCurrentQuantity(card) - getCardPropagationQuantity(card), 0);
}

export function getCardLossQuantity(card) {
  return (card?.operations || []).reduce((sum, operation) => {
    if (operation.type === 'statusChange') {
      return sum +
        (Number(operation.deathCount) || 0) +
        (Number(operation.discardCount) || 0);
    }

    if (['death', 'discard', 'introLoss'].includes(operation.type)) {
      return sum + (Number(operation.count) || 0);
    }

    return sum;
  }, 0);
}

export function buildProblemQuantityPatch(card) {
  return {
    activeProblemQuantity: getCardActiveProblemQuantity(card),
  };
}

export function getCardCurrentQuantity(card) {
  const initialQuantity = Number(card?.quantity) || 0;
  const operations = card?.operations || [];

  return operations.reduce((quantity, operation) => {
    if (operation.type === 'statusChange') {
      const saleCount = Number(operation.saleCount) || 0;
      const deathCount = Number(operation.deathCount) || 0;
      const discardCount = Number(operation.discardCount) || 0;
      const propagationCount = Number(operation.propagationCount) || 0;

      return Math.max(quantity + propagationCount - saleCount - deathCount - discardCount, 0);
    }

    if (['sale', 'death', 'discard'].includes(operation.type)) {
      return Math.max(quantity - (Number(operation.count) || 0), 0);
    }

    if (operation.type === 'propagation' && !operation.childCardId) {
      return quantity + (Number(operation.count) || 0);
    }

    if (operation.type === 'introLoss') {
      return Math.max(quantity - (Number(operation.count) || 0), 0);
    }

    if (operation.type === 'problemIsolation') {
      return Math.max(quantity - (Number(operation.count || operation.quantity) || 0), 0);
    }

    return quantity;
  }, initialQuantity);
}

export function getCloneStats(card) {
  const initialQuantity = Number(card?.quantity) || 0;
  const operations = card?.operations || [];
  const activeProblemQuantity = getCardActiveProblemQuantity(card);
  const isProblemCard = (card?.batchStatus === 'problem' && activeProblemQuantity > 0) ||
    getProblemBatchStatusFromOperations(operations, card?.stage || '', activeProblemQuantity) === 'problem';
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
  const introLossCount = operations.reduce((sum, operation) => (
    sum + (operation.type === 'introLoss' ? Number(operation.count) || 0 : 0)
  ), 0);
  const lossCount = deathCount + discardCount + introLossCount;
  const rootingPercent = initialQuantity > 0
    ? Math.min(Math.round((rootedCount / initialQuantity) * 100), 100)
    : 0;
  const lossPercent = initialQuantity > 0
    ? Math.round((lossCount / initialQuantity) * 100)
    : 0;
  const currentQuantity = getCardCurrentQuantity(card);
  const riskStatus = (isProblemCard || lossPercent >= 30)
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

export function getIntroStats(card) {
  const operations = card?.operations || [];
  const initialQuantity = Number(card?.quantity) || 0;
  const activeProblemQuantity = getCardActiveProblemQuantity(card);
  const isProblemCard = (card?.batchStatus === 'problem' && activeProblemQuantity > 0) ||
    getProblemBatchStatusFromOperations(operations, card?.stage || '', activeProblemQuantity) === 'problem';
  const latestProblemRiskLevel = getLatestProblemRiskLevel(card);
  const deathCount = operations.reduce((sum, operation) => (
    sum + (operation.type === 'death' ? Number(operation.count) || 0 : 0)
  ), 0);
  const discardCount = operations.reduce((sum, operation) => (
    sum + (operation.type === 'discard' ? Number(operation.count) || 0 : 0)
  ), 0);
  const introLossCount = operations.reduce((sum, operation) => (
    sum + (operation.type === 'introLoss' ? Number(operation.count) || 0 : 0)
  ), 0);
  const lossCount = deathCount + discardCount + introLossCount;
  const lossPercent = initialQuantity > 0
    ? Math.round((lossCount / initialQuantity) * 100)
    : 0;
  const riskStatus = isProblemCard
    ? latestProblemRiskLevel || 'Критический'
    : lossPercent >= 30
      ? 'Критический'
    : lossPercent >= 15
      ? 'Повышенный'
      : 'Нормальный';

  return {
    initialQuantity,
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
  const activeProblemQuantity = getCardActiveProblemQuantity(card);
  const isProblemCard = (card?.batchStatus === 'problem' && activeProblemQuantity > 0) ||
    getProblemBatchStatusFromOperations(operations, card?.stage || '', activeProblemQuantity) === 'problem';
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
  const introLossCount = operations.reduce((sum, operation) => (
    sum + (operation.type === 'introLoss' ? Number(operation.count) || 0 : 0)
  ), 0);
  const stressLevel = getLatestOperationValue(operations, ['adaptationStress'], 'stressLevel') || 'Не указан';
  const turgor = getLatestOperationValue(operations, ['adaptationStress'], 'turgor') || 'Не указан';
  const stability = getLatestOperationValue(operations, ['adaptationStress'], 'stability') || 'Не указана';
  const riskStatus = stressLevel === 'Критический' || isProblemCard
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
    lossCount: deathCount + discardCount + introLossCount,
    stressLevel,
    turgor,
    stability,
    riskStatus,
  };
}

export function getGreenhouseStats(card) {
  const operations = card?.operations || [];
  const currentQuantity = getCardCurrentQuantity(card);
  const initialQuantity = Number(card?.quantity) || 0;
  const activeProblemQuantity = getCardActiveProblemQuantity(card);
  const isProblemCard = (card?.batchStatus === 'problem' && activeProblemQuantity > 0) ||
    getProblemBatchStatusFromOperations(operations, card?.stage || '', activeProblemQuantity) === 'problem';
  const careSchedules = getGreenhouseCareSchedules(card);
  const wateringSchedule = careSchedules.find((schedule) => schedule.careType === 'Полив');
  const overdueCareSchedules = careSchedules.filter((schedule) => schedule.isOverdue);
  const deathCount = operations.reduce((sum, operation) => (
    sum + (operation.type === 'death' ? Number(operation.count) || 0 : 0)
  ), 0);
  const discardCount = operations.reduce((sum, operation) => (
    sum + (operation.type === 'discard' ? Number(operation.count) || 0 : 0)
  ), 0);
  const saleCount = operations.reduce((sum, operation) => (
    sum + (operation.type === 'sale' ? Number(operation.count) || 0 : 0)
  ), 0);
  const transplantCount = operations.reduce((sum, operation) => (
    sum + (operation.type === 'transplant' ? Number(operation.count) || 0 : 0)
  ), 0);
  const growthRate = getLatestOperationValue(
    operations,
    ['greenhouseObservation', 'greenhouseCare', 'transplant'],
    'growthRate',
  ) || 'Не указана';
  const riskLevel = getLatestOperationValue(
    operations,
    ['greenhouseObservation', 'greenhouseCare'],
    'riskLevel',
  );
  const stressLevel = getLatestOperationValue(
    operations,
    ['greenhouseObservation'],
    'stressLevel',
  ) || 'Не указан';
  const stability = getLatestOperationValue(
    operations,
    ['greenhouseObservation', 'greenhouseCare', 'transplant'],
    'stability',
  ) || 'Не указана';
  const criticalDiseaseOperation = operations.find((operation) => (
    operation.type === 'problem' &&
    (operation.diseaseSeverity === 'Критическая' || operation.riskLevel === 'Критический')
  ));
  const introLossCount = operations.reduce((sum, operation) => (
    sum + (operation.type === 'introLoss' ? Number(operation.count) || 0 : 0)
  ), 0);
  const lossCount = deathCount + discardCount + introLossCount;
  const lossPercent = initialQuantity > 0
    ? Math.round((lossCount / initialQuantity) * 100)
    : 0;
  const riskStatus = criticalDiseaseOperation ||
    riskLevel === 'Критический' ||
    stressLevel === 'Критический' ||
    isProblemCard ||
    lossPercent >= 30
    ? 'Критический'
    : riskLevel === 'Высокий' || stressLevel === 'Высокий' || lossPercent >= 15
      ? 'Высокий'
      : riskLevel || 'Низкий';

  return {
    initialQuantity,
    currentQuantity,
    deathCount,
    discardCount,
    saleCount,
    transplantCount,
    lossCount,
    lossPercent,
    growthRate,
    riskStatus,
    stressLevel,
    stability,
    hasCriticalDisease: Boolean(criticalDiseaseOperation),
    careSchedules,
    overdueCareSchedules,
    lastWateringDate: wateringSchedule?.lastDate || '',
    nextWateringDate: wateringSchedule?.nextDate || '',
    wateringIntervalDays: wateringSchedule?.intervalDays || 2,
    wateringStatus: wateringSchedule?.status || 'Нет полива',
    wateringDaysOverdue: wateringSchedule?.daysOverdue || 0,
    isWateringOverdue: Boolean(wateringSchedule?.isOverdue),
    isWateringDueToday: Boolean(wateringSchedule?.isDueToday),
    hasOverdueCare: overdueCareSchedules.length > 0,
  };
}

export function getHardeningStats(card) {
  const operations = card?.operations || [];
  const currentQuantity = getCardCurrentQuantity(card);
  const initialQuantity = Number(card?.quantity) || 0;
  const activeProblemQuantity = getCardActiveProblemQuantity(card);
  const isProblemCard = (card?.batchStatus === 'problem' && activeProblemQuantity > 0) ||
    getProblemBatchStatusFromOperations(operations, card?.stage || '', activeProblemQuantity) === 'problem';
  const deathCount = operations.reduce((sum, operation) => (
    sum + (operation.type === 'death' ? Number(operation.count) || 0 : 0)
  ), 0);
  const discardCount = operations.reduce((sum, operation) => (
    sum + (operation.type === 'discard' ? Number(operation.count) || 0 : 0)
  ), 0);
  const saleCount = operations.reduce((sum, operation) => (
    sum + (operation.type === 'sale' ? Number(operation.count) || 0 : 0)
  ), 0);
  const introLossCount = operations.reduce((sum, operation) => (
    sum + (operation.type === 'introLoss' ? Number(operation.count) || 0 : 0)
  ), 0);
  const stressLevel = getLatestOperationValue(operations, ['hardeningObservation'], 'stressLevel') || 'Не указан';
  const turgor = getLatestOperationValue(operations, ['hardeningObservation'], 'turgor') || 'Не указан';
  const readinessForPlanting = getLatestOperationValue(
    operations,
    ['hardeningObservation'],
    'readinessForPlanting',
  ) || 'Не указана';
  const lossCount = deathCount + discardCount + introLossCount;
  const lossPercent = initialQuantity > 0
    ? Math.round((lossCount / initialQuantity) * 100)
    : 0;
  const riskStatus = stressLevel === 'Критический' || isProblemCard || lossPercent >= 30
    ? 'Критический'
    : stressLevel === 'Высокий'
      ? 'Повышенный'
      : 'Нормальный';

  return {
    initialQuantity,
    currentQuantity,
    deathCount,
    discardCount,
    saleCount,
    lossCount,
    lossPercent,
    stressLevel,
    turgor,
    readinessForPlanting,
    riskStatus,
  };
}

export function getAdaptationCareSchedules(card) {
  const operations = card?.operations || [];
  const careTypes = [
    { careType: 'Полив', emptyStatus: 'Нет полива', defaultIntervalDays: 2 },
    { careType: 'Профилактика', emptyStatus: 'Нет профилактики', defaultIntervalDays: 14 },
  ];
  const todayIso = getTodayIsoDate();
  const todayDate = dateFromIso(todayIso);

  return careTypes.map(({ careType, emptyStatus, defaultIntervalDays }) => {
    const latestCare = operations.find((operation) => (
      operation.type === 'adaptationCare' && operation.careType === careType
    ));
    const savedInterval = card?.adaptationCareIntervals?.[careType];
    const intervalDays = Number(savedInterval || defaultIntervalDays) || defaultIntervalDays;
    const lastDate = latestCare?.date || '';
    const nextDate = lastDate
      ? isoFromDate(new Date(
        dateFromIso(lastDate).getTime() + intervalDays * 24 * 60 * 60 * 1000,
      ))
      : '';
    const nextDateValue = nextDate ? dateFromIso(nextDate) : null;
    const daysOverdue = nextDateValue
      ? Math.max(Math.floor((todayDate - nextDateValue) / (24 * 60 * 60 * 1000)), 0)
      : 0;
    const status = !lastDate
      ? emptyStatus
      : daysOverdue > 0
        ? 'Просрочен'
        : nextDate === todayIso
          ? 'Сегодня'
          : 'В графике';

    return {
      careType,
      lastDate,
      nextDate,
      intervalDays,
      status,
      daysOverdue,
      isOverdue: status === 'Просрочен',
      isDueToday: status === 'Сегодня',
    };
  });
}

export function getGreenhouseCareSchedules(card) {
  const operations = card?.operations || [];
  const careTypes = [
    { careType: 'Полив', emptyStatus: 'Нет полива', defaultIntervalDays: 2 },
    { careType: 'Подкормка', emptyStatus: 'Нет подкормки', defaultIntervalDays: 14 },
    { careType: 'Профилактика', emptyStatus: 'Нет профилактики', defaultIntervalDays: 30 },
    { careType: 'Лечение', emptyStatus: 'Нет лечения', defaultIntervalDays: 7 },
  ];
  const todayIso = getTodayIsoDate();
  const todayDate = dateFromIso(todayIso);

  return careTypes.map(({ careType, emptyStatus, defaultIntervalDays }) => {
    const latestCare = operations.find((operation) => (
      operation.type === 'greenhouseCare' && operation.careType === careType
    ));
    const savedInterval = card?.greenhouseCareIntervals?.[careType];
    const intervalDays = Number(
      latestCare?.careIntervalDays ||
      latestCare?.wateringIntervalDays ||
      savedInterval ||
      (careType === 'Полив' ? card?.wateringIntervalDays : '') ||
      defaultIntervalDays,
    ) || defaultIntervalDays;
    const lastDate = latestCare?.date || '';
    const nextDate = lastDate
      ? isoFromDate(new Date(
        dateFromIso(lastDate).getTime() + intervalDays * 24 * 60 * 60 * 1000,
      ))
      : '';
    const nextDateValue = nextDate ? dateFromIso(nextDate) : null;
    const daysOverdue = nextDateValue
      ? Math.max(Math.floor((todayDate - nextDateValue) / (24 * 60 * 60 * 1000)), 0)
      : 0;
    const status = !lastDate
      ? emptyStatus
      : daysOverdue > 0
        ? 'Просрочен'
        : nextDate === todayIso
          ? 'Сегодня'
          : 'В графике';

    return {
      careType,
      lastDate,
      nextDate,
      intervalDays,
      status,
      daysOverdue,
      isOverdue: status === 'Просрочен',
      isDueToday: status === 'Сегодня',
    };
  });
}

export function getHardeningCareSchedules(card) {
  const operations = card?.operations || [];
  const careTypes = [
    { careType: 'Полив', emptyStatus: 'Нет полива', defaultIntervalDays: 2 },
    { careType: 'Подкормка', emptyStatus: 'Нет подкормки', defaultIntervalDays: 14 },
    { careType: 'Стимуляция', emptyStatus: 'Нет стимуляции', defaultIntervalDays: 14 },
    { careType: 'Профилактика', emptyStatus: 'Нет профилактики', defaultIntervalDays: 30 },
    { careType: 'Лечение', emptyStatus: 'Нет лечения', defaultIntervalDays: 7 },
  ];
  const todayIso = getTodayIsoDate();
  const todayDate = dateFromIso(todayIso);

  return careTypes.map(({ careType, emptyStatus, defaultIntervalDays }) => {
    const latestCare = operations.find((operation) => (
      operation.type === 'hardeningCare' && operation.careType === careType
    ));
    const savedInterval = card?.hardeningCareIntervals?.[careType];
    const intervalDays = Number(savedInterval || defaultIntervalDays) || defaultIntervalDays;
    const lastDate = latestCare?.date || '';
    const nextDate = lastDate
      ? isoFromDate(new Date(
        dateFromIso(lastDate).getTime() + intervalDays * 24 * 60 * 60 * 1000,
      ))
      : '';
    const nextDateValue = nextDate ? dateFromIso(nextDate) : null;
    const daysOverdue = nextDateValue
      ? Math.max(Math.floor((todayDate - nextDateValue) / (24 * 60 * 60 * 1000)), 0)
      : 0;
    const status = !lastDate
      ? emptyStatus
      : daysOverdue > 0
        ? 'Просрочен'
        : nextDate === todayIso
          ? 'Сегодня'
          : 'В графике';

    return {
      careType,
      lastDate,
      nextDate,
      intervalDays,
      status,
      daysOverdue,
      isOverdue: status === 'Просрочен',
      isDueToday: status === 'Сегодня',
    };
  });
}

export function getDaysInCurrentStage(card) {
  const stageStartDate = card?.stageChangedAt || card?.createdAt;

  if (!stageStartDate) {
    return 0;
  }

  const start = dateFromIso(stageStartDate);
  const today = dateFromIso(getTodayIsoDate());
  const millisecondsInDay = 24 * 60 * 60 * 1000;

  return Math.max(Math.floor((today - start) / millisecondsInDay) + 1, 1);
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

export function getPlantingStats(card) {
  const operations = card?.operations || [];
  const currentQuantity = getCardCurrentQuantity(card);
  const initialQuantity = Number(card?.quantity) || 0;
  const activeProblemQuantity = getCardActiveProblemQuantity(card);
  const isProblemCard = (card?.batchStatus === 'problem' && activeProblemQuantity > 0) ||
    getProblemBatchStatusFromOperations(operations, card?.stage || '', activeProblemQuantity) === 'problem';
  const deathCount = operations.reduce((sum, operation) => (
    sum + (operation.type === 'death' ? Number(operation.count) || 0 : 0)
  ), 0);
  const discardCount = operations.reduce((sum, operation) => (
    sum + (operation.type === 'discard' ? Number(operation.count) || 0 : 0)
  ), 0);
  const saleCount = operations.reduce((sum, operation) => (
    sum + (operation.type === 'sale' ? Number(operation.count) || 0 : 0)
  ), 0);
  const introLossCount = operations.reduce((sum, operation) => (
    sum + (operation.type === 'introLoss' ? Number(operation.count) || 0 : 0)
  ), 0);
  const survivalRate = getLatestOperationValue(operations, ['plantingObservation'], 'survivalRate') || 'Не указана';
  const stressLevel = getLatestOperationValue(operations, ['plantingObservation'], 'stressLevel') || 'Не указан';
  const turgor = getLatestOperationValue(operations, ['plantingObservation'], 'turgor') || 'Не указан';
  const completionResult = getLatestOperationValue(
    operations,
    ['plantingCompletion'],
    'completionResult',
  ) || 'Не указан';
  const lossCount = deathCount + discardCount + introLossCount;
  const lossPercent = initialQuantity > 0
    ? Math.round((lossCount / initialQuantity) * 100)
    : 0;
  const riskStatus = survivalRate === 'Низкая' || stressLevel === 'Критический' || completionResult === 'Не прижилась' || isProblemCard || lossPercent >= 30
    ? 'Критический'
    : survivalRate === 'Средняя' || stressLevel === 'Высокий' || completionResult === 'Частично прижилась' || lossPercent >= 15
      ? 'Повышенный'
      : 'Нормальный';

  return {
    initialQuantity,
    currentQuantity,
    deathCount,
    discardCount,
    saleCount,
    lossCount,
    lossPercent,
    survivalRate,
    stressLevel,
    turgor,
    completionResult,
    riskStatus,
  };
}
