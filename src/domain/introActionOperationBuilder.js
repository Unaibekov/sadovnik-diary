export function buildIntroActionOperation({
  actionConfig,
  editingOperationId,
  editedOperation,
  nowIso,
  selectedCalendarDate,
  selectedStage,
  userId,
  value,
}) {
  return {
    id: editingOperationId || `${actionConfig.type}-${Date.now()}`,
    type: actionConfig.type,
    title: actionConfig.title,
    stage: selectedStage,
    date: selectedCalendarDate,
    [actionConfig.field]: value,
    createdAt: editedOperation?.createdAt || nowIso,
    createdBy: editedOperation?.createdBy || userId,
    ...(editingOperationId ? { updatedAt: nowIso, updatedBy: userId } : {}),
  };
}
