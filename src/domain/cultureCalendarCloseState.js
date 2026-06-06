// Состояние закрытия окна календаря культуры.
import { createEmptyIntroActionForm } from './forms';

export function buildCultureCalendarCloseState() {
  return {
    selectedCardId: null,
    selectedCalendarDate: '',
    cultureCalendarTab: 'calendar',
    isDateEntryExpanded: false,
    introActionType: '',
    introActionForm: createEmptyIntroActionForm(),
    editingOperationId: null,
    isStageMoveConfirmVisible: false,
    stageActionError: '',
    currentScreen: 'cultureList',
  };
}
