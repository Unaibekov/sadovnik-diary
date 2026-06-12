// Построение операции для стартового действия.
import { INTRO_STAGE } from './constants';

export function buildIntroActionOperation({
  actionConfig,
  editingOperationId,
  editedOperation,
  nowIso,
  selectedCalendarDate,
  selectedStage,
  userId,
  photoUri,
  photoUris,
  value,
  lossCount,
  lossReason,
  movementDetails,
  problemType,
  riskLevel,
  problemDescription,
  comment,
  photoNote,
  currentQuantity,
}) {
  const normalizedPhotoUris = Array.isArray(photoUris) && photoUris.length > 0
    ? photoUris.filter(Boolean)
    : photoUri
      ? [photoUri]
      : [];

  const buildMovementLocation = () => {
    const parts = [];
    const greenhouseName = movementDetails?.greenhouseName || '';
    const rackName = movementDetails?.rackName || '';
    const shelfName = movementDetails?.shelfName || '';

    if (greenhouseName) {
      parts.push(`Теплица ${greenhouseName}`);
    }

    if (rackName) {
      parts.push(`Стеллаж ${rackName}`);
    }

    if (shelfName) {
      parts.push(`Полка ${shelfName}`);
    }

    return parts.join(' · ');
  };

  if (actionConfig.type === 'problem') {
    return {
      id: editingOperationId || `${actionConfig.type}-${Date.now()}`,
      type: actionConfig.type,
      title: actionConfig.title,
      stage: selectedStage || INTRO_STAGE,
      date: selectedCalendarDate,
      problemType: problemType || '',
      riskLevel: riskLevel || '',
      problemDescription: problemDescription || '',
      comment: comment || '',
      photoNote: photoNote || '',
      ...(normalizedPhotoUris[0] ? { photoUri: normalizedPhotoUris[0] } : {}),
      ...(normalizedPhotoUris.length ? { photoUris: normalizedPhotoUris } : {}),
      createdAt: editedOperation?.createdAt || nowIso,
      createdBy: editedOperation?.createdBy || userId,
      ...(editingOperationId ? { updatedAt: nowIso, updatedBy: userId } : {}),
    };
  }

  return {
    id: editingOperationId || `${actionConfig.type}-${Date.now()}`,
    type: actionConfig.type,
    title: actionConfig.title,
    stage: actionConfig.type === 'introLoss' ? INTRO_STAGE : selectedStage,
    date: selectedCalendarDate,
    ...(actionConfig.type === 'introLoss'
      ? {
        count: lossCount,
        reason: lossReason,
        lossReason,
        previousQuantity: editedOperation?.previousQuantity ?? currentQuantity,
        currentQuantity: Math.max(
          (Number(editedOperation?.previousQuantity ?? currentQuantity) || 0) - (Number(lossCount) || 0),
          0,
        ),
      }
      : {}),
    ...(actionConfig.type === 'movement'
      ? {
        comment: value,
        previousLocation: editedOperation?.previousLocation || '',
        nextLocation: buildMovementLocation(),
        greenhouseName: movementDetails?.greenhouseName || '',
        rackName: movementDetails?.rackName || '',
        shelfName: movementDetails?.shelfName || '',
      }
      : { [actionConfig.field]: value }),
    ...(normalizedPhotoUris[0] ? { photoUri: normalizedPhotoUris[0] } : {}),
    ...(normalizedPhotoUris.length ? { photoUris: normalizedPhotoUris } : {}),
    createdAt: editedOperation?.createdAt || nowIso,
    createdBy: editedOperation?.createdBy || userId,
    ...(editingOperationId ? { updatedAt: nowIso, updatedBy: userId } : {}),
  };
}
