// Сборка результата сохранения карточек культуры.
import { buildCancelledCultureCards, buildCultureCardPayload, buildSavedCultureCards } from './cultureCardBuilder';

export function buildCultureCardSaveResult({
  cultureCards,
  cultureForm,
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
  const nextCard = buildCultureCardPayload({
    cultureForm,
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
  });

  return {
    nextCard,
    nextCards: buildSavedCultureCards(cultureCards, editingCardId, nextCard),
  };
}

export function buildCultureCardCancelResult({
  cultureCards,
  editingCardId,
  userId,
  nowIso,
}) {
  return {
    nextCards: buildCancelledCultureCards(cultureCards, editingCardId, userId, nowIso),
  };
}
