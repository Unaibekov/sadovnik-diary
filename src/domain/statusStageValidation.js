// Проверка этапных параметров адаптационных операций.
export function getAdaptationValidationError(introActionType, statusForm) {
  if (introActionType === 'adaptationStress' && ![
    statusForm.stressLevel,
    statusForm.turgor,
    statusForm.comment,
    statusForm.photoNote,
    statusForm.photoUri,
    ...(Array.isArray(statusForm.photoUris) ? statusForm.photoUris : []),
  ].some((value) => value.trim())) {
    return 'adaptation_stress_missing';
  }

  if (introActionType === 'adaptationEnvironment' && ![
    statusForm.environmentTemperature,
    statusForm.environmentAirHumidity,
    statusForm.environmentHumidity,
    statusForm.substrateHumidity,
    statusForm.environmentLight,
    statusForm.ventilation,
    statusForm.humidityReduction,
  ].some((value) => value.trim())) {
    return 'adaptation_environment_missing';
  }

  if (introActionType === 'adaptationHumidityReduction' && ![
    statusForm.environmentAirHumidity,
    statusForm.environmentHumidity,
    statusForm.substrateHumidity,
    statusForm.humidityReduction,
    statusForm.turgor,
    statusForm.stability,
  ].some((value) => value.trim())) {
    return 'adaptation_humidity_reduction_missing';
  }

  if (introActionType === 'adaptationCare' && !statusForm.careType.trim()) {
    return 'adaptation_care_type_missing';
  }

  return '';
}

export function getHardeningValidationError(introActionType, statusForm) {
  if (introActionType === 'hardeningObservation' && ![
    statusForm.stressLevel,
    statusForm.turgor,
    statusForm.readinessForPlanting,
    statusForm.comment,
    statusForm.photoNote,
    statusForm.photoUri,
    ...(Array.isArray(statusForm.photoUris) ? statusForm.photoUris : []),
  ].some((value) => `${value || ''}`.trim())) {
    return 'hardening_observation_missing';
  }

  if (introActionType === 'hardeningCare' && !statusForm.careType.trim()) {
    return 'hardening_care_type_missing';
  }

  return '';
}

export function getPlantingValidationError(introActionType, statusForm) {
  if (introActionType === 'planting' && ![
    statusForm.plantingLocation,
    statusForm.plantingScheme,
    statusForm.plotArea,
    statusForm.soilType,
    statusForm.comment,
    statusForm.photoNote,
    statusForm.photoUri,
    ...(Array.isArray(statusForm.photoUris) ? statusForm.photoUris : []),
  ].some((value) => `${value || ''}`.trim())) {
    return 'planting_missing';
  }

  if (introActionType === 'plantingObservation' && ![
    statusForm.survivalRate,
    statusForm.stressLevel,
    statusForm.turgor,
    statusForm.comment,
    statusForm.photoNote,
    statusForm.photoUri,
    ...(Array.isArray(statusForm.photoUris) ? statusForm.photoUris : []),
  ].some((value) => `${value || ''}`.trim())) {
    return 'planting_observation_missing';
  }

  if (introActionType === 'plantingCare' && !statusForm.careType.trim()) {
    return 'planting_care_type_missing';
  }

  if (introActionType === 'plantingCompletion' && !statusForm.completionResult.trim()) {
    return 'planting_completion_missing';
  }

  return '';
}
