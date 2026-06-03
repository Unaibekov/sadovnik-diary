export function getStatusFormComment(operation) {
  if (operation?.type !== 'adaptationStress') {
    return operation?.comment || '';
  }

  return [
    operation.comment,
    operation.conditionDescription ? `РЎРѕСЃС‚РѕСЏРЅРёРµ: ${operation.conditionDescription}` : '',
    operation.reason ? `РџСЂРёС‡РёРЅР°: ${operation.reason}` : '',
    operation.turgor ? `РўСѓСЂРіРѕСЂ: ${operation.turgor}` : '',
  ].filter(Boolean).join('\n');
}
