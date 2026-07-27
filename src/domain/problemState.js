import { stages } from './constants';

function getTimestamp(value) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortOperationsByLatest(operations = []) {
  return [...operations].sort((first, second) => {
    const timeDiff = getTimestamp(second.updatedAt || second.createdAt || second.date) -
      getTimestamp(first.updatedAt || first.createdAt || first.date);

    if (timeDiff !== 0) {
      return timeDiff;
    }

    return 0;
  });
}

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

    if (operation.type === 'problemIsolation') {
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
  return sortOperationsByLatest(operations).find((operation) => (
    ['problem', 'contamination', 'quarantine'].includes(operation.type)
  )) || null;
}

export function getLatestProblemRiskLevelFromOperations(operations = []) {
  return sortOperationsByLatest(operations).find((operation) => (
    ['problemRecovery', 'problem'].includes(operation.type) &&
    operation.riskLevel
  ))?.riskLevel || '';
}

export function getProblemStateFromOperations(operations = [], {
  activeProblemQuantity = null,
  currentQuantity = null,
  originType = '',
  stage = '',
} = {}) {
  const normalizedActiveProblemQuantity = Number.isFinite(Number(activeProblemQuantity))
    ? Number(activeProblemQuantity)
    : getActiveProblemQuantityFromOperations(operations, currentQuantity);
  const remainingProblemQuantity = originType === 'problemIsolation'
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
    remainingProblemQuantity: Math.max(remainingProblemQuantity, 0),
    riskLevel: latestRiskLevel || latestProblemOperation?.riskLevel || '',
  };
}
