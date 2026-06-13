// Сборка карточки после изменения статуса.
import { getCardCurrentQuantity } from './batch';
import { getResolvedBatchStatus } from './cardSelectors';
import { getFallbackBatchStatus } from './statusCardStatusResolver';
import { getGreenhouseCareIntervalsPatch } from './statusCardMutations';
import {
  getProblemBatchStatus,
} from './statusProblemValidation';

export function buildUpdatedStatusCard(card, {
  editingOperationId,
  introActionType,
  nextOperation,
  statusForm,
}) {
  const currentOperations = card.operations || [];
  const nextOperations = editingOperationId
    ? currentOperations.map((operation) => (
      operation.id === editingOperationId ? nextOperation : operation
    ))
    : [nextOperation, ...currentOperations];
  const hasContamination = nextOperations.some((operation) => (
    operation.type === 'contamination' ||
    (operation.type === 'problem' && operation.problemType === 'Контаминация')
  ));
  const problemBatchStatus = getProblemBatchStatus(
    nextOperation.problemType,
    nextOperation.riskLevel,
    card.stage,
  );
  const nextCard = {
    ...card,
    operations: nextOperations,
    ...(introActionType === 'movement'
      ? { locationDescription: nextOperation.nextLocation || '' }
      : {}),
    ...getGreenhouseCareIntervalsPatch(card, introActionType, statusForm),
    ...(introActionType === 'problem' && problemBatchStatus === 'quarantine'
      ? { batchStatus: 'quarantine' }
      : {}),
  };
  const nextQuantity = getCardCurrentQuantity(nextCard);
  const fallbackBatchStatus = getFallbackBatchStatus(
    card,
    introActionType,
    nextQuantity,
    statusForm,
  );
  const nextBatchStatus = introActionType === 'problem'
    ? problemBatchStatus === 'quarantine'
      ? 'quarantine'
      : fallbackBatchStatus
    : fallbackBatchStatus;
  const nextCardWithStatus = {
    ...nextCard,
    batchStatus: nextBatchStatus,
    sterilityStatus: hasContamination ? 'contaminated' : 'unchecked',
  };

  return {
    ...nextCardWithStatus,
    batchStatus: getResolvedBatchStatus(nextCardWithStatus),
    status: ['sold', 'archived'].includes(getResolvedBatchStatus(nextCardWithStatus))
      ? 'archived'
      : 'active',
  };
}
