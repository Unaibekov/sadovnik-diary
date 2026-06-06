// Состояние выхода из аккаунта и сброса выбора.
export function buildLogoutState() {
  return {
    selectedStage: '',
    selectedCardId: null,
    selectedCalendarDate: '',
    isAuthenticated: false,
    currentScreen: 'stages',
  };
}
