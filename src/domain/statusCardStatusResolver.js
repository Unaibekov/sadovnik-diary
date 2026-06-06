// Определение итогового статуса партии после операции.
export function getFallbackBatchStatus(card, introActionType, nextQuantity, statusForm) {
  if (introActionType === 'sale' && nextQuantity === 0) {
    return 'sold';
  }

  if (introActionType === 'quarantine') {
    return 'quarantine';
  }

  if (introActionType === 'quarantineReleased') {
    return 'active';
  }

  const isCriticalAdaptationStress = (
    introActionType === 'adaptationStress' &&
    statusForm.stressLevel === 'Критический'
  );

  const isCriticalGreenhouseEvent = (
    ['greenhouseObservation', 'greenhouseDisease', 'greenhouseCare'].includes(introActionType) &&
    (
      statusForm.stressLevel === 'Критический' ||
      statusForm.riskLevel === 'Критический' ||
      statusForm.diseaseSeverity === 'Критическая'
    )
  );

  if (isCriticalAdaptationStress || isCriticalGreenhouseEvent) {
    return 'problem';
  }

  if (introActionType === 'sale') {
    return 'partial';
  }

  return card.batchStatus || 'active';
}
