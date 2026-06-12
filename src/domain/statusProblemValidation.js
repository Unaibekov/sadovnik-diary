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

export function getProblemBatchStatus(problemType, riskLevel) {
  if (!problemType) {
    return '';
  }

  if (problemType === 'Карантин') {
    return 'quarantine';
  }

  if (problemType === 'Контаминация') {
    return 'problem';
  }

  if (
    ['Болезнь', 'Вредители', 'Стресс', 'Другое'].includes(problemType) &&
    ['Высокий', 'Критический'].includes(riskLevel)
  ) {
    return 'problem';
  }

  return '';
}

export function getProblemBatchStatusFromOperations(operations = []) {
  for (const operation of operations) {
    if (operation.type === 'quarantine') {
      return 'quarantine';
    }

    if (operation.type === 'contamination') {
      return 'problem';
    }

    if (operation.type === 'problem') {
      const problemBatchStatus = getProblemBatchStatus(operation.problemType, operation.riskLevel);

      if (problemBatchStatus) {
        return problemBatchStatus;
      }
    }
  }

  return '';
}
