// Производные данные состояния приложения и каталога.
import plantsCatalog from '../../data/plantsCatalog';
import { getCardDisplayName } from './batch';
import { buildCultureFormOptions, getResolvedBatchStatus } from './cardSelectors';
import {
  buildGroupedGlobalJournalCards,
  getActiveCardsCount,
  filterCultureCards,
  getAllVisibleStageCardsCount,
  getSelectedStageCardsCount,
  getStageStatusFilterCounts,
} from './cultureSelectors';
import { getMonthDays } from './dates';
import { buildRecommendationEntries } from './recommendations';
import {
  buildSelectedCardJournalData,
  doesJournalEventMatchFilters,
  getGlobalJournalEvents,
  getJournalSubFilterCounts,
} from './journal';
import { buildCareTasks } from './tasks';
import {
  canEditCurrentIdentityForCard,
  canReleaseQuarantineForRole,
  getSelectedCardMetrics,
  getSelectedCardNextStage,
  getRecommendationCard,
  getRecommendationStage,
  getRecommendationSourceCards,
  getSelectedStageFlags,
  getStageMoveHint,
  getStageMoveBlockedMessage,
  getStageMoveButtonLabelText,
  isSelectedCardActionLocked,
  isSelectedCloneCardForCard,
  isSupportedPlantingStageForStage,
  shouldShowIdentityAsText,
} from './appModel';

export function buildAppDerivedState({
  batchStatusFilter,
  cardSearch,
  cultureCards,
  cultureForm,
  currentUser,
  editingCardId,
  journalFilter,
  journalSubFilter,
  recommendationsContext,
  recommendationsMode,
  selectedCalendarDate,
  selectedCardId,
  selectedStage,
  calendarMonth,
}) {
  const editingCard = cultureCards.find((card) => card.id === editingCardId);
  const selectedCard = cultureCards.find((card) => card.id === selectedCardId);
  const calendarDays = getMonthDays(calendarMonth);
  const selectedCardJournalData = buildSelectedCardJournalData(
    selectedCard,
    selectedCalendarDate,
  );
  const selectedCardMetrics = getSelectedCardMetrics(selectedCard);
  const selectedStageFlags = getSelectedStageFlags(selectedStage);
  const selectedCardNextStage = getSelectedCardNextStage(
    selectedCard,
    selectedStage,
  );
  const selectedCardActionLocked = isSelectedCardActionLocked(selectedCard);
  const stageMoveButtonLabel = getStageMoveButtonLabelText(selectedCardNextStage);
  const stageMoveBlockedMessage = getStageMoveBlockedMessage(selectedCard);
  const stageMoveHint = getStageMoveHint(selectedCard);
  const showIdentityAsText = shouldShowIdentityAsText(Boolean(editingCardId));
  const isSupportedPlantingStage = isSupportedPlantingStageForStage(selectedStage);
  const isSelectedCloneCard = isSelectedCloneCardForCard(selectedCard);
  const canReleaseQuarantine = canReleaseQuarantineForRole(currentUser.role);
  const globalJournalEvents = getGlobalJournalEvents(cultureCards);
  const careTasks = buildCareTasks(cultureCards, getResolvedBatchStatus);
  const activeCardsCount = getActiveCardsCount(
    cultureCards,
    getResolvedBatchStatus,
  );
  const groupedGlobalJournalCards = buildGroupedGlobalJournalCards(
    cultureCards,
    globalJournalEvents,
    journalFilter,
    journalSubFilter,
    doesJournalEventMatchFilters,
  );
  const journalSubFilterCounts = getJournalSubFilterCounts(
    globalJournalEvents,
    journalFilter,
  );

  const { cultureOptions, speciesOptions, varietyOptions } =
    buildCultureFormOptions(plantsCatalog, cultureForm);

  const filteredCultureCards = filterCultureCards(cultureCards, {
    batchStatusFilter,
    cardSearch,
    getCardDisplayName,
    getResolvedBatchStatus,
    isAdaptationStage: selectedStageFlags.isAdaptationStage,
    isCloneStage: selectedStageFlags.isCloneStage,
    isCultureIntroStage: selectedStageFlags.isCultureIntroStage,
    isGreenhouseStage: selectedStageFlags.isGreenhouseStage,
    isHardeningStage: selectedStageFlags.isHardeningStage,
    isPlantingStage: selectedStageFlags.isPlantingStage,
    selectedStage,
  });

  const allVisibleStageCardsCount = getAllVisibleStageCardsCount(cultureCards, {
    cardSearch,
    getCardDisplayName,
    getResolvedBatchStatus,
    selectedStage,
  });
  const selectedStageCardsCount = getSelectedStageCardsCount(
    cultureCards,
    selectedStage,
    getResolvedBatchStatus,
  );
  const stageStatusFilterCounts = getStageStatusFilterCounts(
    cultureCards,
    {
      getCardDisplayName,
      getResolvedBatchStatus,
      isAdaptationStage: selectedStageFlags.isAdaptationStage,
      isCloneStage: selectedStageFlags.isCloneStage,
      isCultureIntroStage: selectedStageFlags.isCultureIntroStage,
      isGreenhouseStage: selectedStageFlags.isGreenhouseStage,
      isHardeningStage: selectedStageFlags.isHardeningStage,
      isPlantingStage: selectedStageFlags.isPlantingStage,
      selectedStage,
    },
  );
  const recommendationStage = getRecommendationStage(
    recommendationsContext,
    selectedCard,
    selectedStage,
  );
  const recommendationCard = getRecommendationCard(
    recommendationsContext,
    cultureCards,
  );
  const recommendationSourceCards = getRecommendationSourceCards(
    recommendationCard,
    cultureCards,
    recommendationStage,
  );
  const recommendationEntries = buildRecommendationEntries({
    plantsCatalog,
    recommendationCard,
    recommendationMode: recommendationsMode,
    recommendationSourceCards,
    recommendationStage,
  });

  return {
    activeCardsCount,
    allVisibleStageCardsCount,
    careTasks,
    canEditCurrentIdentity: canEditCurrentIdentityForCard(currentUser, editingCard),
    canReleaseQuarantine,
    calendarDays,
    cultureOptions,
    editingCard,
    filteredCultureCards,
    globalJournalEvents,
    groupedGlobalJournalCards,
    journalSubFilterCounts,
    isSelectedCloneCard,
    isSupportedPlantingStage,
    recommendationCard,
    recommendationEntries,
    recommendationSourceCards,
    recommendationStage,
    operationDates: selectedCardJournalData.operationDates,
    selectedCard,
    selectedCardActionLocked,
    selectedCardAdaptationStats: selectedCardMetrics.selectedCardAdaptationStats,
    selectedCardCalendarOperations: selectedCardJournalData.selectedCardCalendarOperations,
    selectedCardCloneStats: selectedCardMetrics.selectedCardCloneStats,
    selectedCardCurrentQuantity: selectedCardMetrics.selectedCardCurrentQuantity,
    selectedCardDaysInStage: selectedCardMetrics.selectedCardDaysInStage,
    selectedCardHardeningStats: selectedCardMetrics.selectedCardHardeningStats,
    selectedCardPlantingStats: selectedCardMetrics.selectedCardPlantingStats,
    selectedCardNextStage,
    selectedCardOperations: selectedCardJournalData.selectedCardOperations,
    selectedDateOperations: selectedCardJournalData.selectedDateOperations,
    selectedStageCardsCount,
    stageStatusFilterCounts,
    selectedStageFlags,
    showIdentityAsText,
    speciesOptions,
    stageMoveBlockedMessage,
    stageMoveButtonLabel,
    stageMoveHint,
    varietyOptions,
  };
}
