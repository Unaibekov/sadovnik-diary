// Определение итогового статуса партии после операции.
import { getProblemBatchStatus } from './statusProblemValidation';

export function getFallbackBatchStatus(card, introActionType, nextQuantity, statusForm) {
  if (introActionType === 'sale' && nextQuantity === 0) {
    return 'sold';
  }

  if ((card.batchStatus || 'active') === 'quarantine') {
    return 'quarantine';
  }

  if (introActionType === 'quarantine') {
    return 'quarantine';
  }

  if (introActionType === 'quarantineReleased') {
    return 'active';
  }

  if (introActionType === 'problem') {
    const problemBatchStatus = getProblemBatchStatus(statusForm.problemType, statusForm.riskLevel);

    if (problemBatchStatus) {
      return problemBatchStatus;
    }

    return card.batchStatus || 'active';
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
