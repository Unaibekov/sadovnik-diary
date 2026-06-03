import styles from '../../styles';
import { getCardCurrentQuantity } from './batch';
import { EMPTY_CATALOG_VALUE } from './constants';

export function getUniqueOptions(items, field) {
  return [...new Set(items.map((item) => item[field] || EMPTY_CATALOG_VALUE))]
    .sort((first, second) => first.localeCompare(second, 'ru'));
}

export function buildCultureFormOptions(plantsCatalog, cultureForm) {
  const cultureOptions = getUniqueOptions(plantsCatalog, 'cultureName');
  const speciesOptions = getUniqueOptions(
    plantsCatalog.filter((plant) => (
      (plant.cultureName || EMPTY_CATALOG_VALUE) === cultureForm.cultureName
    )),
    'speciesName',
  );
  const varietyOptions = getUniqueOptions(
    plantsCatalog.filter((plant) => (
      (plant.cultureName || EMPTY_CATALOG_VALUE) === cultureForm.cultureName &&
      (plant.speciesName || EMPTY_CATALOG_VALUE) === cultureForm.speciesName
    )),
    'varietyName',
  );

  return {
    cultureOptions,
    speciesOptions,
    varietyOptions,
  };
}

export function getPlantCardStatusDotStyle(batchStatus, sterilityStatus) {
  if (batchStatus === 'draft') {
    return styles.plantCardStatusDotDraft;
  }

  if (sterilityStatus === 'contaminated' || ['quarantine', 'problem'].includes(batchStatus)) {
    return styles.plantCardStatusDotProblem;
  }

  if (batchStatus === 'partial') {
    return styles.plantCardStatusDotPartial;
  }

  return styles.plantCardStatusDotActive;
}

export function hasSaleOperation(card) {
  return (card?.operations || []).some((operation) => (
    (operation.type === 'sale' && Number(operation.count) > 0) ||
    (operation.type === 'statusChange' && Number(operation.saleCount) > 0)
  ));
}

export function getResolvedBatchStatus(card) {
  const batchStatus = card?.batchStatus || 'active';
  const currentQuantity = getCardCurrentQuantity(card);
  const hasSale = hasSaleOperation(card);

  if (hasSale && currentQuantity === 0) {
    return 'sold';
  }

  if (['sold', 'partial'].includes(batchStatus)) {
    return hasSale ? 'partial' : 'active';
  }

  return batchStatus;
}
