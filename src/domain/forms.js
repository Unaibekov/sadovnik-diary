// Фабрики пустых форм домена.
import { getTodayIsoDate } from './dates';

export function createEmptyCultureForm() {
  return {
    createdAt: getTodayIsoDate(),
    cultureName: '',
    speciesName: '',
    varietyName: '',
    code: '',
    quantity: '',
    hasHormone: false,
    sourcePlantName: '',
    sourceMaterial: '',
    parentBatch: '',
    sterilityStatus: 'unchecked',
    startPhotoNote: '',
    batchStatus: '',
    qrStatus: 'none',
  };
}

export function createEmptyStatusForm() {
  return {
    rootedCount: '',
    transplantCount: '',
    propagationCount: '',
    saleCount: '',
    deathCount: '',
    discardCount: '',
    reason: '',
    comment: '',
    photoNote: '',
    saleType: '',
    recipient: '',
    saleAmount: '',
    propagationMethod: '',
    stressLevel: '',
    conditionDescription: '',
    environmentTemperature: '',
    environmentHumidity: '',
    environmentAirHumidity: '',
    substrateHumidity: '',
    environmentLight: '',
    ventilation: '',
    humidityReduction: '',
    turgor: '',
    stability: '',
    careType: '',
    growthRate: '',
    riskLevel: '',
    careIntervalDays: '',
    wateringIntervalDays: '',
    diseaseName: '',
    pestName: '',
    diseaseSeverity: '',
    waterVolume: '',
    applicationMethod: '',
    productName: '',
    dosage: '',
    plantReaction: '',
    placement: '',
    densityChange: '',
  };
}

export function createEmptyIntroActionForm() {
  return {
    comment: '',
    photoNote: '',
    contaminationNote: '',
    quarantineReason: '',
    deathCount: '',
    deathReason: '',
  };
}
