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
  affectedQuantity,
  recoveredQuantity,
  isolationQuantity,
  sourceProblemEventId,
  isolationLocation,
  isolationComment,
  problemDescription,
  comment,
  currentQuantity,
  activeProblemQuantityBefore,
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
      affectedQuantity: Number(affectedQuantity) || 0,
      currentQuantity: Number(currentQuantity) || 0,
      problemDescription: problemDescription || '',
      comment: comment || '',
      ...(normalizedPhotoUris[0] ? { photoUri: normalizedPhotoUris[0] } : {}),
      ...(normalizedPhotoUris.length ? { photoUris: normalizedPhotoUris } : {}),
      createdAt: editedOperation?.createdAt || nowIso,
      createdBy: editedOperation?.createdBy || userId,
      ...(editingOperationId ? { updatedAt: nowIso, updatedBy: userId } : {}),
    };
  }

  if (actionConfig.type === 'problemRecovery') {
    return {
      id: editingOperationId || `${actionConfig.type}-${Date.now()}`,
      type: actionConfig.type,
      title: actionConfig.title,
      stage: selectedStage || INTRO_STAGE,
      date: selectedCalendarDate,
      recoveredQuantity: Number(recoveredQuantity) || 0,
      activeProblemQuantityBefore: Number(activeProblemQuantityBefore) || 0,
      currentQuantity: Number(currentQuantity) || 0,
      riskLevel: riskLevel || '',
      comment: comment || '',
      ...(normalizedPhotoUris[0] ? { photoUri: normalizedPhotoUris[0] } : {}),
      ...(normalizedPhotoUris.length ? { photoUris: normalizedPhotoUris } : {}),
      createdAt: editedOperation?.createdAt || nowIso,
      createdBy: editedOperation?.createdBy || userId,
      ...(editingOperationId ? { updatedAt: nowIso, updatedBy: userId } : {}),
    };
  }

  if (actionConfig.type === 'problemIsolation') {
    return {
      id: editingOperationId || `${actionConfig.type}-${Date.now()}`,
      type: actionConfig.type,
      title: actionConfig.title,
      stage: selectedStage || INTRO_STAGE,
      date: selectedCalendarDate,
      count: Number(isolationQuantity) || 0,
      quantity: Number(isolationQuantity) || 0,
      currentQuantity: Math.max((Number(currentQuantity) || 0) - (Number(isolationQuantity) || 0), 0),
      sourceProblemEventId: sourceProblemEventId || '',
      location: isolationLocation || '',
      nextLocation: isolationLocation || '',
      comment: isolationComment || comment || '',
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
