// Преобразование карточки после ввода стартового действия.
import { getProblemBatchStatus } from './statusProblemValidation';

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

  return {
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
}
