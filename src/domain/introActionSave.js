import { buildIntroActionOperation } from './introActionOperationBuilder';
import { buildIntroActionUpdatedCard } from './introActionCardBuilder';
import { buildStatusOperationContext } from './statusOperationContext';
import { INTRO_STAGE } from './constants';

export function buildIntroActionSaveResult({
  actionConfig,
  cultureCards,
  editingOperationId,
  introActionType,
  introActionForm,
  nowIso,
  selectedCard,
  selectedCalendarDate,
  selectedCardOperations,
  userId,
}) {
  const { editedOperation } = buildStatusOperationContext({
    editingOperationId,
    selectedCard,
    selectedCardOperations,
  });

  const value = introActionForm[actionConfig.field].trim();
  const nextOperation = buildIntroActionOperation({
    actionConfig,
    editingOperationId,
    editedOperation,
    nowIso,
    selectedCalendarDate,
    selectedStage: selectedCard.stage || INTRO_STAGE,
    userId,
    value,
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
