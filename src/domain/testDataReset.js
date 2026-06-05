import { createEmptyCultureForm, createEmptyIntroActionForm, createEmptyStatusForm } from './forms';

export function buildTestDataResetState() {
  return {
    cultureCards: [],
    selectedStage: '',
    selectedCardId: null,
    selectedCalendarDate: '',
    editingCardId: null,
    editingOperationId: null,
    cultureForm: createEmptyCultureForm(),
    statusForm: createEmptyStatusForm(),
    introActionForm: createEmptyIntroActionForm(),
    introActionType: '',
    cultureCalendarTab: 'calendar',
    isDateEntryExpanded: false,
    currentScreen: 'stages',
    storageError: '',
    notice: 'Карточки стадий и журнал очищены.',
  };
}
