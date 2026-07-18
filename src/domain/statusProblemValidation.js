import { stages } from './constants';

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

export function getProblemBatchStatus(problemType, riskLevel, stage = '') {
  if (!problemType) {
    return '';
  }

  const isHardeningStage = stage === stages[4];

  if (problemType === 'Карантин') {
    return 'quarantine';
  }

  if (problemType === 'Контаминация') {
    return 'problem';
  }

  return ['Болезнь', 'Вредители', 'Стресс', 'Ожоги', 'Увядание', 'Погодный стресс', 'Другое']
    .includes(problemType)
    ? 'problem'
    : '';
}

function getActiveProblemQuantityFromOperations(operations = []) {
  const affectedQuantity = operations.reduce((sum, operation) => {
    if (operation.type === 'problem') {
      return sum + (Number(operation.affectedQuantity) || 0);
    }

    if (operation.type === 'problemRecovery') {
      return sum - (Number(operation.recoveredQuantity) || 0);
    }

    return sum;
  }, 0);

  return Math.max(affectedQuantity, 0);
}

export function getProblemBatchStatusFromOperations(operations = [], stage = '', activeProblemQuantity = null) {
  const hasActiveProblemQuantity = Number.isFinite(Number(activeProblemQuantity))
    ? Number(activeProblemQuantity) > 0
    : getActiveProblemQuantityFromOperations(operations) > 0;

  for (const operation of operations) {
    if (operation.type === 'quarantine') {
      return 'quarantine';
    }

    if (operation.type === 'contamination') {
      return 'problem';
    }

    if (operation.type === 'problem' && hasActiveProblemQuantity) {
      const problemBatchStatus = getProblemBatchStatus(
        operation.problemType,
        operation.riskLevel,
        operation.stage || stage,
      );

      if (problemBatchStatus) {
        return problemBatchStatus;
      }
    }
  }

  return '';
}

export function hasProblemOperation(card) {
  return Boolean(getProblemBatchStatusFromOperations(card?.operations || [], card?.stage || ''));
}
