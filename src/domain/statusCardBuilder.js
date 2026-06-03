import { getCardCurrentQuantity } from './batch';
import { getResolvedBatchStatus } from './cardSelectors';
import { getFallbackBatchStatus } from './statusCardStatusResolver';
import { getGreenhouseCareIntervalsPatch } from './statusCardMutations';

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

  const nextCard = {
    ...card,
    operations: nextOperations,
    ...getGreenhouseCareIntervalsPatch(card, introActionType, statusForm),
  };
  const nextQuantity = getCardCurrentQuantity(nextCard);
  const fallbackBatchStatus = getFallbackBatchStatus(
    card,
    introActionType,
    nextQuantity,
    statusForm,
  );
  const nextCardWithStatus = {
    ...nextCard,
    batchStatus: fallbackBatchStatus,
  };

  return {
    ...nextCardWithStatus,
    batchStatus: getResolvedBatchStatus(nextCardWithStatus),
    status: getResolvedBatchStatus(nextCardWithStatus) === 'sold'
      ? 'archived'
      : 'active',
  };
}
