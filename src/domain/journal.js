import { getCardDisplayName } from './batch';
import { INTRO_STAGE, stages } from './constants';
import { getTodayIsoDate } from './dates';

export function getOperationTimestamp(operation) {
  return operation?.createdAt || operation?.date || '';
}

export function getChangeTimestamp(change) {
  return change?.changedAt || change?.date || '';
}

export function getTimelineStageForOperation(operation, card) {
  const operationTimestamp = getOperationTimestamp(operation);
  const history = [...(card?.stageHistory || [])]
    .filter((change) => change.fromStage && change.toStage)
    .sort((first, second) => getChangeTimestamp(first).localeCompare(getChangeTimestamp(second)));

  if (history.length > 0) {
    let stage = history[0].fromStage;

    history.forEach((change) => {
      if (!operationTimestamp || getChangeTimestamp(change).localeCompare(operationTimestamp) <= 0) {
        stage = change.toStage;
      }
    });

    return stage;
  }

  if (card?.stageChangedAt && operation?.date) {
    if (operation.date < card.stageChangedAt) {
      const currentStageIndex = stages.indexOf(card.stage);
      return stages[currentStageIndex - 1] || INTRO_STAGE;
    }
  }

  return card?.stage || INTRO_STAGE;
}

export function getOperationEffectiveStage(operation, card) {
  if (!operation || !card) {
    return INTRO_STAGE;
  }

  if (operation.stage) {
    return operation.stage;
  }

  if (operation.type === 'stageChange') {
    return operation.toStage || card.stage || INTRO_STAGE;
  }

  if (['batchCreated', 'qrGenerated', 'comment', 'photo', 'contamination'].includes(operation.type)) {
    return INTRO_STAGE;
  }

  if (['rooting', 'propagation'].includes(operation.type)) {
    return 'Клонирование';
  }

  if ([
    'adaptationStress',
    'adaptationEnvironment',
    'adaptationHumidityReduction',
    'adaptationCare',
  ].includes(operation.type)) {
    return 'Адаптация';
  }

  if ([
    'greenhouseObservation',
    'greenhouseCare',
    'greenhouseEnvironment',
    'greenhouseDisease',
    'transplant',
  ].includes(operation.type)) {
    return 'Теплица';
  }

  if (operation.type === 'statusChange') {
    if (operation.rootedCount || operation.propagationCount) {
      return 'Клонирование';
    }
  }

  return getTimelineStageForOperation(operation, card);
}

export function isOperationVisibleInCurrentStage(operation, card) {
  if (!operation || !card) {
    return false;
  }

  if (['batchCreated', 'qrGenerated'].includes(operation.type)) {
    return (card.stage || INTRO_STAGE) === INTRO_STAGE;
  }

  if (operation.type === 'stageChange') {
    return operation.toStage === card.stage;
  }

  if ((card.stage || INTRO_STAGE) === INTRO_STAGE) {
    return getOperationEffectiveStage(operation, card) === INTRO_STAGE;
  }

  return getOperationEffectiveStage(operation, card) === card.stage;
}

export function getLatestFilledCalendarDate(card) {
  const operationDates = (card?.operations || [])
    .filter((operation) => isOperationVisibleInCurrentStage(operation, card))
    .map((operation) => operation.date)
    .filter(Boolean)
    .sort();

  return operationDates.at(-1) || card?.createdAt || getTodayIsoDate();
}

export function buildSelectedCardJournalData(selectedCard, selectedCalendarDate) {
  const selectedCardOperations = (selectedCard?.operations || [])
    .filter((operation) => operation.type !== 'stageSettingsUpdated');
  const selectedCardCalendarOperations = selectedCardOperations.filter((operation) => (
    isOperationVisibleInCurrentStage(operation, selectedCard)
  ));
  const operationDates = new Set(selectedCardCalendarOperations.map((operation) => operation.date));
  const selectedDateOperations = selectedCardCalendarOperations.filter((operation) => (
    operation.date === selectedCalendarDate
  ));

  return {
    operationDates,
    selectedCardCalendarOperations,
    selectedCardOperations,
    selectedDateOperations,
  };
}

export function getGlobalJournalEvents(cards) {
  return cards
    .flatMap((card) => (card.operations || [])
      .filter((operation) => operation.type !== 'stageSettingsUpdated')
      .map((operation) => ({
        ...operation,
        cardId: card.id,
        cardName: getCardDisplayName(card),
        cardCode: card.code,
        cardQuantity: card.quantity,
        cardStage: card.stage || INTRO_STAGE,
        cultureName: card.cultureName,
        speciesName: card.speciesName,
        varietyName: card.varietyName,
      })))
    .sort((first, second) => (
      new Date(second.createdAt || second.date || 0) - new Date(first.createdAt || first.date || 0)
    ));
}

export function isImportantJournalEvent(event) {
  return [
    'contamination',
    'quarantine',
    'death',
    'discard',
    'stageChange',
  ].includes(event.type) || (
    event.type === 'adaptationStress' &&
    ['Высокий', 'Критический'].includes(event.stressLevel)
  );
}

export function doesJournalEventMatchFilter(event, filter) {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'important') {
    return isImportantJournalEvent(event);
  }

  if (filter === 'losses') {
    return ['death', 'discard'].includes(event.type);
  }

  if (filter === 'sales') {
    return event.type === 'sale';
  }

  return event.type === filter;
}

export function getJournalFilterLabel(filter) {
  return {
    important: 'Важные',
    all: 'Все',
    comment: 'Комментарии',
    photo: 'Фото',
    contamination: 'Контаминация',
    quarantine: 'Карантин',
    losses: 'Потери',
    sales: 'Продажи',
    rooting: 'Укоренение',
    propagation: 'Размножение',
    transplant: 'Пересадка',
    stageChange: 'Переходы',
  }[filter] || filter;
}
