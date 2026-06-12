// Проверка полей для тепличных операций.
export function getGreenhouseValidationError(introActionType, statusForm) {
  if (introActionType === 'greenhouseObservation' && ![
    statusForm.growthRate,
    statusForm.stressLevel,
    statusForm.conditionDescription,
    statusForm.comment,
    statusForm.photoNote,
    statusForm.photoUri,
    ...(Array.isArray(statusForm.photoUris) ? statusForm.photoUris : []),
  ].some((value) => value.trim())) {
    return 'greenhouse_observation_missing';
  }

  if (introActionType === 'greenhouseCare' && !statusForm.careType.trim()) {
    return 'greenhouse_care_type_missing';
  }

  if (introActionType === 'greenhouseEnvironment' && ![
    statusForm.environmentTemperature,
    statusForm.environmentAirHumidity,
    statusForm.environmentHumidity,
    statusForm.environmentLight,
    statusForm.ventilation,
    statusForm.placement,
    statusForm.densityChange,
  ].some((value) => value.trim())) {
    return 'greenhouse_environment_missing';
  }

  if (introActionType === 'greenhouseDisease' && ![
    statusForm.diseaseName,
    statusForm.pestName,
    statusForm.diseaseSeverity,
    statusForm.riskLevel,
    statusForm.productName,
  ].some((value) => value.trim())) {
    return 'greenhouse_disease_missing';
  }

  return '';
}
