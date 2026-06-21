// Состояние навигации по основным экранам.
export function buildGlobalJournalNavigationState() {
  return {
    currentScreen: 'globalJournal',
    journalFilter: 'all',
    journalSubFilter: 'all',
    expandedJournalCardIds: [],
  };
}

export function buildTasksNavigationState() {
  return {
    currentScreen: 'tasks',
    notice: '',
  };
}

export function buildMenuNavigationState() {
  return {
    currentScreen: 'menu',
    notice: '',
  };
}

export function buildDirectoriesNavigationState() {
  return {
    currentScreen: 'directories',
    notice: '',
  };
}

export function buildStagePressNavigationState(stage) {
  return {
    selectedStage: stage,
    currentScreen: 'cultureList',
  };
}

export function buildStageRecommendationsNavigationState(selectedStage) {
  return {
    currentScreen: 'recommendations',
    recommendationsContext: {
      mode: 'stage',
      stage: selectedStage,
    },
    recommendationsMode: 'current',
  };
}

export function buildSelectedCardRecommendationsNavigationState({
  backScreen,
  selectedCardId,
  selectedCardStage,
  selectedStage,
}) {
  return {
    currentScreen: 'recommendations',
    recommendationsContext: {
      backScreen,
      cardId: selectedCardId,
      stage: selectedCardStage || selectedStage,
    },
    recommendationsMode: 'current',
  };
}

export function buildCloseRecommendationsState(backScreen = 'stages') {
  return {
    currentScreen: backScreen,
    recommendationsContext: null,
    recommendationsMode: 'current',
  };
}
