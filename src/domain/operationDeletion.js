// Построение карточки после удаления операции.
import { getResolvedBatchStatus } from './cardSelectors';
import { buildProblemQuantityPatch } from './batch';

export function buildDeletedOperationCard(card, operationId) {
  const deletedOperation = (card.operations || []).find((operation) => operation.id === operationId);
  const remainingOperations = (card.operations || []).filter((operation) => operation.id !== operationId);
  const nextCard = {
    ...card,
    operations: remainingOperations,
    ...(deletedOperation?.type === 'movement'
      ? {
        locationDescription: remainingOperations.find((operation) => operation.type === 'movement')?.nextLocation || '',
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
  return cultureCards.map((card) => (
    card.id === selectedCardId
      ? buildDeletedOperationCard(card, operationId)
      : card
  ));
}
