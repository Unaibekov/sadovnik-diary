// Валидация изменения статуса с учетом даты и типа события.
import { getTodayIsoDate } from './dates';
import { getStatusEventConfig } from './statusOperations';
import { getStatusBaseValidationError } from './statusValidation';
import { getAdaptationValidationError, getHardeningValidationError, getPlantingValidationError } from './statusStageValidation';
import { getGreenhouseValidationError } from './statusGreenhouseValidation';
import {
  getProblemIsolationValidationError,
  getProblemRecoveryValidationError,
  getProblemValidationError,
} from './statusProblemValidation';
import {
  getCardActiveProblemQuantity,
  getCardHealthyQuantity,
  getCardUnisolatedProblemQuantity,
} from './batch';

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
  const activeCard = validationCard || selectedCard;

  const baseValidationError = getStatusBaseValidationError({
    eventConfig,
    count,
    introActionType,
    currentQuantity,
    healthyQuantity: getCardHealthyQuantity(activeCard),
    reason: statusForm.reason,
  });

  if (baseValidationError) {
    return baseValidationError;
  }

  const adaptationValidationError = getAdaptationValidationError(introActionType, statusForm);

  if (adaptationValidationError) {
    return adaptationValidationError;
  }

  const hardeningValidationError = getHardeningValidationError(introActionType, statusForm);

  if (hardeningValidationError) {
    return hardeningValidationError;
  }

  const plantingValidationError = getPlantingValidationError(introActionType, statusForm);

  if (plantingValidationError) {
    return plantingValidationError;
  }

  const greenhouseValidationError = getGreenhouseValidationError(introActionType, statusForm);

  if (greenhouseValidationError) {
    return greenhouseValidationError;
  }

  const problemValidationError = getProblemValidationError(introActionType, statusForm, {
    availableHealthyQuantity: getCardHealthyQuantity(activeCard),
  });

  if (problemValidationError) {
    return problemValidationError;
  }

  const recoveryValidationError = getProblemRecoveryValidationError(introActionType, statusForm, {
    activeProblemQuantity: getCardActiveProblemQuantity(activeCard),
  });

  if (recoveryValidationError) {
    return recoveryValidationError;
  }

  const isolationValidationError = getProblemIsolationValidationError(introActionType, statusForm, {
    currentQuantity,
    unisolatedProblemQuantity: getCardUnisolatedProblemQuantity(activeCard),
  });

  if (isolationValidationError) {
    return isolationValidationError;
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
    case 'hardening_observation_missing':
    case 'planting_observation_missing':
    case 'greenhouse_observation_missing':
      return 'Укажите хотя бы один параметр наблюдения';
    case 'adaptation_care_type_missing':
    case 'hardening_care_type_missing':
    case 'planting_care_type_missing':
    case 'greenhouse_care_type_missing':
      return 'Укажите тип ухода';
    case 'planting_missing':
      return 'Укажите хотя бы один параметр высадки';
    case 'planting_completion_missing':
      return 'Укажите итог высадки';
    case 'problem_missing':
      return 'Укажите тип, риск и описание проблемы';
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
    case 'isolation_no_remaining_problem':
      return 'В партии нет проблемных растений для изоляции';
    case 'isolation_quantity_missing':
      return 'Укажите количество растений для изоляции';
    case 'isolation_quantity_not_positive':
      return 'Количество для изоляции должно быть больше нуля';
    case 'isolation_quantity_not_integer':
      return 'Укажите целое количество растений для изоляции';
    case 'isolation_quantity_gt_current':
      return 'Количество для изоляции не может превышать текущий остаток партии';
    case 'isolation_quantity_gt_remaining_problem':
      return 'Нельзя изолировать больше неизолированного проблемного остатка';
    case 'isolation_location_missing':
      return 'Укажите новое местоположение изолированной партии';
    default:
      return '';
  }
}
