// Проверка полей для тепличных операций.
export function getGreenhouseValidationError(introActionType, statusForm) {
  if (introActionType === 'greenhouseObservation' && ![
    statusForm.growthRate,
    statusForm.stressLevel,
    statusForm.conditionDescription,
    statusForm.comment,
    statusForm.photoUri,
    ...(Array.isArray(statusForm.photoUris) ? statusForm.photoUris : []),
  ].some((value) => value.trim())) {
    return 'greenhouse_observation_missing';
  }

  if (introActionType === 'greenhouseCare' && !statusForm.careType.trim()) {
    return 'greenhouse_care_type_missing';
  }

  return '';
}
