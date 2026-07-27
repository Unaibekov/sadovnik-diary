import { stages } from './constants';
import { getLatestOperation } from './operationTimeline';

export function getProblemBatchStatus(problemType, riskLevel, stage = '') {
  if (!problemType) {
    return '';
  }

  if (problemType === 'Карантин') {
    return 'quarantine';
  }

  if (problemType === 'Контаминация') {
    return 'problem';
  }

  return ['Болезнь', 'Вредители', 'Стресс', 'Ожоги', 'Увядание', 'Погодный стресс', 'Другое']
    .includes(problemType)
    ? 'problem'
    : riskLevel === 'Критический' || stage === stages[4]
      ? 'problem'
      : '';
}

export function getActiveProblemQuantityFromOperations(operations = [], currentQuantity = null) {
  const normalizedCurrentQuantity = Number(currentQuantity);
  const hasCurrentQuantity = Number.isFinite(normalizedCurrentQuantity);
  const hasFullBatchProblem = operations.some((operation) => (
    ['contamination', 'quarantine'].includes(operation.type)
  ));
  const startingProblemQuantity = hasFullBatchProblem
    ? hasCurrentQuantity
      ? normalizedCurrentQuantity
      : 1
    : 0;
  const affectedQuantity = operations.reduce((sum, operation) => {
    if (operation.type === 'problem') {
      return sum + (Number(operation.affectedQuantity) || 0);
    }

    if (operation.type === 'problemRecovery') {
      return sum - (Number(operation.recoveredQuantity) || 0);
    }

    if (operation.type === 'problemIsolation' && !hasFullBatchProblem) {
      return sum - (Number(operation.count || operation.quantity) || 0);
    }

    return sum;
  }, startingProblemQuantity);
  const normalizedAffectedQuantity = Math.max(affectedQuantity, 0);

  return hasCurrentQuantity
    ? Math.min(normalizedAffectedQuantity, Math.max(normalizedCurrentQuantity, 0))
    : normalizedAffectedQuantity;
}

export function getLatestProblemOperation(operations = []) {
  return getLatestOperation(operations, ['problem', 'contamination', 'quarantine']);
}

export function getLatestProblemRiskLevelFromOperations(operations = []) {
  return getLatestOperation(operations, ['problemRecovery', 'problem'], (operation) => (
    Boolean(operation.riskLevel)
  ))?.riskLevel || '';
}

function hasProblemStateOperations(operations = []) {
  return operations.some((operation) => [
    'problem',
    'contamination',
    'quarantine',
    'problemRecovery',
    'problemIsolation',
  ].includes(operation.type));
}

export function getProblemStateFromOperations(operations = [], {
  activeProblemQuantity = null,
  currentQuantity = null,
  originType = '',
  stage = '',
} = {}) {
  const calculatedActiveProblemQuantity = getActiveProblemQuantityFromOperations(operations, currentQuantity);
  const canUseStoredActiveProblemQuantity = !hasProblemStateOperations(operations) &&
    Number.isFinite(Number(activeProblemQuantity));
  const normalizedActiveProblemQuantity = canUseStoredActiveProblemQuantity
    ? Number(activeProblemQuantity)
    : calculatedActiveProblemQuantity;
  const unisolatedProblemQuantity = originType === 'problemIsolation'
    ? 0
    : normalizedActiveProblemQuantity;
  const isActive = normalizedActiveProblemQuantity > 0;
  const latestProblemOperation = isActive
    ? getLatestProblemOperation(operations)
    : null;
  const batchStatus = isActive && latestProblemOperation
    ? latestProblemOperation.type === 'quarantine'
      ? 'quarantine'
      : latestProblemOperation.type === 'contamination'
        ? 'problem'
        : getProblemBatchStatus(
          latestProblemOperation.problemType,
          latestProblemOperation.riskLevel,
          latestProblemOperation.stage || stage,
        )
    : '';
  const latestRiskLevel = getLatestProblemRiskLevelFromOperations(operations);

  return {
    activeProblemQuantity: Math.max(normalizedActiveProblemQuantity, 0),
    batchStatus,
    isActive: isActive && Boolean(batchStatus),
    latestProblemOperation,
    problemType: latestProblemOperation?.problemType ||
      (batchStatus === 'quarantine' ? 'Карантин' : batchStatus === 'problem' ? 'Контаминация' : ''),
    unisolatedProblemQuantity: Math.max(unisolatedProblemQuantity, 0),
    riskLevel: latestRiskLevel || latestProblemOperation?.riskLevel || '',
  };
}
