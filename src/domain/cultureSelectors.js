// Селекторы для группировки карточек по журналу культур.
import { INTRO_STAGE, stages } from './constants';
import { hasProblemOperation } from './statusProblemValidation';

function hasOperationType(card, operationTypes) {
  const types = Array.isArray(operationTypes) ? operationTypes : [operationTypes];
  return (card?.operations || []).some((operation) => types.includes(operation.type));
}

function getTimestamp(value) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getLatestCardActionTimestamp(card) {
  const latestOperationTimestamp = (card?.operations || []).reduce((latest, operation) => Math.max(
    latest,
    getTimestamp(operation.updatedAt || operation.createdAt || operation.date),
  ), 0);

  return Math.max(
    latestOperationTimestamp,
    getTimestamp(card?.updatedAt),
    getTimestamp(card?.createdAt),
  );
}

function isIntroStageFilterMatch(card, batchStatus, filter, isProblemStatus) {
  if (filter === 'problem') {
    return isProblemStatus;
  }

  if (filter === 'movement') {
    return hasOperationType(card, 'movement');
  }

  if (filter === 'losses') {
    return hasOperationType(card, 'introLoss');
  }

  return batchStatus === filter;
}

function isProductionStageFilterMatch(card, batchStatus, filter, isProblemStatus) {
  if (filter === 'problem') {
    return isProblemStatus;
  }

  const filterToOperationTypes = {
    rooting: 'rooting',
    propagation: 'propagation',
    movement: 'movement',
    losses: 'introLoss',
    sale: 'sale',
    adaptationStress: 'adaptationStress',
    adaptationCare: 'adaptationCare',
    greenhouseObservation: 'greenhouseObservation',
    greenhouseCare: 'greenhouseCare',
    transplant: 'transplant',
    hardeningObservation: 'hardeningObservation',
    hardeningCare: 'hardeningCare',
    planting: 'planting',
    plantingObservation: 'plantingObservation',
    plantingCare: 'plantingCare',
    plantingCompletion: 'plantingCompletion',
  };

  const operationType = filterToOperationTypes[filter];
  if (operationType) {
    return hasOperationType(card, operationType);
  }

  return batchStatus === filter;
}

export function getStageStatusFilterItems(selectedStage) {
  if (selectedStage === stages[1]) {
    return [
      ['all', 'Все'],
      ['rooting', 'Укоренение'],
      ['propagation', 'Размножение'],
      ['problem', 'Проблема'],
      ['movement', 'Перемещение'],
      ['losses', 'Потери'],
      ['sale', 'Продажа'],
    ];
  }

  if (selectedStage === stages[2]) {
    return [
      ['all', 'Все'],
      ['problem', 'Проблема'],
      ['movement', 'Перемещение'],
      ['losses', 'Потери'],
      ['sale', 'Продажа'],
    ];
  }

  if (selectedStage === stages[3]) {
    return [
      ['all', 'Все'],
      ['problem', 'Проблема'],
      ['transplant', 'Пересадка'],
      ['movement', 'Перемещение'],
      ['losses', 'Потери'],
      ['sale', 'Продажа'],
    ];
  }

  if (selectedStage === stages[4]) {
    return [
      ['all', 'Все'],
      ['problem', 'Проблема'],
      ['movement', 'Перемещение'],
      ['losses', 'Потери'],
      ['sale', 'Продажа'],
    ];
  }

  if (selectedStage === stages[5]) {
    return [
      ['all', 'Все'],
      ['planting', 'Высадка'],
      ['problem', 'Проблема'],
      ['losses', 'Потери'],
      ['sale', 'Продажа'],
      ['plantingCompletion', 'Завершение'],
    ];
  }

  return [
    ['all', 'Все'],
    ['problem', 'Проблема'],
    ['movement', 'Перемещение'],
    ['losses', 'Потери'],
  ];
}

export function buildGroupedGlobalJournalCards(
  cultureCards,
  globalJournalEvents,
  journalMainFilter,
  journalSubFilter,
  doesJournalEventMatchFilters,
) {
  return cultureCards
    .map((card) => {
      const cardEvents = globalJournalEvents.filter((event) => (
        event.cardId === card.id &&
        doesJournalEventMatchFilters(event, journalMainFilter, journalSubFilter)
      ));

      return {
        card,
        events: cardEvents,
        latestEventAt: cardEvents[0]?.createdAt || cardEvents[0]?.date || '',
      };
    })
    .filter((group) => group.events.length > 0)
    .sort((first, second) => (
      new Date(second.latestEventAt || 0) - new Date(first.latestEventAt || 0)
    ));
}

export function filterCultureCards(cultureCards, options) {
  const {
    batchStatusFilter,
    cardSearch,
    getCardDisplayName,
    getResolvedBatchStatus,
    isAdaptationStage,
    isCloneStage,
    isCultureIntroStage,
    isGreenhouseStage,
    isHardeningStage,
    isPlantingStage,
    selectedStage,
  } = options;
  const normalizedBatchStatusFilter = batchStatusFilter === 'active'
    ? 'all'
    : batchStatusFilter;

  return cultureCards.filter((card) => {
    const query = cardSearch.trim().toLowerCase();
    const cardStage = card.stage || INTRO_STAGE;
    const batchStatus = getResolvedBatchStatus(card);
    const isProblemStatus = hasProblemOperation(card) || batchStatus === 'problem' || batchStatus === 'quarantine';

    if (card.status === 'cancelled' || (card.status === 'archived' && batchStatus === 'sold')) {
      return false;
    }

    if (cardStage !== selectedStage) {
      return false;
    }

    if (
      (isCultureIntroStage || isCloneStage || isAdaptationStage || isGreenhouseStage || isHardeningStage || isPlantingStage) &&
      normalizedBatchStatusFilter !== 'all' &&
      !(
        isCultureIntroStage
          ? isIntroStageFilterMatch(
            card,
            batchStatus,
            normalizedBatchStatusFilter,
            isProblemStatus,
          )
          : isProductionStageFilterMatch(
            card,
            batchStatus,
            normalizedBatchStatusFilter,
            isProblemStatus,
          )
      )
    ) {
      return false;
    }

    if (!query) {
      return true;
    }

    return getCardDisplayName(card).toLowerCase().includes(query);
  }).sort((first, second) => {
    const timeDiff = getLatestCardActionTimestamp(second) - getLatestCardActionTimestamp(first);

    if (timeDiff !== 0) {
      return timeDiff;
    }

    return getCardDisplayName(first).localeCompare(getCardDisplayName(second), 'ru');
  });
}

export function getAllVisibleStageCardsCount(cultureCards, options) {
  const {
    cardSearch,
    getCardDisplayName,
    getResolvedBatchStatus,
    selectedStage,
  } = options;

  return cultureCards.filter((card) => {
    const query = cardSearch.trim().toLowerCase();
    const cardStage = card.stage || INTRO_STAGE;
    const batchStatus = getResolvedBatchStatus(card);

    if (card.status === 'cancelled' || (card.status === 'archived' && batchStatus === 'sold')) {
      return false;
    }

    if (cardStage !== selectedStage) {
      return false;
    }

    return !query || getCardDisplayName(card).toLowerCase().includes(query);
  }).length;
}

export function getActiveCardsCount(cultureCards, getResolvedBatchStatus) {
  return cultureCards.filter((card) => (
    card.status !== 'cancelled' &&
    card.status !== 'archived' &&
    getResolvedBatchStatus(card) !== 'sold'
  )).length;
}

export function getSelectedStageCardsCount(cultureCards, selectedStage, getResolvedBatchStatus) {
  return cultureCards.filter((card) => {
    const cardStage = card.stage || INTRO_STAGE;
    const batchStatus = getResolvedBatchStatus(card);

    if (card.status === 'cancelled' || (card.status === 'archived' && batchStatus === 'sold')) {
      return false;
    }

    return cardStage === selectedStage;
  }).length;
}

export function getSelectedStageProblemCardsCount(cultureCards, options) {
  return filterCultureCards(cultureCards, {
    ...options,
    batchStatusFilter: 'problem',
  }).length;
}

export function getStageStatusFilterCounts(cultureCards, options) {
  const {
    getCardDisplayName,
    getResolvedBatchStatus,
    isAdaptationStage,
    isCloneStage,
    isCultureIntroStage,
    isGreenhouseStage,
    isHardeningStage,
    isPlantingStage,
    selectedStage,
  } = options;
  const stageStatusFilterItems = getStageStatusFilterItems(selectedStage);

  return stageStatusFilterItems.reduce((acc, [value]) => {
    if (value === 'all') {
      acc[value] = getSelectedStageCardsCount(
        cultureCards,
        selectedStage,
        getResolvedBatchStatus,
      );
      return acc;
    }

    acc[value] = filterCultureCards(cultureCards, {
      batchStatusFilter: value,
      cardSearch: '',
      getCardDisplayName,
      getResolvedBatchStatus,
      isAdaptationStage,
      isCloneStage,
      isCultureIntroStage,
      isGreenhouseStage,
      isHardeningStage,
      isPlantingStage,
      selectedStage,
    }).length;
    return acc;
  }, {});
}
