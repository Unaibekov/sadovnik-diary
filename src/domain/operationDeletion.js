// Построение карточки после удаления операции.
import { getResolvedBatchStatus } from './cardSelectors';

export function buildDeletedOperationCard(card, operationId) {
  const nextCard = {
    ...card,
    operations: (card.operations || []).filter((operation) => operation.id !== operationId),
  };

  return {
    ...nextCard,
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
