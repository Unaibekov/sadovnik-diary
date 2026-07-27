// Построение карточек культуры и операций по ним.
import { createBatchCreatedOperation, getCardDisplayName } from './batch';
import { buildUniqueCardId } from './codeGeneration';
import { removeRecommendationFields } from './recommendations';

export function buildCultureCardPayload({
  cultureForm,
  cultureCards,
  editingCardId,
  selectedStage,
  createdAt,
  cultureName,
  speciesName,
  varietyName,
  code,
  quantity,
  sourceMaterial,
  parentBatch,
  startPhotoUri,
  startPhotoUris,
  userId,
  nowIso,
}) {
  const qrStatus = cultureForm.qrStatus === 'printed' ? 'printed' : 'pending_print';
  const batchCreatedOperation = createBatchCreatedOperation({
    createdAt,
    stage: selectedStage,
    quantity,
    code,
    createdBy: userId,
  }, nowIso);
  const nextOperations = editingCardId
    ? cultureForm.operations || []
    : [batchCreatedOperation];
  const cultureFormWithoutRecommendations = removeRecommendationFields(cultureForm);

  return {
    ...cultureFormWithoutRecommendations,
    id: editingCardId || buildUniqueCardId(cultureCards, 'card'),
    createdAt,
    cultureName,
    speciesName,
    varietyName,
    code,
    quantity,
    currentQuantity: Number(quantity) || 0,
    sourceMaterial,
    locationDescription: cultureForm.locationDescription?.trim() || '',
    parentBatch,
    sterilityStatus: cultureForm.sterilityStatus || 'unchecked',
    startPhotoUri: startPhotoUris?.[0] || startPhotoUri || '',
    startPhotoUris: Array.isArray(startPhotoUris) ? startPhotoUris.filter(Boolean) : startPhotoUri ? [startPhotoUri] : [],
    name: getCardDisplayName({ cultureName, speciesName, varietyName }),
    stage: selectedStage,
    qrPrinted: cultureForm.qrPrinted || false,
    qrPrintedAt: cultureForm.qrPrintedAt || null,
    qrPrintedBy: cultureForm.qrPrintedBy || null,
    qrStatus,
    batchStatus: editingCardId
      ? (cultureForm.batchStatus === 'draft' ? 'active' : (cultureForm.batchStatus || 'active'))
      : 'active',
    activeProblemQuantity: Number(cultureForm.activeProblemQuantity) || 0,
    status: cultureForm.status || 'active',
    cancelledAt: cultureForm.cancelledAt || null,
    cancelledBy: cultureForm.cancelledBy || null,
    operations: nextOperations,
  };
}

export function buildCancelledCultureCard(card, userId, nowIso) {
  return {
    ...card,
    status: 'cancelled',
    cancelledAt: nowIso,
    cancelledBy: userId,
  };
}

export function buildSavedCultureCards(cultureCards, editingCardId, nextCard) {
  return editingCardId
    ? cultureCards.map((card) => (card.id === editingCardId ? nextCard : card))
    : [nextCard, ...cultureCards];
}

export function buildCancelledCultureCards(cultureCards, editingCardId, userId, nowIso) {
  return cultureCards.map((card) => (
    card.id !== editingCardId
      ? card
      : buildCancelledCultureCard(card, userId, nowIso)
  ));
}
