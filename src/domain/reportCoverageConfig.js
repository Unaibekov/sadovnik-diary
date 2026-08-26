import { stages } from './constants';
import { getSupportedIntroActionTypes, getSupportedStatusOperationTypes } from './statusOperations';

export const adaptationCareOptions = ['Полив', 'Подкормка', 'Стимуляция', 'Профилактика', 'Лечение'];
export const greenhouseCareOptions = ['Полив', 'Подкормка', 'Стимуляция', 'Профилактика', 'Лечение'];
export const hardeningCareOptions = ['Полив', 'Подкормка', 'Стимуляция', 'Профилактика', 'Лечение'];
export const plantingCareOptions = ['Полив', 'Подкормка', 'Стимуляция', 'Профилактика', 'Лечение'];
export const introProblemTypeOptions = ['Контаминация', 'Карантин', 'Болезнь', 'Вредители', 'Другое'];
export const genericProblemTypeOptions = ['Контаминация', 'Карантин', 'Болезнь', 'Вредители', 'Другое'];
export const hardeningProblemTypeOptions = ['Ожоги', 'Увядание', 'Болезнь', 'Вредители', 'Карантин', 'Другое'];
export const plantingProblemTypeOptions = ['Увядание', 'Ожоги', 'Болезнь', 'Вредители', 'Погодный стресс', 'Карантин', 'Другое'];
export const riskLevelOptions = ['Низкий', 'Средний', 'Высокий', 'Критический'];
export const turgorOptions = ['Нормальный', 'Снижен', 'Критически снижен'];
export const readinessOptions = ['Не готова', 'Частично готова', 'Готова'];
export const survivalRateOptions = ['Низкая', 'Средняя', 'Хорошая', 'Отличная'];
export const completionResultOptions = ['Прижилась', 'Частично прижилась', 'Не прижилась', 'Завершена вручную'];

export const reportSystemOperationTypes = [
  'batchCreated',
  'qrGenerated',
  'stageChange',
  'clonedFromParent',
  'isolatedFromParent',
];

export function getProblemTypeOptions(stage) {
  if (stage === stages[4]) {
    return hardeningProblemTypeOptions;
  }

  if (stage === stages[5]) {
    return plantingProblemTypeOptions;
  }

  return genericProblemTypeOptions;
}

export function getCareTypeOptions(operationType) {
  if (operationType === 'adaptationCare') {
    return adaptationCareOptions;
  }

  if (operationType === 'greenhouseCare') {
    return greenhouseCareOptions;
  }

  if (operationType === 'hardeningCare') {
    return hardeningCareOptions;
  }

  if (operationType === 'plantingCare') {
    return plantingCareOptions;
  }

  return [];
}

export function getSupportedUserReportOperationTypes() {
  return [...new Set([
    ...getSupportedIntroActionTypes(),
    ...getSupportedStatusOperationTypes(),
  ])];
}

export function getSupportedReportOperationTypes() {
  return [...new Set([
    ...reportSystemOperationTypes,
    ...getSupportedUserReportOperationTypes(),
  ])];
}

export const requiredReportEnumCoverage = {
  completionResult: completionResultOptions,
  hardeningCareType: hardeningCareOptions,
  hardeningProblemType: hardeningProblemTypeOptions,
  introProblemType: introProblemTypeOptions,
  plantingCareType: plantingCareOptions,
  plantingProblemType: plantingProblemTypeOptions,
  readinessForPlanting: readinessOptions,
  riskLevel: riskLevelOptions,
  survivalRate: survivalRateOptions,
  turgor: turgorOptions,
};
