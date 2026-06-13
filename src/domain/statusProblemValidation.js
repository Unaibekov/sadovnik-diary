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

  if (!isHardeningStage && problemType === 'Контаминация') {
    return 'problem';
  }

  const isCriticalRisk = ['Высокий', 'Критический'].includes(riskLevel);

  if (
    !isHardeningStage &&
    ['Болезнь', 'Вредители', 'Стресс', 'Другое'].includes(problemType) &&
    isCriticalRisk
  ) {
    return 'problem';
  }

  if (
    isHardeningStage &&
    ['Ожоги', 'Увядание', 'Болезнь', 'Вредители', 'Другое'].includes(problemType) &&
    isCriticalRisk
  ) {
    return 'problem';
  }

  if (
    stage === stages[5] &&
    ['Увядание', 'Ожоги', 'Болезнь', 'Вредители', 'Погодный стресс', 'Другое'].includes(problemType) &&
    isCriticalRisk
  ) {
    return 'problem';
  }

  return '';
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
