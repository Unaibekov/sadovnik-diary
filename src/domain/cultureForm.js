// Создание и подготовка формы культуры.
import { EMPTY_CATALOG_VALUE } from './constants';
import { generatePlantingCode } from './batch';
import { createEmptyCultureForm } from './forms';
import { removeRecommendationFields } from './recommendations';

export function applyCultureSelection(currentForm, cultureName) {
  return {
    ...currentForm,
    cultureName,
    speciesName: '',
    varietyName: '',
    sourcePlantName: '',
  };
}

export function applySpeciesSelection(currentForm, speciesName) {
  return {
    ...currentForm,
    speciesName,
    varietyName: '',
    sourcePlantName: '',
  };
}

export function applyVarietySelection(currentForm, varietyName, plantsCatalog) {
  const selectedPlant = (plantsCatalog || []).find((plant) => (
    (plant.cultureName || EMPTY_CATALOG_VALUE) === currentForm.cultureName &&
    (plant.speciesName || EMPTY_CATALOG_VALUE) === currentForm.speciesName &&
    (plant.varietyName || EMPTY_CATALOG_VALUE) === varietyName
  ));

  return {
    ...currentForm,
    varietyName,
    sourcePlantName: selectedPlant?.originalName || '',
  };
}

export function isDuplicateCardCode(cards, nextCode, editingCardId) {
  return (cards || []).some((card) => (
    card.id !== editingCardId &&
    (card.code || '').trim().toLowerCase() === (nextCode || '').trim().toLowerCase()
  ));
}

export function buildGeneratedPlantingCode({
  cultureCards,
  createdAt,
  selectedStage,
  editingCardId,
}) {
  const code = generatePlantingCode(createdAt, selectedStage);
  const isDuplicateCode = isDuplicateCardCode(cultureCards, code, editingCardId);

  return { code, isDuplicateCode };
}

export function buildCultureFormGeneratedCodeState({
  cultureCards,
  createdAt,
  selectedStage,
  editingCardId,
}) {
  const { code, isDuplicateCode } = buildGeneratedPlantingCode({
    cultureCards,
    createdAt,
    selectedStage,
    editingCardId,
  });

  if (isDuplicateCode) {
    return {
      isDuplicateCode: true,
      error: 'Код уже существует. Сгенерируйте код ещё раз.',
    };
  }

  return {
    isDuplicateCode: false,
    error: '',
    nextCultureForm: {
      code,
      qrStatus: 'pending_print',
    },
  };
}

export function buildCultureFormForEdit(card) {
  return {
    ...createEmptyCultureForm(),
    ...removeRecommendationFields(card),
    batchStatus: card?.batchStatus === 'draft' ? 'active' : (card?.batchStatus || 'active'),
    locationDescription: card?.locationDescription || '',
    qrPrinted: card?.qrPrinted || false,
    qrPrintedAt: card?.qrPrintedAt || null,
    qrPrintedBy: card?.qrPrintedBy || null,
  };
}

export function buildCultureFormSelectionResult({
  currentForm,
  type,
  value,
  plantsCatalog,
}) {
  if (type === 'culture') {
    return applyCultureSelection(currentForm, value);
  }

  if (type === 'species') {
    return applySpeciesSelection(currentForm, value);
  }

  if (type === 'variety') {
    return applyVarietySelection(currentForm, value, plantsCatalog);
  }

  return currentForm;
}

export function isRequiredFieldMissingInForm(cultureForm, touchedSubmit, field) {
  if (!touchedSubmit) {
    return false;
  }

  return !`${cultureForm[field]}`.trim();
}
