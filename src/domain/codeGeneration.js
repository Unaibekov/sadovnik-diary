import { generatePlantingCode } from './batch';

export function normalizeCode(value) {
  return `${value || ''}`.trim().toLowerCase();
}

export function buildExistingCodeSet(cards = [], editingCardId = '') {
  return new Set(
    cards
      .filter((card) => card.id !== editingCardId)
      .map((card) => normalizeCode(card.code))
      .filter(Boolean),
  );
}

export function buildUniquePlantingCode({
  cultureCards = [],
  createdAt,
  selectedStage,
  editingCardId = '',
}) {
  const existingCodes = buildExistingCodeSet(cultureCards, editingCardId);
  const baseCode = generatePlantingCode(createdAt, selectedStage);
  let code = baseCode;
  let index = 1;

  while (existingCodes.has(normalizeCode(code))) {
    code = `${baseCode}-${String(index).padStart(2, '0')}`;
    index += 1;
  }

  existingCodes.add(normalizeCode(code));
  return code;
}

export function buildUniqueCardId(cards = [], prefix = 'card') {
  const existingIds = new Set(cards.map((card) => `${card.id || ''}`).filter(Boolean));
  const baseId = `${prefix}-${Date.now()}`;
  let id = baseId;
  let index = 1;

  while (existingIds.has(id)) {
    id = `${baseId}-${index}`;
    index += 1;
  }

  existingIds.add(id);
  return id;
}
