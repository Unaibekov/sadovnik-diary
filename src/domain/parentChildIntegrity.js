import { normalizeCode } from './codeGeneration';

export const PARENT_CHILD_INTEGRITY_MESSAGE = 'Не удалось создать связанную дочернюю партию. Проверьте данные и повторите сохранение.';

export class ParentChildIntegrityError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = 'ParentChildIntegrityError';
    this.code = code;
  }
}

function fail(code) {
  throw new ParentChildIntegrityError(code);
}

function getExpectedOriginOperationType(originType) {
  return originType === 'problemIsolation' ? 'isolatedFromParent' : 'clonedFromParent';
}

function getExpectedParentOperationType(originType) {
  return originType === 'problemIsolation' ? 'problemIsolation' : 'propagation';
}

function getPositiveFiniteQuantity(quantity) {
  const normalizedQuantity = Number(quantity);

  return Number.isFinite(normalizedQuantity) && normalizedQuantity > 0
    ? normalizedQuantity
    : 0;
}

function getOperationQuantity(operation) {
  return Number(operation?.quantity ?? operation?.count) || 0;
}

function hasAncestor(cultureCards, startParentId, expectedAncestorId) {
  const visitedIds = new Set();
  let currentParentId = startParentId;

  while (currentParentId) {
    if (currentParentId === expectedAncestorId) {
      return true;
    }

    if (visitedIds.has(currentParentId)) {
      return true;
    }

    visitedIds.add(currentParentId);
    currentParentId = cultureCards.find((card) => card.id === currentParentId)?.parentCardId || '';
  }

  return false;
}

export function validateParentChildIntegrity({
  cultureCards,
  parentCard,
  childCard,
  parentOperation,
  originType,
  quantity,
}) {
  const cards = Array.isArray(cultureCards) ? cultureCards : [];
  const expectedQuantity = getPositiveFiniteQuantity(quantity);

  if (!parentCard?.id) {
    fail('parent_missing');
  }

  if (!childCard?.id) {
    fail('child_missing');
  }

  if (!parentOperation?.id) {
    fail('parent_operation_missing');
  }

  if (!expectedQuantity) {
    fail('quantity_not_positive');
  }

  if (parentCard.id === childCard.id) {
    fail('child_parent_same_card');
  }

  if (!cards.some((card) => card.id === parentCard.id)) {
    fail('parent_not_in_result');
  }

  if (!cards.some((card) => card.id === childCard.id)) {
    fail('child_not_in_result');
  }

  if (cards.filter((card) => card.id === childCard.id).length !== 1) {
    fail('child_id_not_unique');
  }

  const normalizedChildCode = normalizeCode(childCard.code || '');
  if (
    normalizedChildCode &&
    cards.filter((card) => normalizeCode(card.code || '') === normalizedChildCode).length !== 1
  ) {
    fail('child_code_not_unique');
  }

  if (childCard.parentCardId !== parentCard.id) {
    fail('child_parent_id_mismatch');
  }

  if ((childCard.parentCode || '') !== (parentCard.code || '')) {
    fail('child_parent_code_mismatch');
  }

  if (childCard.sourceEventId !== parentOperation.id) {
    fail('child_source_event_mismatch');
  }

  if (childCard.originType !== originType) {
    fail('child_origin_type_mismatch');
  }

  if ((Number(childCard.generation) || 0) !== (Number(parentCard.generation) || 0) + 1) {
    fail('child_generation_mismatch');
  }

  if (getPositiveFiniteQuantity(childCard.quantity) !== expectedQuantity) {
    fail('child_quantity_mismatch');
  }

  if (getPositiveFiniteQuantity(childCard.currentQuantity) !== expectedQuantity) {
    fail('child_current_quantity_mismatch');
  }

  if (parentOperation.type !== getExpectedParentOperationType(originType)) {
    fail('parent_operation_type_mismatch');
  }

  if (parentOperation.childCardId !== childCard.id) {
    fail('parent_operation_child_id_mismatch');
  }

  if ((parentOperation.childCode || '') !== (childCard.code || '')) {
    fail('parent_operation_child_code_mismatch');
  }

  if (getOperationQuantity(parentOperation) !== expectedQuantity) {
    fail('parent_operation_quantity_mismatch');
  }

  const originOperation = (childCard.operations || []).find(
    (operation) => operation.type === getExpectedOriginOperationType(originType),
  );

  if (!originOperation) {
    fail('child_origin_operation_missing');
  }

  if (originOperation.parentCardId !== parentCard.id) {
    fail('child_origin_parent_id_mismatch');
  }

  if ((originOperation.parentCode || '') !== (parentCard.code || '')) {
    fail('child_origin_parent_code_mismatch');
  }

  if (originOperation.sourceEventId !== parentOperation.id) {
    fail('child_origin_source_event_mismatch');
  }

  if ((Number(originOperation.generation) || 0) !== (Number(parentCard.generation) || 0) + 1) {
    fail('child_origin_generation_mismatch');
  }

  if (getOperationQuantity(originOperation) !== expectedQuantity) {
    fail('child_origin_quantity_mismatch');
  }

  if (hasAncestor(cards, parentCard.parentCardId, childCard.id)) {
    fail('parent_child_cycle');
  }

  return true;
}

export function isParentChildIntegrityError(error) {
  return error instanceof ParentChildIntegrityError;
}
