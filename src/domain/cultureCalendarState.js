// Состояние и дата для календаря культуры.
import { createEmptyIntroActionForm } from './forms';
import { dateFromIso } from './dates';
import { getOpenCultureCalendarInitialDate } from './appModel';

export function buildCultureCalendarOpenState(card) {
  const initialDate = getOpenCultureCalendarInitialDate(card);

  return {
    selectedCardId: card.id,
    selectedCalendarDate: initialDate,
    cultureCalendarTab: 'calendar',
    isDateEntryExpanded: false,
    introActionType: 'problem',
    introActionForm: createEmptyIntroActionForm(),
    stageActionError: '',
    calendarMonth: dateFromIso(initialDate),
    currentScreen: 'cultureCalendar',
  };
}
