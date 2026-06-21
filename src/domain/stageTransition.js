// Построение операции смены стадии и очистка рекомендаций.
import { removeRecommendationFields } from './recommendations';

export function buildStageChangeOperation({
  currentQuantity,
  cloneTransitionStats,
  operationId,
  nextStage,
  nowIso,
  selectedCard,
  selectedCalendarDate,
}) {
  return {
    id: operationId || `${Date.now()}`,
    type: 'stageChange',
    title: '\u0418\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0435 \u0441\u0442\u0430\u0434\u0438\u0438',
    fromStage: selectedCard.stage,
    toStage: nextStage,
    stage: nextStage,
    date: selectedCalendarDate,
    stageChangedAt: selectedCalendarDate,
    rootedCount: cloneTransitionStats?.rootedCount,
    rootingPercent: cloneTransitionStats?.rootingPercent,
    currentQuantity: cloneTransitionStats?.currentQuantity ?? currentQuantity,
    createdAt: nowIso,
  };
}

export function buildStageTransitionCard({
  card,
  nextOperation,
  nextStage,
  nowIso,
  selectedCalendarDate,
  selectedStage,
  userId,
}) {
  const cardWithoutRecommendations = removeRecommendationFields(card);

  return {
    ...cardWithoutRecommendations,
    stage: nextStage,
    stageChangedAt: selectedCalendarDate,
    stageChangedBy: userId,
    stageHistory: [
      {
        fromStage: selectedStage,
        toStage: nextStage,
        date: selectedCalendarDate,
        changedAt: nowIso,
        changedBy: userId,
      },
      ...(card.stageHistory || []),
    ],
    operations: [nextOperation, ...(card.operations || [])],
  };
}

