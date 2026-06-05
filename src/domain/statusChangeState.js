import { createEmptyStatusForm } from './forms';
import { stages } from './constants';

export function buildStatusChangeOpenState(selectedCard) {
  return {
    statusForm: createEmptyStatusForm(),
    editingOperationId: null,
    introActionType:
      selectedCard.stage === stages[2]
        ? 'adaptationStress'
        : selectedCard.stage === stages[3]
          ? 'greenhouseObservation'
          : 'rooting',
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
