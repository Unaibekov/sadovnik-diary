// Преобразование карточки после ввода стартового действия.
export function buildIntroActionUpdatedCard(card, {
  editingOperationId,
  introActionType,
  nextOperation,
}) {
  const nextOperations = editingOperationId
    ? (card.operations || []).map((operation) => (
      operation.id === editingOperationId ? nextOperation : operation
    ))
    : [nextOperation, ...(card.operations || [])];

  return {
    ...card,
    batchStatus: introActionType === 'quarantine' ? 'quarantine' : card.batchStatus || 'active',
    sterilityStatus: introActionType === 'contamination' ? 'contaminated' : card.sterilityStatus || 'unchecked',
    ...(introActionType === 'movement'
      ? { locationDescription: nextOperation.nextLocation || '' }
      : {}),
    operations: nextOperations,
  };
}
