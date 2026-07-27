// Подготовка данных карточки партии для списка выбранной стадии.
import {
  getAdaptationStats,
  getCardActiveProblemQuantity,
  getCardCurrentQuantity,
  getCardDisplayName,
  getCloneStats,
  getDaysInCurrentStage,
  getGreenhouseStats,
  getHardeningStats,
  getIntroStats,
  getPlantingStats,
  getQrStatus,
} from './batch';
import { INTRO_STAGE, stages } from './constants';
import { getProblemStateFromOperations } from './problemState';

function getPlantsWord(quantity) {
  const value = Math.abs(Number(quantity) || 0);
  const lastDigit = value % 10;
  const lastTwoDigits = value % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return 'растений';
  }

  if (lastDigit === 1) {
    return 'растение';
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'растения';
  }

  return 'растений';
}

function formatDaysInStage(days) {
  const value = Math.max(days, 1);
  const lastDigit = value % 10;
  const lastTwoDigits = value % 100;
  const suffix = lastTwoDigits >= 11 && lastTwoDigits <= 14
    ? 'дней'
    : lastDigit === 1
      ? 'день'
      : lastDigit >= 2 && lastDigit <= 4
        ? 'дня'
        : 'дней';

  return `${value} ${suffix} в стадии`;
}

export function formatBatchQuantity(card) {
  const explicitCurrentQuantity = Number(card?.currentQuantity);
  const hasExplicitCurrentQuantity = card?.currentQuantity !== undefined &&
    card.currentQuantity !== null &&
    card.currentQuantity !== '';
  const currentQuantity = hasExplicitCurrentQuantity && Number.isFinite(explicitCurrentQuantity)
    ? explicitCurrentQuantity
    : getCardCurrentQuantity(card);

  return `${currentQuantity} ${getPlantsWord(currentQuantity)}`;
}

export function getBatchOriginLabel(card) {
  if (card?.originType === 'problemIsolation') {
    return 'Изолированная партия';
  }

  if (card?.originType === 'cloned') {
    return 'Клонированная партия';
  }

  return '';
}

export function getBatchQrLabel(card) {
  const qrStatus = getQrStatus(card);

  if (qrStatus === 'pending_print' || qrStatus === 'pendingPrint') {
    return 'QR ожидает печати';
  }

  return '';
}

export function getBatchProblemStatus(card) {
  const activeProblemQuantity = getCardActiveProblemQuantity(card);
  const problemState = getProblemStateFromOperations(card?.operations || [], {
    activeProblemQuantity,
    currentQuantity: getCardCurrentQuantity(card),
    originType: card?.originType || '',
    stage: card?.stage || '',
  });

  return {
    activeProblemQuantity: problemState.activeProblemQuantity,
    batchStatus: problemState.batchStatus,
    isActive: problemState.isActive,
    problemType: problemState.problemType,
    riskLevel: problemState.riskLevel,
  };
}

function getStageRiskStatus(card, options) {
  const {
    isAdaptationStage,
    isCloneStage,
    isCultureIntroStage,
    isGreenhouseStage,
    isHardeningStage,
    isPlantingStage,
  } = options;

  if (isCultureIntroStage) {
    return getIntroStats(card).riskStatus;
  }

  if (isCloneStage) {
    return getCloneStats(card).riskStatus;
  }

  if (isAdaptationStage) {
    return getAdaptationStats(card).riskStatus;
  }

  if (isGreenhouseStage) {
    return getGreenhouseStats(card).riskStatus;
  }

  if (isHardeningStage) {
    return getHardeningStats(card).readinessForPlanting === 'Готова' ? '' : 'Требует внимания';
  }

  if (isPlantingStage) {
    return (typeof getPlantingStats === 'function'
      ? getPlantingStats(card)
      : { riskStatus: 'Нормальный' }
    ).riskStatus;
  }

  return '';
}

function getStageSpecificRows(card, options) {
  const {
    isCultureIntroStage,
    isGreenhouseStage,
    isHardeningStage,
    isPlantingStage,
  } = options;
  const daysInStage = getDaysInCurrentStage(card);
  const rows = [];

  if (isCultureIntroStage && daysInStage >= 14) {
    rows.push({
      accessibilityLabel: 'Готово к смене стадии',
      key: 'stage-ready',
      text: 'Готово к смене стадии',
      tone: 'warning',
    });
  }

  if (isGreenhouseStage && getGreenhouseStats(card).hasOverdueCare) {
    rows.push({
      accessibilityLabel: 'Уход просрочен',
      key: 'overdue-care',
      text: 'Уход просрочен',
      tone: 'problem',
    });
  }

  if (isHardeningStage) {
    const hardeningStats = getHardeningStats(card);

    rows.push({
      accessibilityLabel: `Готовность: ${hardeningStats.readinessForPlanting}`,
      key: 'hardening-readiness',
      text: `Готовность: ${hardeningStats.readinessForPlanting}`,
      tone: hardeningStats.readinessForPlanting === 'Готова' ? 'success' : 'warning',
    });
  }

  if (isPlantingStage) {
    const plantingStats = typeof getPlantingStats === 'function'
      ? getPlantingStats(card)
      : {
        completionResult: 'Не указан',
        survivalRate: 'Не указана',
      };
    const text = plantingStats.completionResult !== 'Не указан'
      ? `Итог: ${plantingStats.completionResult}`
      : `Приживаемость: ${plantingStats.survivalRate}`;

    rows.push({
      accessibilityLabel: text,
      key: 'planting-completion',
      text,
      tone: plantingStats.completionResult === 'Прижилась' ? 'success' : 'warning',
    });
  }

  return rows;
}

export function getBatchSecondaryRows(card, options = {}) {
  const problemStatus = getBatchProblemStatus(card);
  const originLabel = getBatchOriginLabel(card);
  const qrLabel = getBatchQrLabel(card);
  const stageRiskStatus = getStageRiskStatus(card, options);
  const rows = [];

  if (originLabel) {
    rows.push({
      accessibilityLabel: originLabel,
      key: 'origin',
      text: originLabel,
      tone: card?.originType === 'cloned' ? 'success' : 'neutral',
    });
  }

  if (problemStatus.isActive) {
    const problemSummaryParts = [
      problemStatus.problemType || 'Проблема',
      problemStatus.riskLevel ? `${problemStatus.riskLevel.toLowerCase()} риск` : '',
    ].filter(Boolean);

    rows.push({
      accessibilityLabel: `Проблема активна: ${problemSummaryParts.join(', ')}`,
      key: 'problem-summary',
      text: `Активна: ${problemSummaryParts.join(' · ')}`,
      tone: 'problemStrong',
    });

    if (problemStatus.activeProblemQuantity > 0 && card?.originType !== 'problemIsolation') {
      rows.push({
        accessibilityLabel: `Нужно изолировать проблемных растений: ${problemStatus.activeProblemQuantity}`,
        key: 'isolation-needed',
        text: `Изолировать: ${problemStatus.activeProblemQuantity}`,
        tone: 'problem',
      });
    }
  } else if (stageRiskStatus && !['Нормальный', 'Низкий'].includes(stageRiskStatus)) {
    rows.push({
      accessibilityLabel: `Риск: ${stageRiskStatus}`,
      key: 'stage-risk',
      text: `Риск: ${stageRiskStatus}`,
      tone: 'problem',
    });
  }

  rows.push(...getStageSpecificRows(card, options));

  if (qrLabel) {
    rows.push({
      accessibilityLabel: qrLabel,
      key: 'qr',
      text: qrLabel,
      tone: 'neutral',
    });
  }

  return rows;
}

export function buildCultureListCardViewData(card, options = {}) {
  const daysInStage = getDaysInCurrentStage(card);
  const quantityLabel = formatBatchQuantity(card);
  const stageLabel = card?.stage || options.selectedStage || INTRO_STAGE;
  const secondaryRows = getBatchSecondaryRows(card, options);
  const problemStatus = getBatchProblemStatus(card);
  const originLabel = getBatchOriginLabel(card);
  const qrLabel = getBatchQrLabel(card);
  const accessibilityParts = [
    `Партия ${getCardDisplayName(card)}`,
    quantityLabel,
    `стадия ${stageLabel}`,
    problemStatus.isActive
      ? `активная проблема${problemStatus.problemType ? ` ${problemStatus.problemType}` : ''}`
      : '',
    originLabel,
    qrLabel,
  ].filter(Boolean);

  return {
    accessibilityLabel: accessibilityParts.join(', '),
    hasActiveProblem: problemStatus.isActive,
    hasProblemMarker: problemStatus.isActive,
    meta: [
      {
        accessibilityLabel: `Количество: ${quantityLabel}`,
        icon: 'quantity',
        key: 'quantity',
        value: quantityLabel,
      },
      {
        accessibilityLabel: formatDaysInStage(daysInStage),
        icon: 'days',
        key: 'days',
        value: formatDaysInStage(daysInStage),
      },
    ],
    quantityLabel,
    secondaryRows,
    stage: stageLabel,
    stageOrder: stages.indexOf(stageLabel),
  };
}
