// Общая валидация полей для операций со статусом.
import { isPositiveInteger } from './batch';

export function getStatusBaseValidationError({
  eventConfig,
  count,
  introActionType,
  currentQuantity,
  healthyQuantity,
  reason,
}) {
  if (eventConfig.countField && !isPositiveInteger(count)) {
    return 'invalid_count';
  }

  if (
    ['rooting', 'death', 'discard', 'sale', 'introLoss'].includes(introActionType) &&
    Number(count) > currentQuantity
  ) {
    return 'count_gt_current';
  }

  if (
    introActionType === 'sale' &&
    Number.isFinite(Number(healthyQuantity)) &&
    Number(count) > Number(healthyQuantity)
  ) {
    return 'count_gt_healthy';
  }

  if (eventConfig.requiresReason && !reason.trim()) {
    return 'missing_reason';
  }

  return '';
}
