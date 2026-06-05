import { getAdaptationCareSchedules, getCardCurrentQuantity, getCardDisplayName, getGreenhouseCareSchedules } from './batch';
import { INTRO_STAGE } from './constants';
import { dateFromIso, getTodayIsoDate, isoFromDate } from './dates';

export function getScheduleNextDate(schedule, card) {
  if (schedule.nextDate) {
    return schedule.nextDate;
  }

  const stageStartDate = card.stageChangedAt || card.createdAt;

  if (!stageStartDate) {
    return '';
  }

  return isoFromDate(new Date(
    dateFromIso(stageStartDate).getTime() + schedule.intervalDays * 24 * 60 * 60 * 1000,
  ));
}

export function buildCareTasks(cards, getResolvedBatchStatus) {
  const todayIso = getTodayIsoDate();
  const todayDate = dateFromIso(todayIso);

  return cards.flatMap((card) => {
    if (
      card.status === 'cancelled' ||
      card.status === 'archived' ||
      getResolvedBatchStatus(card) === 'sold'
    ) {
      return [];
    }

    const stage = card.stage || INTRO_STAGE;
    const schedules = stage === 'Адаптация'
      ? getAdaptationCareSchedules(card)
      : stage === 'Теплица'
        ? getGreenhouseCareSchedules(card)
        : [];

    return schedules.map((schedule) => {
      const nextDate = getScheduleNextDate(schedule, card);

      if (!nextDate) {
        return null;
      }

      const nextDateValue = dateFromIso(nextDate);
      const daysOverdue = Math.max(Math.floor(
        (todayDate - nextDateValue) / (24 * 60 * 60 * 1000),
      ), 0);
      const isOverdue = daysOverdue > 0;
      const isDueToday = nextDate === todayIso;

      return {
        id: `${card.id}-${stage}-${schedule.careType}`,
        cardId: card.id,
        cardName: getCardDisplayName(card),
        code: card.code || '',
        careType: schedule.careType,
        currentQuantity: getCardCurrentQuantity(card),
        daysOverdue,
        isOverdue,
        isDueToday,
        nextDate,
        stage,
        status: isOverdue ? 'Просрочено' : isDueToday ? 'Сегодня' : 'Запланировано',
        title: schedule.careType,
      };
    }).filter(Boolean);
  }).sort((first, second) => (
    Number(second.isOverdue) - Number(first.isOverdue) ||
    Number(second.isDueToday) - Number(first.isDueToday) ||
    second.daysOverdue - first.daysOverdue ||
    new Date(first.nextDate) - new Date(second.nextDate) ||
    first.cardName.localeCompare(second.cardName, 'ru')
  ));
}

export function buildTaskCardOpenState(taskCard) {
  return {
    selectedStage: taskCard.stage || INTRO_STAGE,
  };
}
