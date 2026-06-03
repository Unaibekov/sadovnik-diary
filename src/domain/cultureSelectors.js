import { INTRO_STAGE } from './constants';

export function buildGroupedGlobalJournalCards(
  cultureCards,
  globalJournalEvents,
  journalFilter,
  doesJournalEventMatchFilter,
) {
  return cultureCards
    .map((card) => {
      const cardEvents = globalJournalEvents.filter((event) => (
        event.cardId === card.id && doesJournalEventMatchFilter(event, journalFilter)
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

    if (
      (isCultureIntroStage || isCloneStage || isAdaptationStage || isGreenhouseStage) &&
      batchStatusFilter !== 'all' &&
      batchStatus !== batchStatusFilter
    ) {
      return false;
    }

    if (!query) {
      return true;
    }

    return getCardDisplayName(card).toLowerCase().includes(query);
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
