// Сохранение стартового действия и связанных данных.
import { buildIntroActionOperation } from './introActionOperationBuilder';
import { buildIntroActionUpdatedCard } from './introActionCardBuilder';
import { buildStatusOperationContext } from './statusOperationContext';
import { INTRO_STAGE } from './constants';
import {
  getCardActiveProblemQuantity,
  getCardHealthyQuantity,
  getCardUnisolatedProblemQuantity,
  getLatestActiveProblemOperation,
  isPositiveInteger,
} from './batch';
import {
  getProblemBatchStatus,
  getProblemIsolationValidationError,
  getProblemRecoveryValidationError,
  getProblemValidationError,
} from './statusProblemValidation';
import { attachChildToOperation, buildDerivedChildBatch } from './propagationChildCard';
import {
  isParentChildIntegrityError,
  PARENT_CHILD_INTEGRITY_MESSAGE,
  validateParentChildIntegrity,
} from './parentChildIntegrity';

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

  const isolationValidationError = getProblemIsolationValidationError(introActionType, introActionForm, {
    currentQuantity,
    unisolatedProblemQuantity: getCardUnisolatedProblemQuantity(cardWithoutEditedOperation),
  });
  if (isolationValidationError) {
    const isolationErrorMessages = {
      isolation_no_remaining_problem: 'В партии нет проблемных растений для изоляции',
      isolation_quantity_missing: 'Укажите количество растений для изоляции',
      isolation_quantity_not_positive: 'Количество для изоляции должно быть больше нуля',
      isolation_quantity_not_integer: 'Укажите целое количество растений для изоляции',
      isolation_quantity_gt_current: 'Количество для изоляции не может превышать текущий остаток партии',
      isolation_quantity_gt_remaining_problem: 'Нельзя изолировать больше неизолированного проблемного остатка',
      isolation_location_missing: 'Укажите новое местоположение изолированной партии',
    };

    return {
      nextCards: cultureCards,
      nextOperation: null,
      error: isolationErrorMessages[isolationValidationError] || actionConfig.error,
    };
  }

  const sourceProblemOperation = introActionType === 'problemIsolation'
    ? (cardWithoutEditedOperation.operations || []).find((operation) => operation.id === introActionForm.sourceProblemEventId) ||
      getLatestActiveProblemOperation(cardWithoutEditedOperation)
    : null;

  const builtOperation = buildIntroActionOperation({
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
    isolationQuantity: `${introActionForm.isolationQuantity || ''}`.trim(),
    sourceProblemEventId: sourceProblemOperation?.id || '',
    isolationLocation: `${introActionForm.isolationLocation || ''}`.trim(),
    isolationComment: `${introActionForm.isolationComment || ''}`.trim(),
    problemDescription: `${introActionForm.problemDescription || ''}`.trim(),
    comment: `${introActionForm.comment || ''}`.trim(),
    currentQuantity: introLossPreviousQuantity,
    activeProblemQuantityBefore: getCardActiveProblemQuantity(cardWithoutEditedOperation),
  });

  const isolationChildCard = introActionType === 'problemIsolation' && !editingOperationId
    ? buildDerivedChildBatch({
      cultureCards,
      parentCard: selectedCard,
      sourceOperation: builtOperation,
      quantity: Number(introActionForm.isolationQuantity) || 0,
      userId,
      originType: 'problemIsolation',
      stage: selectedCard.stage || INTRO_STAGE,
      locationDescription: `${introActionForm.isolationLocation || ''}`.trim(),
      batchStatus: getProblemBatchStatus(
        sourceProblemOperation?.problemType,
        sourceProblemOperation?.riskLevel,
        selectedCard.stage || INTRO_STAGE,
      ) || 'problem',
      healthStatus: 'problem',
      isolationStatus: 'isolated',
      sourceProblemOperation,
    })
    : null;
  const nextOperation = isolationChildCard
    ? attachChildToOperation(builtOperation, isolationChildCard)
    : builtOperation;

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

  const finalCards = isolationChildCard ? [...nextCards, isolationChildCard] : nextCards;

  if (isolationChildCard) {
    try {
      validateParentChildIntegrity({
        cultureCards: finalCards,
        parentCard: selectedCard,
        childCard: isolationChildCard,
        parentOperation: nextOperation,
        originType: 'problemIsolation',
        quantity: Number(introActionForm.isolationQuantity) || 0,
      });
    } catch (integrityError) {
      if (isParentChildIntegrityError(integrityError)) {
        return {
          nextCards: cultureCards,
          nextOperation: null,
          error: PARENT_CHILD_INTEGRITY_MESSAGE,
        };
      }

      throw integrityError;
    }
  }

  return {
    nextCards: finalCards,
    nextOperation,
  };
}
