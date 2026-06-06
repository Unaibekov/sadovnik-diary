// Проверка этапных параметров адаптационных операций.
export function getAdaptationValidationError(introActionType, statusForm) {
  if (introActionType === 'adaptationStress' && ![
    statusForm.stressLevel,
    statusForm.stability,
    statusForm.comment,
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
