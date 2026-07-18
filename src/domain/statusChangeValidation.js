// Валидация изменения статуса с учетом даты и типа события.
import { getTodayIsoDate } from './dates';
import { getStatusEventConfig } from './statusOperations';
import { getStatusBaseValidationError } from './statusValidation';
import { getAdaptationValidationError, getHardeningValidationError, getPlantingValidationError } from './statusStageValidation';
import { getGreenhouseValidationError } from './statusGreenhouseValidation';
import { getProblemRecoveryValidationError, getProblemValidationError } from './statusProblemValidation';
import { getCardActiveProblemQuantity, getCardHealthyQuantity } from './batch';

export const STATUS_DATE_NOT_TODAY_MESSAGE = 'Производственные события можно фиксировать только на текущую дату';

export function getStatusChangeValidationError({
  editingOperationId,
  introActionType,
  selectedCard,
  validationCard,
  currentQuantity,
  statusForm,
  selectedCalendarDate,
}) {
  if (!selectedCard || !selectedCalendarDate) {
    return '';
  }

  if (!editingOperationId && selectedCalendarDate !== getTodayIsoDate()) {
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
    healthyQuantity: getCardHealthyQuantity(validationCard || selectedCard),
    reason: statusForm.reason,
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
    {
      availableHealthyQuantity: getCardHealthyQuantity(validationCard || selectedCard),
    },
  );

  if (problemValidationError) {
    return problemValidationError;
  }

  const recoveryValidationError = getProblemRecoveryValidationError(
    introActionType,
    statusForm,
    {
      activeProblemQuantity: getCardActiveProblemQuantity(validationCard || selectedCard),
    },
  );

  if (recoveryValidationError) {
    return recoveryValidationError;
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
    case 'count_gt_healthy':
      return 'Количество не может превышать здоровый остаток партии';
    case 'missing_reason':
      return 'Укажите причину';
    case 'adaptation_stress_missing':
      return 'Укажите хотя бы один параметр наблюдения';
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
    case 'problem_missing':
      return 'Укажите хотя бы один параметр проблемы';
    case 'problem_quantity_missing':
      return 'Укажите количество растений с проблемой';
    case 'problem_quantity_not_positive':
      return 'Количество должно быть больше нуля';
    case 'problem_quantity_not_integer':
      return 'Укажите целое количество растений с проблемой';
    case 'problem_quantity_gt_healthy':
      return 'Количество не может превышать здоровый остаток партии';
    case 'problem_all_plants_affected':
      return 'Все растения партии уже относятся к активным проблемам';
    case 'recovery_no_active_problem':
      return 'В партии нет активных больных растений';
    case 'recovery_quantity_missing':
      return 'Укажите количество выздоровевших растений';
    case 'recovery_quantity_not_positive':
      return 'Количество выздоровевших должно быть больше нуля';
    case 'recovery_quantity_not_integer':
      return 'Укажите целое количество выздоровевших растений';
    case 'recovery_quantity_gt_problem':
      return 'Количество выздоровевших не может превышать активное количество больных';
    default:
      return '';
  }
}
