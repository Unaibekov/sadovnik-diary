// Единые правила выбора последних событий: updatedAt > createdAt > date.
export function getOperationTimestampValue(operation) {
  const timestamp = new Date(operation?.updatedAt || operation?.createdAt || operation?.date || 0).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function compareOperationsByLatest(first, second) {
  return getOperationTimestampValue(second) - getOperationTimestampValue(first);
}

export function sortOperationsByLatest(operations = []) {
  return [...operations].sort(compareOperationsByLatest);
}

export function getLatestOperation(operations = [], types = [], predicate = null) {
  const normalizedTypes = Array.isArray(types) ? types : [types];

  return sortOperationsByLatest(operations).find((operation) => (
    normalizedTypes.includes(operation.type) &&
    (!predicate || predicate(operation))
  )) || null;
}

export function getLatestOperationValue(operations = [], types = [], field) {
  return getLatestOperation(operations, types, (operation) => Boolean(operation[field]))?.[field] || '';
}
