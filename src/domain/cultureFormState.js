import { createEmptyCultureForm } from './forms';
import { buildCultureFormForEdit } from './cultureForm';
import { isoFromDate } from './dates';

export function buildCultureFormOpenState() {
  return {
    cultureForm: createEmptyCultureForm(),
    formError: '',
    showDatePicker: false,
    openDropdown: '',
    touchedSubmit: false,
    editingCardId: null,
    currentScreen: 'cultureForm',
  };
}

export function buildCultureFormEditState(card) {
  return {
    cultureForm: buildCultureFormForEdit(card),
    formError: '',
    showDatePicker: false,
    openDropdown: '',
    touchedSubmit: false,
    editingCardId: card.id,
    currentScreen: 'cultureForm',
  };
}

export function buildCultureFormCloseState() {
  return {
    cultureForm: createEmptyCultureForm(),
    formError: '',
    showDatePicker: false,
    openDropdown: '',
    touchedSubmit: false,
    editingCardId: null,
    currentScreen: 'cultureList',
  };
}

export function buildCultureDateChangeResult({ isAndroid, selectedDate }) {
  if (!selectedDate) {
    return null;
  }

  return {
    shouldHideDatePicker: isAndroid,
    createdAt: isoFromDate(selectedDate),
  };
}
