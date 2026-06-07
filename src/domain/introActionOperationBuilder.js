// Построение операции для стартового действия.
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
}) {
  const normalizedPhotoUris = Array.isArray(photoUris) && photoUris.length > 0
    ? photoUris.filter(Boolean)
    : photoUri
      ? [photoUri]
      : [];

  return {
    id: editingOperationId || `${actionConfig.type}-${Date.now()}`,
    type: actionConfig.type,
    title: actionConfig.title,
    stage: selectedStage,
    date: selectedCalendarDate,
    [actionConfig.field]: value,
    ...(normalizedPhotoUris[0] ? { photoUri: normalizedPhotoUris[0] } : {}),
    ...(normalizedPhotoUris.length ? { photoUris: normalizedPhotoUris } : {}),
    createdAt: editedOperation?.createdAt || nowIso,
    createdBy: editedOperation?.createdBy || userId,
    ...(editingOperationId ? { updatedAt: nowIso, updatedBy: userId } : {}),
  };
}
