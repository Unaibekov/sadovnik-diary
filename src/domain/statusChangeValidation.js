// Валидация изменения статуса с учетом даты и типа события.
import { getTodayIsoDate } from './dates';
import { getStatusEventConfig } from './statusOperations';
import { getStatusBaseValidationError } from './statusValidation';
import { getAdaptationValidationError, getHardeningValidationError, getPlantingValidationError } from './statusStageValidation';
import { getGreenhouseValidationError } from './statusGreenhouseValidation';
import { getProblemValidationError } from './statusProblemValidation';

export const STATUS_DATE_NOT_TODAY_MESSAGE = 'Производственные события можно фиксировать только на текущую дату';

export function getStatusChangeValidationError({
  editingOperationId,
  introActionType,
  selectedCard,
  currentQuantity,
  statusForm,
  canReleaseQuarantine,
  selectedCalendarDate,
}) {
  if (!selectedCard || !selectedCalendarDate) {
    return '';
  }

  if (selectedCalendarDate !== getTodayIsoDate()) {
    return 'date_not_today';
  }

  const eventConfig = getStatusEventConfig(introActionType);
  const count = eventConfig.countField
    ? statusForm[eventConfig.countField].trim()
    : '';

  const baseValidationError = getStatusBaseValidationError({
    eventConfig,
    count,
    introActionType,
    currentQuantity,
    reason: statusForm.reason,
    canReleaseQuarantine,
    isEditingOperation: Boolean(editingOperationId),
    batchStatus: selectedCard.batchStatus,
  });

  if (baseValidationError) {
    return baseValidationError;
  }

  const adaptationValidationError = getAdaptationValidationError(
    introActionType,
    statusForm,
  );

  if (adaptationValidationError) {
    return adaptationValidationError;
  }

  const hardeningValidationError = getHardeningValidationError(
    introActionType,
    statusForm,
  );

  if (hardeningValidationError) {
    return hardeningValidationError;
  }

  const plantingValidationError = getPlantingValidationError(
    introActionType,
    statusForm,
  );

  if (plantingValidationError) {
    return plantingValidationError;
  }

  const greenhouseValidationError = getGreenhouseValidationError(
    introActionType,
    statusForm,
  );

  if (greenhouseValidationError) {
    return greenhouseValidationError;
  }

  const problemValidationError = getProblemValidationError(
    introActionType,
    statusForm,
  );

  if (problemValidationError) {
    return problemValidationError;
  }

  return '';
}

export function getStatusChangeValidationMessage(validationError) {
  switch (validationError) {
    case 'date_not_today':
      return STATUS_DATE_NOT_TODAY_MESSAGE;
    case 'invalid_count':
      return 'Укажите корректное количество';
    case 'count_gt_current':
      return 'Количество не может быть больше текущего остатка';
    case 'missing_reason':
      return 'Укажите причину';
    case 'release_forbidden':
      return 'Снять карантин может только агроном или администратор';
    case 'not_in_quarantine':
      return 'Партия не находится в карантине';
    case 'adaptation_stress_missing':
      return 'Укажите хотя бы один параметр наблюдения';
    case 'adaptation_environment_missing':
      return 'Укажите хотя бы один параметр среды';
    case 'adaptation_humidity_reduction_missing':
      return 'Укажите снижение влажности или состояние партии';
    case 'adaptation_care_type_missing':
      return 'Укажите тип ухода';
    case 'hardening_observation_missing':
      return 'Укажите хотя бы один параметр наблюдения';
    case 'hardening_care_type_missing':
      return 'Укажите тип ухода';
    case 'planting_missing':
      return 'Укажите хотя бы один параметр высадки';
    case 'planting_observation_missing':
      return 'Укажите хотя бы один параметр наблюдения';
    case 'planting_care_type_missing':
      return 'Укажите тип ухода';
    case 'planting_completion_missing':
      return 'Укажите итог высадки';
    case 'greenhouse_observation_missing':
      return 'Укажите хотя бы один параметр наблюдения';
    case 'greenhouse_care_type_missing':
      return 'Укажите тип ухода';
    case 'greenhouse_environment_missing':
      return 'Укажите хотя бы один параметр среды';
    case 'greenhouse_disease_missing':
      return 'Укажите болезнь, вредителя или уровень риска';
    case 'problem_missing':
      return 'Укажите хотя бы один параметр проблемы';
    default:
      return '';
  }
}
