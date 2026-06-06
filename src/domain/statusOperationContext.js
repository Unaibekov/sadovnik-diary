// Контекст для построения операций со статусом.
import { getCardCurrentQuantity } from './batch';

export function buildStatusOperationContext({
  editingOperationId,
  selectedCard,
  selectedCardOperations,
}) {
  const editedOperation = editingOperationId
    ? selectedCardOperations.find((operation) => operation.id === editingOperationId)
    : null;
  const cardWithoutEditedOperation = editedOperation
    ? {
      ...selectedCard,
      operations: selectedCardOperations.filter((operation) => operation.id !== editingOperationId),
    }
    : selectedCard;

  return {
    cardWithoutEditedOperation,
    currentQuantity: getCardCurrentQuantity(cardWithoutEditedOperation),
    editedOperation,
  };
}
