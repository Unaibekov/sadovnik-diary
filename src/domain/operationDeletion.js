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
