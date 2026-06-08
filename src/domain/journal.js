// Подготовка данных журнала и списков карточек.
import { getCardDisplayName } from './batch';
import { INTRO_STAGE, stages } from './constants';
import { getTodayIsoDate } from './dates';

const MAIN_FILTER_LABELS = {
  all: 'Все',
  important: 'Важные',
};

const MAIN_FILTERS = new Set([
  'all',
  'important',
  INTRO_STAGE,
  stages[1],
  stages[2],
  stages[3],
  stages[4],
  stages[5],
]);

const SUB_FILTER_LABELS = {
  all: 'Все',
  comment: 'Комментарии',
  photo: 'Фото',
  contamination: 'Контаминация',
  quarantine: 'Карантин',
  risks: 'Риски',
  losses: 'Потери',
  disease: 'Болезни',
  sales: 'Продажи',
  rooting: 'Укоренение',
  propagation: 'Размножение',
  transplant: 'Пересадка',
  stageChange: 'Переходы',
  movement: 'Перемещения',
  observation: 'Наблюдения',
  environment: 'Среда',
  care: 'Уход',
};

const STAGE_SUB_FILTERS = {
  all: ['all', 'comment', 'photo', 'stageChange', 'movement', 'sales'],
  important: ['all', 'contamination', 'quarantine', 'risks', 'losses', 'disease'],
  [INTRO_STAGE]: ['all', 'comment', 'photo', 'contamination', 'quarantine', 'stageChange'],
  [stages[1]]: ['all', 'rooting', 'propagation', 'movement', 'losses', 'sales', 'quarantine', 'stageChange'],
  [stages[2]]: ['all', 'observation', 'environment', 'care', 'movement', 'quarantine', 'losses', 'sales', 'stageChange'],
  [stages[3]]: ['all', 'observation', 'environment', 'care', 'disease', 'transplant', 'movement', 'quarantine', 'losses', 'sales', 'stageChange'],
  [stages[4]]: ['all', 'observation', 'care', 'movement', 'losses', 'sales', 'stageChange'],
  [stages[5]]: ['all', 'observation', 'care', 'movement', 'losses', 'sales', 'stageChange'],
};

function isCriticalLevel(level) {
  return ['Высокий', 'Критический', 'Тяжелая', 'Критическая'].includes(level);
}

function matchesImportantRisk(event) {
  if (event.type === 'adaptationStress') {
    return isCriticalLevel(event.stressLevel);
  }

  if (event.type === 'greenhouseObservation') {
    return isCriticalLevel(event.riskLevel);
  }

  if (event.type === 'greenhouseDisease') {
    return true;
  }

  return false;
}

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
    return stages[1];
  }

  if ([
    'adaptationStress',
    'adaptationEnvironment',
    'adaptationHumidityReduction',
    'adaptationCare',
  ].includes(operation.type)) {
    return stages[2];
  }

  if ([
    'greenhouseObservation',
    'greenhouseCare',
    'greenhouseEnvironment',
    'greenhouseDisease',
    'transplant',
  ].includes(operation.type)) {
    return stages[3];
  }

  if (operation.type === 'statusChange') {
    if (operation.rootedCount || operation.propagationCount) {
      return stages[1];
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
    'quarantineReleased',
    'death',
    'discard',
    'stageChange',
  ].includes(event.type) || matchesImportantRisk(event);
}

export function getJournalMainFilterLabel(filter) {
  return MAIN_FILTER_LABELS[filter] || filter;
}

export function getJournalSubFilters(mainFilter) {
  return STAGE_SUB_FILTERS[mainFilter] || STAGE_SUB_FILTERS.all;
}

export function doesJournalEventMatchMainFilter(event, filter) {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'important') {
    return isImportantJournalEvent(event);
  }

  if (!MAIN_FILTERS.has(filter)) {
    return true;
  }

  return (event.cardStage || INTRO_STAGE) === filter;
}

export function doesJournalEventMatchSubFilter(event, subFilter, mainFilter = 'all') {
  if (subFilter === 'all') {
    return true;
  }

  const typeMatches = {
    comment: event.type === 'comment',
    photo: event.type === 'photo',
    contamination: event.type === 'contamination',
    quarantine: ['quarantine', 'quarantineReleased'].includes(event.type),
    risks: matchesImportantRisk(event),
    losses: ['death', 'discard'].includes(event.type),
    disease: event.type === 'greenhouseDisease',
    sales: event.type === 'sale',
    rooting: event.type === 'rooting',
    propagation: event.type === 'propagation',
    transplant: event.type === 'transplant',
    stageChange: event.type === 'stageChange',
    movement: event.type === 'movement',
    observation: ['adaptationStress', 'greenhouseObservation'].includes(event.type),
    environment: ['adaptationEnvironment', 'adaptationHumidityReduction', 'greenhouseEnvironment'].includes(event.type),
    care: ['adaptationCare', 'greenhouseCare'].includes(event.type),
  };

  if (mainFilter === 'important') {
    return Boolean(typeMatches[subFilter]);
  }

  return Boolean(typeMatches[subFilter]);
}

export function doesJournalEventMatchFilters(event, mainFilter, subFilter) {
  return doesJournalEventMatchMainFilter(event, mainFilter) &&
    doesJournalEventMatchSubFilter(event, subFilter, mainFilter);
}

export function doesJournalEventMatchFilter(event, filter) {
  if (MAIN_FILTERS.has(filter)) {
    return doesJournalEventMatchMainFilter(event, filter);
  }

  return doesJournalEventMatchSubFilter(event, filter, 'all');
}

export function getJournalFilterLabel(filter) {
  return {
    ...MAIN_FILTER_LABELS,
    ...SUB_FILTER_LABELS,
    [INTRO_STAGE]: INTRO_STAGE,
    [stages[1]]: stages[1],
    [stages[2]]: stages[2],
    [stages[3]]: stages[3],
    [stages[4]]: stages[4],
    [stages[5]]: stages[5],
  }[filter] || filter;
}
