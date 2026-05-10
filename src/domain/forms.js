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
    temperatureRequirement: '',
    lightRequirement: '',
    humidityRequirement: '',
    preventionItems: [],
    sourcePlantName: '',
    sourceMaterial: '',
    parentBatch: '',
    sterilityStatus: 'unchecked',
    startPhotoNote: '',
    batchStatus: 'active',
    qrStatus: 'none',
  };
}

export function createEmptyPreventionDraft() {
  return {
    name: '',
    applicationRate: '',
    frequency: '',
  };
}

export function createEmptyStatusForm() {
  return {
    rootedCount: '',
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
  };
}

export function createEmptyIntroActionForm() {
  return {
    comment: '',
    photoNote: '',
    contaminationNote: '',
    quarantineReason: '',
  };
}
