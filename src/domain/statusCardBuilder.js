// Сборка карточки после изменения статуса.
import { getCardCurrentQuantity } from './batch';
import { getResolvedBatchStatus } from './cardSelectors';
import { getFallbackBatchStatus } from './statusCardStatusResolver';
import { getGreenhouseCareIntervalsPatch } from './statusCardMutations';
import {
  getProblemBatchStatus,
  getProblemBatchStatusFromOperations,
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
  const problemBatchStatusFromOperations = getProblemBatchStatusFromOperations(nextOperations, card.stage);

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
    ...(introActionType === 'problem' && problemBatchStatus === 'problem'
      ? { sterilityStatus: 'contaminated' }
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
    ? problemBatchStatusFromOperations || (
      ['problem', 'quarantine'].includes(card.batchStatus || '')
        ? 'active'
        : fallbackBatchStatus
    )
    : fallbackBatchStatus;
  const nextCardWithStatus = {
    ...nextCard,
    batchStatus: nextBatchStatus,
    sterilityStatus: hasContamination ? 'contaminated' : 'unchecked',
  };

  return {
    ...nextCardWithStatus,
    batchStatus: getResolvedBatchStatus(nextCardWithStatus),
    status: getResolvedBatchStatus(nextCardWithStatus) === 'sold'
      ? 'archived'
      : 'active',
  };
}
