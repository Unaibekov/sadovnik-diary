import { isPositiveInteger } from './batch';

export function validateCultureCardInput({
  createdAt,
  cultureName,
  speciesName,
  varietyName,
  code,
  quantity,
  sourceMaterial,
  isCultureIntroStage,
  isDuplicateCode,
}) {
  if (
    !createdAt ||
    !cultureName ||
    !speciesName ||
    !varietyName ||
    !code ||
    !quantity ||
    (isCultureIntroStage && !sourceMaterial)
  ) {
    return 'missing_fields';
  }

  if (!isPositiveInteger(quantity)) {
    return 'invalid_quantity';
  }

  if (isDuplicateCode) {
    return 'duplicate_code';
  }

  return '';
}
