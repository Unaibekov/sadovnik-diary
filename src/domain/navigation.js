export function buildGlobalJournalNavigationState() {
  return {
    currentScreen: 'globalJournal',
    journalFilter: 'important',
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

export function buildCloseRecommendationsState(backScreen = 'stages') {
  return {
    currentScreen: backScreen,
    recommendationsContext: null,
    recommendationsMode: 'current',
  };
}
