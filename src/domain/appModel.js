// Собирает и нормализует основную модель состояния приложения.
import {
  canEditIdentityFields,
  getAdaptationStats,
  getCardCurrentQuantity,
  getCloneStats,
  getDaysInCurrentStage,
  getHardeningStats,
  getPlantingStats,
  getNextStage,
} from './batch';
import { getLatestFilledCalendarDate } from './journal';
import { isDuplicateCardCode } from './cultureForm';
import { getStageMoveButtonLabel } from './batch';
import { INTRO_STAGE, stageMoveTargetLabels, stages } from './constants';

export function getBottomInset(safeAreaInsets) {
  return Math.max(safeAreaInsets.bottom || 0, 0);
}

export function getStageMoveButtonLabelText(selectedCardNextStage) {
  return selectedCardNextStage
    ? `В ${stageMoveTargetLabels[selectedCardNextStage] || selectedCardNextStage.toLocaleLowerCase('ru-RU')}`
    : getStageMoveButtonLabel(selectedCardNextStage);
}

export function getRecommendationSourceCards(
  recommendationCard,
  cultureCards,
  recommendationStage,
) {
  if (recommendationCard) {
    return [recommendationCard];
  }

  return cultureCards.filter(
    (card) =>
      (card.stage || INTRO_STAGE) === recommendationStage &&
      card.status !== 'cancelled' &&
      card.status !== 'archived',
  );
}

export function getRecommendationStage(
  recommendationsContext,
  selectedCard,
  selectedStage,
) {
  return recommendationsContext?.stage || selectedCard?.stage || selectedStage;
}

export function canReleaseQuarantineForRole(userRole) {
  return ['agronomist', 'admin', 'superadmin'].includes(userRole);
}

export function isSelectedCardActionLocked(selectedCard) {
  return (
    selectedCard?.batchStatus === 'quarantine' ||
    selectedCard?.sterilityStatus === 'contaminated'
  );
}

export function isSupportedPlantingStageForStage(selectedStage) {
  return stages.includes(selectedStage);
}

export function getStageMoveBlockedMessage(selectedCard) {
  if (
    selectedCard?.stage === INTRO_STAGE &&
    selectedCard.sterilityStatus === 'contaminated'
  ) {
    return 'Партия с контаминацией. Перевод в клонирование заблокирован.';
  }

  if (
    selectedCard?.stage === INTRO_STAGE &&
    (selectedCard.batchStatus || 'active') === 'quarantine'
  ) {
    return 'Партия на карантине. Перевод в клонирование заблокирован.';
  }

  return '';
}

export function getSelectedStageFlags(selectedStage) {
  return {
    isAdaptationStage: selectedStage === stages[2],
    isCloneStage: selectedStage === stages[1],
    isCultureIntroStage: selectedStage === INTRO_STAGE,
    isGreenhouseStage: selectedStage === stages[3],
    isHardeningStage: selectedStage === stages[4],
    isPlantingStage: selectedStage === stages[5],
  };
}

export function isSelectedCloneCardForCard(selectedCard) {
  return selectedCard?.stage === stages[1];
}

export function getRecommendationCard(recommendationsContext, cultureCards) {
  if (!recommendationsContext?.cardId) {
    return null;
  }

  return cultureCards.find((card) => card.id === recommendationsContext.cardId);
}

export function shouldShowIdentityAsText(isEditingCard) {
  return isEditingCard;
}

export function canEditCurrentIdentityForCard(currentUser, editingCard) {
  return canEditIdentityFields(currentUser, editingCard);
}

export function getSelectedCardNextStage(selectedCard, selectedStage) {
  return getNextStage(selectedCard?.stage || selectedStage);
}

export function getSelectedCardMetrics(selectedCard) {
  const plantingStats = typeof getPlantingStats === 'function'
    ? getPlantingStats(selectedCard)
    : {
      completionResult: 'Не указан',
      currentQuantity: getCardCurrentQuantity(selectedCard),
      deathCount: 0,
      discardCount: 0,
      initialQuantity: Number(selectedCard?.quantity) || 0,
      lossCount: 0,
      lossPercent: 0,
      riskStatus: 'Нормальный',
      saleCount: 0,
      stressLevel: 'Не указан',
      survivalRate: 'Не указана',
      turgor: 'Не указан',
    };

  return {
    selectedCardAdaptationStats: getAdaptationStats(selectedCard),
    selectedCardCloneStats: getCloneStats(selectedCard),
    selectedCardCurrentQuantity: getCardCurrentQuantity(selectedCard),
    selectedCardDaysInStage: getDaysInCurrentStage(selectedCard),
    selectedCardHardeningStats: getHardeningStats(selectedCard),
    selectedCardPlantingStats: plantingStats,
  };
}

export function getOpenCultureCalendarInitialDate(card) {
  return getLatestFilledCalendarDate(card);
}

export function getScannedCode(event) {
  return `${event?.data || ''}`.trim();
}

export function findCultureCardByScannedCode(cultureCards, scannedCode) {
  const normalizedScannedCode = scannedCode.toLowerCase();

  return cultureCards.find(
    (card) =>
      `${card.code || ''}`.trim().toLowerCase() === normalizedScannedCode,
  );
}

export function getTaskCardByTask(cultureCards, task) {
  return cultureCards.find((card) => card.id === task.cardId);
}

export function getUpdatedCardById(cultureCards, cardId) {
  return cultureCards.find((card) => card.id === cardId);
}

export function isDuplicateCultureCode(cultureCards, code, editingCardId) {
  return isDuplicateCardCode(cultureCards, code, editingCardId);
}
