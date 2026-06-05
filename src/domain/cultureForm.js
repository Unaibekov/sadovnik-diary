import { EMPTY_CATALOG_VALUE } from './constants';
import { generatePlantingCode } from './batch';

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

export function isRequiredFieldMissingInForm(cultureForm, touchedSubmit, field) {
  if (!touchedSubmit) {
    return false;
  }

  return !`${cultureForm[field]}`.trim();
}
