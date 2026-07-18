// Преобразование карточки после ввода стартового действия.
import { getProblemBatchStatus } from './statusProblemValidation';
import { buildProblemQuantityPatch, getCardCurrentQuantity } from './batch';

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
  const hasContamination = nextOperations.some((operation) => (
    operation.type === 'contamination' ||
    (operation.type === 'problem' && operation.problemType === 'Контаминация')
  ));
  const currentBatchStatus = card.batchStatus || 'active';
  const problemBatchStatus = getProblemBatchStatus(nextOperation.problemType, nextOperation.riskLevel);

  const nextCard = {
    ...card,
    batchStatus: currentBatchStatus === 'quarantine'
      ? 'quarantine'
      : introActionType === 'quarantine' || problemBatchStatus === 'quarantine'
        ? 'quarantine'
        : problemBatchStatus === 'problem'
          ? 'problem'
          : currentBatchStatus,
    sterilityStatus: hasContamination ? 'contaminated' : 'unchecked',
    ...(introActionType === 'movement'
      ? { locationDescription: nextOperation.nextLocation || '' }
      : {}),
    operations: nextOperations,
  };
  const problemQuantityPatch = buildProblemQuantityPatch(nextCard);
  const finalBatchStatus = nextCard.batchStatus === 'problem' &&
    problemQuantityPatch.activeProblemQuantity <= 0 &&
    !hasContamination
    ? getCardCurrentQuantity(nextCard) < Number(card.quantity || 0)
      ? 'partial'
      : 'active'
    : nextCard.batchStatus;

  return {
    ...nextCard,
    ...problemQuantityPatch,
    batchStatus: finalBatchStatus,
  };
}
