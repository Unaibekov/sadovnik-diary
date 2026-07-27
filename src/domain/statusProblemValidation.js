import {
  getProblemBatchStatus,
  getProblemStateFromOperations,
} from './problemState';

export { getProblemBatchStatus };

function isPositiveIntegerValue(value) {
  return /^[1-9]\d*$/.test(`${value}`.trim());
}

export function getProblemValidationError(actionType, form, {
  availableHealthyQuantity = null,
} = {}) {
  if (actionType !== 'problem') {
    return '';
  }

  const affectedQuantityText = `${form.affectedQuantity || ''}`.trim();

  if (
    availableHealthyQuantity !== null &&
    Number.isFinite(Number(availableHealthyQuantity)) &&
    Number(availableHealthyQuantity) === 0
  ) {
    return 'problem_all_plants_affected';
  }

  if (!affectedQuantityText) {
    return 'problem_quantity_missing';
  }

  if (!isPositiveIntegerValue(affectedQuantityText)) {
    return Number(affectedQuantityText) <= 0
      ? 'problem_quantity_not_positive'
      : 'problem_quantity_not_integer';
  }

  if (
    availableHealthyQuantity !== null &&
    Number.isFinite(Number(availableHealthyQuantity)) &&
    Number(affectedQuantityText) > Number(availableHealthyQuantity)
  ) {
    return 'problem_quantity_gt_healthy';
  }

  const hasProblemDetails = [
    form.problemType,
    form.riskLevel,
    form.problemDescription,
  ].every((value) => `${value || ''}`.trim());

  return hasProblemDetails ? '' : 'problem_missing';
}

export function getProblemRecoveryValidationError(actionType, form, {
  activeProblemQuantity = null,
} = {}) {
  if (actionType !== 'problemRecovery') {
    return '';
  }

  const recoveredQuantityText = `${form.recoveredQuantity || ''}`.trim();

  if (
    activeProblemQuantity !== null &&
    Number.isFinite(Number(activeProblemQuantity)) &&
    Number(activeProblemQuantity) === 0
  ) {
    return 'recovery_no_active_problem';
  }

  if (!recoveredQuantityText) {
    return 'recovery_quantity_missing';
  }

  if (!isPositiveIntegerValue(recoveredQuantityText)) {
    return Number(recoveredQuantityText) <= 0
      ? 'recovery_quantity_not_positive'
      : 'recovery_quantity_not_integer';
  }

  if (
    activeProblemQuantity !== null &&
    Number.isFinite(Number(activeProblemQuantity)) &&
    Number(recoveredQuantityText) > Number(activeProblemQuantity)
  ) {
    return 'recovery_quantity_gt_problem';
  }

  return '';
}

export function getProblemIsolationValidationError(actionType, form, {
  currentQuantity = null,
  remainingProblemQuantity = null,
} = {}) {
  if (actionType !== 'problemIsolation') {
    return '';
  }

  const isolationQuantityText = `${form.isolationQuantity || ''}`.trim();
  const isolationLocation = `${form.isolationLocation || ''}`.trim();

  if (
    remainingProblemQuantity !== null &&
    Number.isFinite(Number(remainingProblemQuantity)) &&
    Number(remainingProblemQuantity) === 0
  ) {
    return 'isolation_no_remaining_problem';
  }

  if (!isolationQuantityText) {
    return 'isolation_quantity_missing';
  }

  if (!isPositiveIntegerValue(isolationQuantityText)) {
    return Number(isolationQuantityText) <= 0
      ? 'isolation_quantity_not_positive'
      : 'isolation_quantity_not_integer';
  }

  if (
    currentQuantity !== null &&
    Number.isFinite(Number(currentQuantity)) &&
    Number(isolationQuantityText) > Number(currentQuantity)
  ) {
    return 'isolation_quantity_gt_current';
  }

  if (
    remainingProblemQuantity !== null &&
    Number.isFinite(Number(remainingProblemQuantity)) &&
    Number(isolationQuantityText) > Number(remainingProblemQuantity)
  ) {
    return 'isolation_quantity_gt_remaining_problem';
  }

  if (!isolationLocation) {
    return 'isolation_location_missing';
  }

  return '';
}

export function getProblemBatchStatusFromOperations(operations = [], stage = '', activeProblemQuantity = null) {
  return getProblemStateFromOperations(operations, {
    activeProblemQuantity,
    stage,
  }).batchStatus;
}

export function hasProblemOperation(card) {
  const activeProblemQuantity = Number.isFinite(Number(card?.activeProblemQuantity))
    ? Number(card.activeProblemQuantity)
    : null;

  return getProblemStateFromOperations(card?.operations || [], {
    activeProblemQuantity,
    currentQuantity: card?.currentQuantity ?? card?.quantity ?? null,
    originType: card?.originType || '',
    stage: card?.stage || '',
  }).isActive;
}
