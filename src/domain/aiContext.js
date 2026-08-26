import {
  getAdaptationStats,
  getCardActiveProblemQuantity,
  getCardCurrentQuantity,
  getCardDisplayName,
  getCardHealthyQuantity,
  getCardLocationDescription,
  getGreenhouseStats,
  getHardeningStats,
  getIntroStats,
  getOperationSummaryItems,
  getLatestActiveProblemOperation,
  getLatestProblemRiskLevel,
  getPlantingStats,
} from './batch';
import { getResolvedBatchStatus } from './cardSelectors';
import { INTRO_STAGE } from './constants';
import { getLatestOperation, sortOperationsByLatest } from './operationTimeline';
import { findCatalogPlant, getStagePlantRecommendationItems } from './recommendations';
import { getOperationEffectiveStage } from './journal';

const MAX_OVERVIEW_BATCHES = 3;
const MAX_ATTENTION_BATCHES = 6;
const MAX_ACTIVE_PROBLEMS = 6;
const MAX_SCOPED_RECENT_EVENTS = 10;
const MAX_SCOPED_RECENT_PROBLEMS = 6;
const MAX_SCOPED_QUANTITY_CHANGES = 6;
const MAX_SCOPED_STAGE_CHANGES = 4;
const STAGE_OBSERVATION_TYPES = {
  'Адаптация': ['adaptationStress'],
  'Высадка': ['plantingObservation'],
  'Закалка': ['hardeningObservation'],
  default: ['greenhouseObservation'],
};

function normalizeText(value) {
  return `${value || ''}`.trim();
}

function normalizeOptionalText(value) {
  const normalizedValue = normalizeText(value);

  return normalizedValue || undefined;
}

function createEmployeeContext(currentEmployee) {
  if (!currentEmployee) {
    return null;
  }

  const displayName = normalizeText(currentEmployee.displayName);
  const localUserId = normalizeText(currentEmployee.localUserId);

  if (!displayName && !localUserId) {
    return null;
  }

  return {
    displayName: displayName || undefined,
    localUserId: localUserId || undefined,
  };
}

function buildStageCounts(cards) {
  return cards.reduce((counts, card) => {
    const stage = normalizeText(card.stage) || INTRO_STAGE;

    counts[stage] = (counts[stage] || 0) + 1;
    return counts;
  }, {});
}

function buildStatusCounts(cards) {
  return cards.reduce((counts, card) => {
    const status = getResolvedBatchStatus(card);

    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
}

function getTimestampValue(value) {
  const timestamp = new Date(value || 0).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function isAttentionStatus(status) {
  return status === 'problem' || status === 'quarantine';
}

function resolveAiContextFocus(question, focusOverride) {
  if (focusOverride === 'attention' || focusOverride === 'overview' || focusOverride === 'none') {
    return focusOverride;
  }

  return detectQuestionFocus(question);
}

function compareCardsByAiPriority(first, second) {
  const firstProblemQuantity = getCardActiveProblemQuantity(first);
  const secondProblemQuantity = getCardActiveProblemQuantity(second);

  if (secondProblemQuantity !== firstProblemQuantity) {
    return secondProblemQuantity - firstProblemQuantity;
  }

  const firstStatus = getResolvedBatchStatus(first);
  const secondStatus = getResolvedBatchStatus(second);
  const firstAttentionScore = isAttentionStatus(firstStatus) ? 1 : 0;
  const secondAttentionScore = isAttentionStatus(secondStatus) ? 1 : 0;

  if (secondAttentionScore !== firstAttentionScore) {
    return secondAttentionScore - firstAttentionScore;
  }

  return getTimestampValue(second.updatedAt || second.createdAt) -
    getTimestampValue(first.updatedAt || first.createdAt);
}

function hasKeyword(question, keywords) {
  return keywords.some((keyword) => question.includes(keyword));
}

export function detectQuestionFocus(question) {
  const normalizedQuestion = normalizeText(question).toLowerCase();

  if (!normalizedQuestion) {
    return 'none';
  }

  if (hasKeyword(normalizedQuestion, [
    'парт',
    'проблем',
    'карантин',
    'риск',
    'статус',
    'вниман',
    'код',
    'остат',
    'колич',
    'растен',
    'культур',
    'теплиц',
    'адаптац',
    'высад',
    'журнал',
    'событ',
    'стади',
    'садовник',
    'sadovnik',
    'batch',
  ])) {
    if (hasKeyword(normalizedQuestion, [
      'проблем',
      'карантин',
      'риск',
      'статус',
      'вниман',
    ])) {
      return 'attention';
    }

    return 'overview';
  }

  return 'none';
}

export function shouldAttachAiContext(question) {
  return detectQuestionFocus(question) !== 'none';
}

function buildAttentionBatchContext(card) {
  const latestProblemOperation = getLatestActiveProblemOperation(card);

  return {
    code: normalizeText(card.code) || undefined,
    stage: normalizeText(card.stage) || INTRO_STAGE,
    batchStatus: getResolvedBatchStatus(card),
    currentQuantity: getCardCurrentQuantity(card),
    activeProblemQuantity: getCardActiveProblemQuantity(card),
    problemType: normalizeOptionalText(latestProblemOperation?.problemType),
    riskLevel: normalizeOptionalText(latestProblemOperation?.riskLevel),
  };
}

function buildOverviewBatchContext(card) {
  return {
    code: normalizeText(card.code) || undefined,
    stage: normalizeText(card.stage) || INTRO_STAGE,
    batchStatus: getResolvedBatchStatus(card),
    currentQuantity: getCardCurrentQuantity(card),
    activeProblemQuantity: getCardActiveProblemQuantity(card),
  };
}

function buildActiveProblemContext(card) {
  const latestProblemOperation = getLatestActiveProblemOperation(card);
  const activeProblemQuantity = getCardActiveProblemQuantity(card);

  if (!latestProblemOperation || activeProblemQuantity <= 0) {
    return null;
  }

  return {
    code: normalizeText(card.code) || undefined,
    batchStatus: getResolvedBatchStatus(card),
    problemType: normalizeOptionalText(latestProblemOperation.problemType),
    riskLevel: normalizeOptionalText(latestProblemOperation.riskLevel),
    activeProblemQuantity,
    currentQuantity: getCardCurrentQuantity(card),
    date: normalizeOptionalText(latestProblemOperation.date),
  };
}

function buildStageRiskSnapshot(card) {
  const stage = normalizeText(card.stage) || INTRO_STAGE;

  if (stage === INTRO_STAGE) {
    const stats = getIntroStats(card);

    return {
      lossCount: stats.lossCount,
      lossPercent: stats.lossPercent,
      riskStatus: normalizeOptionalText(stats.riskStatus),
    };
  }

  if (stage === 'Адаптация') {
    const stats = getAdaptationStats(card);

    return {
      lossCount: stats.lossCount,
      riskStatus: normalizeOptionalText(stats.riskStatus),
      stability: normalizeOptionalText(stats.stability),
      stressLevel: normalizeOptionalText(stats.stressLevel),
      survivalPercent: stats.survivalPercent,
      turgor: normalizeOptionalText(stats.turgor),
    };
  }

  if (stage === 'Высадка') {
    const stats = getPlantingStats(card);

    return {
      completionResult: normalizeOptionalText(stats.completionResult),
      lossCount: stats.lossCount,
      riskStatus: normalizeOptionalText(stats.riskStatus),
      stressLevel: normalizeOptionalText(stats.stressLevel),
      survivalRate: normalizeOptionalText(stats.survivalRate),
      turgor: normalizeOptionalText(stats.turgor),
    };
  }

  if (stage === 'Закалка') {
    const stats = getHardeningStats(card);

    return {
      lossCount: stats.lossCount,
      readinessForPlanting: normalizeOptionalText(stats.readinessForPlanting),
      riskStatus: normalizeOptionalText(stats.riskStatus),
      stressLevel: normalizeOptionalText(stats.stressLevel),
      turgor: normalizeOptionalText(stats.turgor),
    };
  }

  const stats = getGreenhouseStats(card);

  return {
    growthRate: normalizeOptionalText(stats.growthRate),
    hasCriticalDisease: Boolean(stats.hasCriticalDisease) || undefined,
    lossCount: stats.lossCount,
    riskStatus: normalizeOptionalText(stats.riskStatus),
    stressLevel: normalizeOptionalText(stats.stressLevel),
    stability: normalizeOptionalText(stats.stability),
    wateringStatus: normalizeOptionalText(stats.wateringStatus),
  };
}

function buildRecentOperationContext(operation) {
  if (!operation || typeof operation !== 'object') {
    return null;
  }

  return {
    type: normalizeOptionalText(operation.type),
    title: normalizeOptionalText(operation.title),
    date: normalizeOptionalText(operation.date),
    stage: normalizeOptionalText(operation.stage),
    problemType: normalizeOptionalText(operation.problemType),
    riskLevel: normalizeOptionalText(operation.riskLevel),
    stressLevel: normalizeOptionalText(operation.stressLevel),
    count: Number.isFinite(Number(operation.count)) ? Number(operation.count) : undefined,
    quantity: Number.isFinite(Number(operation.quantity)) ? Number(operation.quantity) : undefined,
    affectedQuantity: Number.isFinite(Number(operation.affectedQuantity)) ? Number(operation.affectedQuantity) : undefined,
    recoveredQuantity: Number.isFinite(Number(operation.recoveredQuantity)) ? Number(operation.recoveredQuantity) : undefined,
    comment: normalizeOptionalText(operation.comment),
    reason: normalizeOptionalText(operation.reason || operation.quarantineReason),
    currentQuantity: Number.isFinite(Number(operation.currentQuantity)) ? Number(operation.currentQuantity) : undefined,
    stability: normalizeOptionalText(operation.stability),
    turgor: normalizeOptionalText(operation.turgor),
    survivalRate: normalizeOptionalText(operation.survivalRate),
    completionResult: normalizeOptionalText(operation.completionResult),
    environmentTemperature: normalizeOptionalText(operation.environmentTemperature),
    environmentHumidity: normalizeOptionalText(operation.environmentAirHumidity || operation.environmentHumidity),
    substrateHumidity: normalizeOptionalText(operation.substrateHumidity),
    environmentLight: normalizeOptionalText(operation.environmentLight),
    ventilation: normalizeOptionalText(operation.ventilation),
  };
}

function buildOperationSummaryContext(operation, card) {
  return getOperationSummaryItems(operation, card)
    .map(([label, value]) => ({
      label: normalizeOptionalText(label),
      value: normalizeOptionalText(value),
    }))
    .filter((item) => item.label && item.value);
}

function isProblemHistoryOperation(operation) {
  return [
    'problem',
    'problemRecovery',
    'problemIsolation',
    'contamination',
    'quarantine',
  ].includes(operation?.type);
}

function isQuantityChangeOperation(operation) {
  return [
    'batchCreated',
    'rooting',
    'propagation',
    'statusChange',
    'sale',
    'death',
    'discard',
    'introLoss',
    'problemIsolation',
    'plantingCompletion',
  ].includes(operation?.type) || Number.isFinite(Number(operation?.currentQuantity));
}

function normalizeStageHistoryChange(change) {
  if (!change || typeof change !== 'object') {
    return null;
  }

  return {
    changedAt: normalizeOptionalText(change.changedAt || change.date),
    fromStage: normalizeOptionalText(change.fromStage),
    toStage: normalizeOptionalText(change.toStage),
  };
}

function buildHistorySlice(entities, limit, mapEntity) {
  const normalizedEntities = Array.isArray(entities)
    ? entities.filter(Boolean)
    : [];

  return {
    included: normalizedEntities.slice(0, limit).map(mapEntity).filter(Boolean),
    total: normalizedEntities.length,
    truncated: normalizedEntities.length > limit,
  };
}

function buildScopedOperationContext(card, operation) {
  const baseContext = buildRecentOperationContext(operation);

  if (!baseContext) {
    return null;
  }

  const effectiveStage = normalizeOptionalText(getOperationEffectiveStage(operation, card));
  const summaryItems = buildOperationSummaryContext(operation, card);

  return {
    ...baseContext,
    stage: effectiveStage || baseContext.stage,
    summaryItems: summaryItems.length > 0 ? summaryItems : undefined,
  };
}

function getStageObservationTypes(stage) {
  return STAGE_OBSERVATION_TYPES[stage] || STAGE_OBSERVATION_TYPES.default;
}

function buildLatestObservationContext(card) {
  const stage = normalizeText(card?.stage) || INTRO_STAGE;
  const operations = Array.isArray(card?.operations) ? card.operations : [];
  const observation = getLatestOperation(operations, getStageObservationTypes(stage));

  if (!observation) {
    return null;
  }

  return {
    type: normalizeOptionalText(observation.type),
    title: normalizeOptionalText(observation.title),
    date: normalizeOptionalText(observation.date),
    stage,
    stressLevel: normalizeOptionalText(observation.stressLevel),
    stability: normalizeOptionalText(observation.stability),
    turgor: normalizeOptionalText(observation.turgor),
    survivalRate: normalizeOptionalText(observation.survivalRate),
    completionResult: normalizeOptionalText(observation.completionResult),
    comment: normalizeOptionalText(observation.comment),
    environmentTemperature: normalizeOptionalText(observation.environmentTemperature),
    environmentHumidity: normalizeOptionalText(observation.environmentAirHumidity || observation.environmentHumidity),
    substrateHumidity: normalizeOptionalText(observation.substrateHumidity),
    environmentLight: normalizeOptionalText(observation.environmentLight),
    ventilation: normalizeOptionalText(observation.ventilation),
  };
}

function buildPlantRecommendationsContext(card, plantsCatalog) {
  const plant = findCatalogPlant(card, plantsCatalog);
  const stage = normalizeText(card?.stage) || INTRO_STAGE;
  const items = getStagePlantRecommendationItems(plant, stage);

  if (!plant || items.length === 0) {
    return null;
  }

  return {
    originalName: normalizeOptionalText(plant.originalName),
    stage,
    items: items.map((item) => ({
      label: normalizeOptionalText(item.label),
      value: normalizeOptionalText(item.value),
    })).filter((item) => item.label && item.value),
  };
}

function buildScopedHistoryContext(card) {
  const rawOperations = Array.isArray(card?.operations) ? card.operations : [];
  const operations = sortOperationsByLatest(
    rawOperations.filter((operation) => operation?.type !== 'stageSettingsUpdated'),
  );
  const recentEventsSlice = buildHistorySlice(
    operations,
    MAX_SCOPED_RECENT_EVENTS,
    (operation) => buildScopedOperationContext(card, operation),
  );
  const recentProblemsSlice = buildHistorySlice(
    operations.filter(isProblemHistoryOperation),
    MAX_SCOPED_RECENT_PROBLEMS,
    (operation) => buildScopedOperationContext(card, operation),
  );
  const quantityChangesSlice = buildHistorySlice(
    operations.filter(isQuantityChangeOperation),
    MAX_SCOPED_QUANTITY_CHANGES,
    (operation) => buildScopedOperationContext(card, operation),
  );
  const stageChanges = [...(Array.isArray(card?.stageHistory) ? card.stageHistory : [])]
    .sort((first, second) => getTimestampValue(second.changedAt || second.date) - getTimestampValue(first.changedAt || first.date));
  const stageChangesSlice = buildHistorySlice(
    stageChanges,
    MAX_SCOPED_STAGE_CHANGES,
    normalizeStageHistoryChange,
  );

  return {
    operations: {
      includedCount: recentEventsSlice.included.length,
      items: recentEventsSlice.included,
      totalCount: recentEventsSlice.total,
      truncated: recentEventsSlice.truncated,
    },
    problems: {
      includedCount: recentProblemsSlice.included.length,
      items: recentProblemsSlice.included,
      totalCount: recentProblemsSlice.total,
      truncated: recentProblemsSlice.truncated,
    },
    quantityChanges: {
      includedCount: quantityChangesSlice.included.length,
      items: quantityChangesSlice.included,
      totalCount: quantityChangesSlice.total,
      truncated: quantityChangesSlice.truncated,
    },
    stageChanges: {
      includedCount: stageChangesSlice.included.length,
      items: stageChangesSlice.included,
      totalCount: stageChangesSlice.total,
      truncated: stageChangesSlice.truncated,
    },
  };
}

function buildScopedCardContext(card, plantsCatalog) {
  const latestProblemOperation = getLatestActiveProblemOperation(card);
  const history = buildScopedHistoryContext(card);

  return {
    code: normalizeText(card.code) || undefined,
    displayName: normalizeOptionalText(getCardDisplayName(card)),
    cultureName: normalizeOptionalText(card.cultureName),
    speciesName: normalizeOptionalText(card.speciesName),
    varietyName: normalizeOptionalText(card.varietyName),
    stage: normalizeText(card.stage) || INTRO_STAGE,
    batchStatus: getResolvedBatchStatus(card),
    sterilityStatus: normalizeOptionalText(card.sterilityStatus),
    originType: normalizeOptionalText(card.originType),
    generation: Number.isFinite(Number(card.generation)) ? Number(card.generation) : undefined,
    sourceMaterial: normalizeOptionalText(card.sourceMaterial || card.sourcePlantName),
    parentBatch: normalizeOptionalText(card.parentBatch),
    parentCode: normalizeOptionalText(card.parentCode || card.parentBatch),
    location: normalizeOptionalText(getCardLocationDescription(card)),
    locationDescription: normalizeOptionalText(getCardLocationDescription(card)),
    createdAt: normalizeOptionalText(card.createdAt),
    updatedAt: normalizeOptionalText(card.updatedAt),
    currentQuantity: getCardCurrentQuantity(card),
    quantities: {
      initial: Number(card.quantity) || 0,
      current: getCardCurrentQuantity(card),
      healthy: getCardHealthyQuantity(card),
      activeProblem: getCardActiveProblemQuantity(card),
    },
    latestProblem: latestProblemOperation
      ? {
        date: normalizeOptionalText(latestProblemOperation.date),
        problemDescription: normalizeOptionalText(latestProblemOperation.problemDescription),
        problemType: normalizeOptionalText(latestProblemOperation.problemType),
        riskLevel: normalizeOptionalText(latestProblemOperation.riskLevel),
      }
      : null,
    latestRiskLevel: normalizeOptionalText(getLatestProblemRiskLevel(card)),
    riskSnapshot: buildStageRiskSnapshot(card),
    plantRecommendations: buildPlantRecommendationsContext(card, plantsCatalog),
    latestObservation: buildLatestObservationContext(card),
    recentEvents: history.operations.items,
    history,
  };
}

export function buildAiContext({
  cultureCards = [],
  currentEmployee = null,
  focusOverride = null,
  plantsCatalog = [],
  question = '',
} = {}) {
  const normalizedCards = Array.isArray(cultureCards)
    ? cultureCards.filter((card) => card && typeof card === 'object')
    : [];
  const prioritizedCards = normalizedCards
    .slice()
    .sort(compareCardsByAiPriority);
  const attentionCards = prioritizedCards.filter((card) => {
    const status = getResolvedBatchStatus(card);

    return isAttentionStatus(status) || getCardActiveProblemQuantity(card) > 0;
  });
  const activeProblems = attentionCards
    .map(buildActiveProblemContext)
    .filter(Boolean)
    .slice(0, MAX_ACTIVE_PROBLEMS);
  const scopedCardContext = normalizedCards.length === 1
    ? buildScopedCardContext(normalizedCards[0], plantsCatalog)
    : null;
  const focus = resolveAiContextFocus(question, focusOverride);
  const summary = {
    cardsCount: normalizedCards.length,
    eventsCount: normalizedCards.reduce((sum, card) => (
      sum + (Array.isArray(card?.operations) ? card.operations.length : 0)
    ), 0),
    activeProblemsCount: activeProblems.length,
    focus,
    stageCounts: buildStageCounts(normalizedCards),
    statusCounts: buildStatusCounts(normalizedCards),
    contextLimits: {
      overviewBatches: MAX_OVERVIEW_BATCHES,
      attentionBatches: MAX_ATTENTION_BATCHES,
      activeProblems: MAX_ACTIVE_PROBLEMS,
      scopedRecentEvents: MAX_SCOPED_RECENT_EVENTS,
      scopedRecentProblems: MAX_SCOPED_RECENT_PROBLEMS,
      scopedQuantityChanges: MAX_SCOPED_QUANTITY_CHANGES,
      scopedStageChanges: MAX_SCOPED_STAGE_CHANGES,
    },
  };

  if (focus === 'attention') {
    return {
      generatedAt: new Date().toISOString(),
      employee: createEmployeeContext(currentEmployee),
      summary,
      scopedCard: scopedCardContext,
      attentionBatches: attentionCards
        .slice(0, MAX_ATTENTION_BATCHES)
        .map(buildAttentionBatchContext),
      activeProblems,
    };
  }

  if (focus === 'overview') {
    return {
      generatedAt: new Date().toISOString(),
      employee: createEmployeeContext(currentEmployee),
      summary,
      scopedCard: scopedCardContext,
      overviewBatches: prioritizedCards
        .slice(0, MAX_OVERVIEW_BATCHES)
        .map(buildOverviewBatchContext),
      activeProblems,
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    employee: createEmployeeContext(currentEmployee),
    summary,
    scopedCard: scopedCardContext,
    activeProblems: [],
  };
}

export function serializeAiContext(context) {
  return JSON.stringify(context, null, 2);
}

export function estimateAiContextSize(context) {
  return serializeAiContext(context).length;
}

// eslint-disable-next-line no-unused-vars
function buildGuruContextPromptLegacy({ context, text }) {
  const normalizedQuestion = normalizeText(text);

  if (!normalizedQuestion) {
    return '';
  }

  if (!context || typeof context !== 'object') {
    return normalizedQuestion;
  }

  if (context.scopedCard && typeof context.scopedCard === 'object') {
    return [
      'Ты AI-ассистент Sadovnik Diary.',
      'Отвечай только по JSON-контексту. Если данных нет, прямо скажи об этом.',
      'Это чат конкретной партии.',
      'Сначала анализируй объект scopedCard.',
      'Для вопросов о растении используй scopedCard.displayName, cultureName, speciesName, varietyName.',
      'Для вопросов об уходе и рекомендациях сначала используй scopedCard.plantRecommendations.',
      'Для вопросов о риске, наблюдениях и причинах сначала используй scopedCard.latestObservation.',
      'Если plantRecommendations нет или их недостаточно, тогда используй scopedCard.latestObservation, scopedCard.latestRiskLevel, scopedCard.latestProblem, scopedCard.riskSnapshot и scopedCard.recentEvents.',
      'Если пользователь спрашивает "почему", объясняй причину только по фактам из latestObservation, recentEvents и riskSnapshot, ничего не придумывай.',
      'Если нужного поля нет в scopedCard, тогда явно скажи, что этой информации нет в контексте партии.',
      '',
      'Контекст Sadovnik:',
      serializeAiContext(context),
      '',
      'Вопрос:',
      normalizedQuestion,
    ].join('\n');
  }

  return [
    'Ты AI-ассистент Sadovnik Diary.',
    'Отвечай только по JSON-контексту. Если данных нет, скажи об этом.',
    '',
    'Контекст Sadovnik:',
    serializeAiContext(context),
    '',
    'Вопрос:',
    normalizedQuestion,
  ].join('\n');
}

export function buildGuruContextPrompt({ context, text }) {
  const normalizedQuestion = normalizeText(text);

  if (!normalizedQuestion) {
    return '';
  }

  if (!context || typeof context !== 'object') {
    return normalizedQuestion;
  }

  if (context.scopedCard && typeof context.scopedCard === 'object') {
    return [
      'Ты AI-ассистент Sadovnik Diary.',
      'Отвечай только по JSON-контексту. Если данных нет, прямо скажи об этом.',
      'Это чат конкретной партии Sadovnik Diary.',
      'Предоставленные данные относятся только к этой партии.',
      'Сначала анализируй объект scopedCard.',
      'Для вопросов о растении используй scopedCard.displayName, cultureName, speciesName, varietyName.',
      'Для вопросов об уходе и рекомендациях сначала используй scopedCard.plantRecommendations.',
      'Для вопросов о текущем состоянии и истории используй scopedCard.history, scopedCard.latestObservation, scopedCard.latestRiskLevel, scopedCard.latestProblem, scopedCard.riskSnapshot и scopedCard.recentEvents.',
      'Если любой раздел scopedCard.history помечен truncated === true, не утверждай, что более старого события точно не было. Говори только о переданной части истории.',
      'Если пользователь спрашивает "почему", объясняй причину только по фактам из latestObservation, history, recentEvents и riskSnapshot, ничего не придумывай.',
      'Если нужного поля нет в scopedCard, тогда явно скажи, что этой информации нет в контексте партии.',
      '',
      'Контекст Sadovnik:',
      serializeAiContext(context),
      '',
      'Вопрос:',
      normalizedQuestion,
    ].join('\n');
  }

  return [
    'Ты AI-ассистент Sadovnik Diary.',
    'Отвечай только по JSON-контексту. Если данных нет, скажи об этом.',
    '',
    'Контекст Sadovnik:',
    serializeAiContext(context),
    '',
    'Вопрос:',
    normalizedQuestion,
  ].join('\n');
}
