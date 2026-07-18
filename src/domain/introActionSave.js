// Сохранение стартового действия и связанных данных.
import { buildIntroActionOperation } from './introActionOperationBuilder';
import { buildIntroActionUpdatedCard } from './introActionCardBuilder';
import { buildStatusOperationContext } from './statusOperationContext';
import { INTRO_STAGE } from './constants';
import { getCardActiveProblemQuantity, getCardHealthyQuantity, isPositiveInteger } from './batch';
import { getProblemRecoveryValidationError, getProblemValidationError } from './statusProblemValidation';

export function buildIntroActionSaveResult({
  actionConfig,
  cultureCards,
  editingOperationId,
  introActionType,
  introActionForm,
  movementDetails,
  nowIso,
  selectedCard,
  selectedCalendarDate,
  selectedCardOperations,
  userId,
}) {
  const { cardWithoutEditedOperation, editedOperation, currentQuantity } = buildStatusOperationContext({
    editingOperationId,
    selectedCard,
    selectedCardOperations,
  });

  const value = `${introActionForm[actionConfig.field] || ''}`.trim();
  const lossCount = `${introActionForm.lossCount || ''}`.trim();
  const lossReason = `${introActionForm.lossReason || ''}`.trim();
  const introLossPreviousQuantity = editedOperation?.previousQuantity ?? currentQuantity;
  const hasMovementLocation = Boolean(
    movementDetails?.greenhouseName ||
    movementDetails?.rackName ||
    movementDetails?.shelfName ||
    value,
  );

  if (introActionType === 'introLoss') {
    if (!isPositiveInteger(lossCount)) {
      return { nextCards: cultureCards, nextOperation: null, error: 'Укажите корректное количество потерь' };
    }

    if (Number(lossCount) > introLossPreviousQuantity) {
      return { nextCards: cultureCards, nextOperation: null, error: 'Количество потерь не может быть больше текущего остатка' };
    }

    if (!lossReason) {
      return { nextCards: cultureCards, nextOperation: null, error: actionConfig.error };
    }
  }

  if (introActionType === 'movement' && !hasMovementLocation) {
    return { nextCards: cultureCards, nextOperation: null, error: actionConfig.error };
  }

  const problemValidationError = getProblemValidationError(introActionType, introActionForm, {
    availableHealthyQuantity: getCardHealthyQuantity(cardWithoutEditedOperation),
  });
  if (problemValidationError) {
    const problemErrorMessages = {
      problem_quantity_missing: 'Укажите количество растений с проблемой',
      problem_quantity_not_positive: 'Количество должно быть больше нуля',
      problem_quantity_not_integer: 'Укажите целое количество растений с проблемой',
      problem_quantity_gt_healthy: 'Количество не может превышать здоровый остаток партии',
      problem_all_plants_affected: 'Все растения партии уже относятся к активным проблемам',
      problem_missing: 'Укажите тип, риск и описание проблемы',
    };

    return {
      nextCards: cultureCards,
      nextOperation: null,
      error: problemErrorMessages[problemValidationError] || actionConfig.error,
    };
  }

  const recoveryValidationError = getProblemRecoveryValidationError(introActionType, introActionForm, {
    activeProblemQuantity: getCardActiveProblemQuantity(cardWithoutEditedOperation),
  });
  if (recoveryValidationError) {
    const recoveryErrorMessages = {
      recovery_no_active_problem: 'В партии нет активных больных растений',
      recovery_quantity_missing: 'Укажите количество выздоровевших растений',
      recovery_quantity_not_positive: 'Количество выздоровевших должно быть больше нуля',
      recovery_quantity_not_integer: 'Укажите целое количество выздоровевших растений',
      recovery_quantity_gt_problem: 'Количество выздоровевших не может превышать активное количество больных',
    };

    return {
      nextCards: cultureCards,
      nextOperation: null,
      error: recoveryErrorMessages[recoveryValidationError] || actionConfig.error,
    };
  }

  const nextOperation = buildIntroActionOperation({
    actionConfig,
    editingOperationId,
    editedOperation,
    nowIso,
    selectedCalendarDate,
    selectedStage: selectedCard.stage || INTRO_STAGE,
    userId,
    photoUri: introActionForm.photoUri || '',
    photoUris: introActionForm.photoUris || [],
    value,
    lossCount,
    lossReason,
    movementDetails,
    problemType: `${introActionForm.problemType || ''}`.trim(),
    riskLevel: `${introActionForm.riskLevel || ''}`.trim(),
    affectedQuantity: `${introActionForm.affectedQuantity || ''}`.trim(),
    recoveredQuantity: `${introActionForm.recoveredQuantity || ''}`.trim(),
    problemDescription: `${introActionForm.problemDescription || ''}`.trim(),
    comment: `${introActionForm.comment || ''}`.trim(),
    currentQuantity: introLossPreviousQuantity,
    activeProblemQuantityBefore: getCardActiveProblemQuantity(cardWithoutEditedOperation),
  });

  const nextCards = cultureCards.map((card) => {
    if (card.id !== selectedCard.id) {
      return card;
    }

    return buildIntroActionUpdatedCard(card, {
      editingOperationId,
      introActionType,
      nextOperation,
    });
  });

  return { nextCards, nextOperation };
}
