// Построение карточки после удаления операции.
import { getResolvedBatchStatus } from './cardSelectors';
import { buildProblemQuantityPatch } from './batch';
import { getLatestOperation } from './operationTimeline';

export function buildDeletedOperationCard(card, operationId) {
  const deletedOperation = (card.operations || []).find((operation) => operation.id === operationId);
  const remainingOperations = (card.operations || []).filter((operation) => operation.id !== operationId);
  const nextCard = {
    ...card,
    operations: remainingOperations,
    ...(deletedOperation?.type === 'movement'
      ? {
        locationDescription: getLatestOperation(remainingOperations, 'movement')?.nextLocation || '',
      }
      : {}),
  };

  return {
    ...nextCard,
    ...buildProblemQuantityPatch(nextCard),
    batchStatus: getResolvedBatchStatus(nextCard),
    status: getResolvedBatchStatus(nextCard) === 'sold' ? 'archived' : 'active',
  };
}

export function buildDeletedOperationCards(cultureCards, selectedCardId, operationId) {
  const selectedCard = cultureCards.find((card) => card.id === selectedCardId);
  const deletedOperation = (selectedCard?.operations || []).find((operation) => operation.id === operationId);
  const childCardId = deletedOperation?.childCardId;

  return cultureCards.filter((card) => !(
    childCardId &&
    card.id === childCardId &&
    card.sourceEventId === deletedOperation.id
  )).map((card) => (
    card.id === selectedCardId
      ? buildDeletedOperationCard(card, operationId)
      : card
  ));
}
