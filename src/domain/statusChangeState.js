// Состояние формы смены статуса.
import { createEmptyStatusForm } from './forms';
import { stages } from './constants';

export function buildStatusChangeOpenState(selectedCard, initialEventType = '') {
  return {
    statusForm: createEmptyStatusForm(),
    editingOperationId: null,
    introActionType:
      initialEventType ||
      (selectedCard.stage === stages[2]
        ? 'adaptationStress'
        : selectedCard.stage === stages[3]
          ? 'greenhouseObservation'
          : selectedCard.stage === stages[4]
            ? 'hardeningObservation'
          : 'rooting'),
    statusFormError: '',
    statusFormNotice: '',
    currentScreen: 'statusChangeForm',
  };
}

export function buildStatusChangeCloseState() {
  return {
    statusForm: createEmptyStatusForm(),
    editingOperationId: null,
    statusFormError: '',
    statusFormNotice: '',
    introActionType: '',
    currentScreen: 'cultureCalendar',
  };
}
