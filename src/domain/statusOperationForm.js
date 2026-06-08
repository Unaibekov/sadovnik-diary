// Построение формы статуса из операции.
import { getStatusFormComment } from './statusForm';

export function buildStatusFormFromOperation(operation, countField) {
  return {
    ...(countField ? { [countField]: operation.count || '' } : {}),
    reason: operation.reason || operation.quarantineReason || '',
    comment: getStatusFormComment(operation),
    photoNote: operation.photoNote || '',
    photoUri: operation.photoUri || '',
    photoUris: Array.isArray(operation.photoUris) && operation.photoUris.length > 0
      ? operation.photoUris.filter(Boolean)
      : operation.photoUri
        ? [operation.photoUri]
        : [],
    saleType: operation.saleType || '',
    recipient: operation.recipient || '',
    saleAmount: operation.saleAmount || '',
    propagationMethod: operation.propagationMethod || '',
    stressLevel: operation.stressLevel || '',
    conditionDescription: operation.conditionDescription || '',
    environmentTemperature: operation.environmentTemperature || '',
    environmentHumidity: operation.environmentHumidity || operation.environmentAirHumidity || '',
    environmentAirHumidity: operation.environmentAirHumidity || '',
    substrateHumidity: operation.substrateHumidity || '',
    environmentLight: operation.environmentLight || '',
    ventilation: operation.ventilation || '',
    humidityReduction: operation.humidityReduction || '',
    turgor: operation.turgor || '',
    stability: operation.stability || '',
    careType: operation.careType || '',
    growthRate: operation.growthRate || '',
    riskLevel: operation.riskLevel || '',
    careIntervalDays: operation.careIntervalDays || '',
    wateringIntervalDays: operation.wateringIntervalDays || '',
    diseaseName: operation.diseaseName || '',
    pestName: operation.pestName || '',
    diseaseSeverity: operation.diseaseSeverity || '',
    waterVolume: operation.waterVolume || '',
    applicationMethod: operation.applicationMethod || '',
    productName: operation.productName || '',
    dosage: operation.dosage || '',
    plantReaction: operation.plantReaction || '',
    placement: operation.placement || '',
    densityChange: operation.densityChange || '',
    greenhouseName: operation.greenhouseName || '',
    rackName: operation.rackName || '',
    shelfName: operation.shelfName || '',
    movementComment: operation.comment || '',
  };
}
