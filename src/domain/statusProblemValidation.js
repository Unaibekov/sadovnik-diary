import { stages } from './constants';

export function getProblemValidationError(actionType, form) {
  if (actionType !== 'problem') {
    return '';
  }

  const hasProblemDetails = [
    form.problemType,
    form.riskLevel,
    form.problemDescription,
    form.comment,
    form.photoNote,
    form.photoUri,
    ...(Array.isArray(form.photoUris) ? form.photoUris : []),
  ].some((value) => `${value || ''}`.trim());

  return hasProblemDetails ? '' : 'problem_missing';
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

export function getProblemBatchStatusFromOperations(operations = [], stage = '') {
  for (const operation of operations) {
    if (operation.type === 'quarantine') {
      return 'quarantine';
    }

    if (operation.type === 'contamination') {
      return 'problem';
    }

    if (operation.type === 'problem') {
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
