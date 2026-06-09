// Сохранение стартового действия и связанных данных.
import { buildIntroActionOperation } from './introActionOperationBuilder';
import { buildIntroActionUpdatedCard } from './introActionCardBuilder';
import { buildStatusOperationContext } from './statusOperationContext';
import { INTRO_STAGE } from './constants';
import { isPositiveInteger } from './batch';

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
  const { editedOperation, currentQuantity } = buildStatusOperationContext({
    editingOperationId,
    selectedCard,
    selectedCardOperations,
  });

  const value = introActionForm[actionConfig.field].trim();
  const lossCount = introActionForm.lossCount?.trim() || '';
  const lossReason = introActionForm.lossReason?.trim() || '';
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
    currentQuantity: introLossPreviousQuantity,
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
