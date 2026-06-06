// Преобразование карточки после ввода стартового действия.
export function buildIntroActionUpdatedCard(card, {
  editingOperationId,
  introActionType,
  nextOperation,
}) {
  return {
    ...card,
    batchStatus: introActionType === 'quarantine' ? 'quarantine' : card.batchStatus || 'active',
    sterilityStatus: introActionType === 'contamination' ? 'contaminated' : card.sterilityStatus || 'unchecked',
    operations: editingOperationId
      ? (card.operations || []).map((operation) => (
        operation.id === editingOperationId ? nextOperation : operation
      ))
      : [nextOperation, ...(card.operations || [])],
  };
}
