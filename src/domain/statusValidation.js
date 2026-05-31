import { isPositiveInteger } from './batch';

export function getStatusBaseValidationError({
  eventConfig,
  count,
  introActionType,
  currentQuantity,
  reason,
  canReleaseQuarantine,
  isEditingOperation,
  batchStatus,
}) {
  if (eventConfig.countField && !isPositiveInteger(count)) {
    return 'invalid_count';
  }

  if (
    ['rooting', 'death', 'discard', 'sale'].includes(introActionType) &&
    Number(count) > currentQuantity
  ) {
    return 'count_gt_current';
  }

  if (eventConfig.requiresReason && !reason.trim()) {
    return 'missing_reason';
  }

  if (introActionType === 'quarantineReleased') {
    if (!canReleaseQuarantine) {
      return 'release_forbidden';
    }

    if (!isEditingOperation && (batchStatus || 'active') !== 'quarantine') {
      return 'not_in_quarantine';
    }
  }

  return '';
}
