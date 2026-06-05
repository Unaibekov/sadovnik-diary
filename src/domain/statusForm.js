export function getStatusFormComment(operation) {
  if (operation?.type !== 'adaptationStress') {
    return operation?.comment || '';
  }

  return [
    operation.comment,
    operation.conditionDescription ? `Состояние: ${operation.conditionDescription}` : '',
    operation.reason ? `Причина: ${operation.reason}` : '',
    operation.turgor ? `Тургор: ${operation.turgor}` : '',
  ].filter(Boolean).join('\n');
}
