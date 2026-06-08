// Построение операции изменения статуса.
export function buildStatusOperation({
  editingOperationId,
  introActionType,
  eventConfig,
  selectedCard,
  introStage,
  selectedCalendarDate,
  count,
  currentQuantity,
  statusForm,
  editedOperation,
  userId,
  nowIso,
  photoUri,
  photoUris,
}) {
  const buildMovementLocation = () => {
    const parts = [];
    const greenhouseName = statusForm.greenhouseName.trim();
    const rackName = statusForm.rackName.trim();
    const shelfName = statusForm.shelfName.trim();

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

  const normalizedPhotoUris = Array.isArray(photoUris) && photoUris.length > 0
    ? photoUris.filter(Boolean)
    : photoUri
      ? [photoUri]
      : [];

  return {
    id: editingOperationId || `${Date.now()}`,
    type: introActionType || 'rooting',
    title: eventConfig.title,
    stage: selectedCard.stage || introStage,
    date: selectedCalendarDate,
    ...(count ? { count } : {}),
    totalQuantity: selectedCard.quantity,
    ...(['death', 'discard', 'sale'].includes(introActionType)
      ? { currentQuantity: Math.max(currentQuantity - Number(count), 0) }
      : {}),
    ...(introActionType === 'propagation'
      ? { currentQuantity: currentQuantity + Number(count) }
      : {}),
    comment: introActionType === 'movement'
      ? statusForm.movementComment.trim()
      : statusForm.comment.trim(),
    photoNote: statusForm.photoNote.trim(),
    ...(normalizedPhotoUris[0] ? { photoUri: normalizedPhotoUris[0] } : {}),
    ...(normalizedPhotoUris.length ? { photoUris: normalizedPhotoUris } : {}),
    ...(['death', 'discard'].includes(introActionType)
      ? { reason: statusForm.reason.trim() }
      : {}),
    ...(introActionType === 'quarantine'
      ? { quarantineReason: statusForm.reason.trim() }
      : {}),
    ...(introActionType === 'quarantineReleased'
      ? { reason: statusForm.reason.trim() }
      : {}),
    ...(introActionType === 'sale'
      ? {
        saleType: statusForm.saleType.trim(),
        recipient: statusForm.recipient.trim(),
        saleAmount: statusForm.saleAmount.trim(),
      }
      : {}),
    ...(introActionType === 'propagation'
      ? { propagationMethod: statusForm.propagationMethod.trim() }
      : {}),
    ...(introActionType === 'adaptationStress'
      ? {
        stressLevel: statusForm.stressLevel.trim(),
        stability: statusForm.stability.trim(),
      }
      : {}),
    ...(introActionType === 'adaptationEnvironment'
      ? {
        environmentTemperature: statusForm.environmentTemperature.trim(),
        environmentAirHumidity: statusForm.environmentAirHumidity.trim() || statusForm.environmentHumidity.trim(),
        substrateHumidity: statusForm.substrateHumidity.trim(),
        environmentLight: statusForm.environmentLight.trim(),
        ventilation: statusForm.ventilation.trim(),
        humidityReduction: statusForm.humidityReduction.trim(),
        turgor: statusForm.turgor.trim(),
        stability: statusForm.stability.trim(),
      }
      : {}),
    ...(introActionType === 'adaptationHumidityReduction'
      ? {
        environmentAirHumidity: statusForm.environmentAirHumidity.trim() || statusForm.environmentHumidity.trim(),
        substrateHumidity: statusForm.substrateHumidity.trim(),
        humidityReduction: statusForm.humidityReduction.trim(),
        turgor: statusForm.turgor.trim(),
        stability: statusForm.stability.trim(),
      }
      : {}),
    ...(introActionType === 'adaptationCare'
      ? { careType: statusForm.careType.trim() }
      : {}),
    ...(introActionType === 'greenhouseObservation'
      ? {
        growthRate: statusForm.growthRate.trim(),
        stressLevel: statusForm.stressLevel.trim(),
        stability: statusForm.stability.trim(),
        riskLevel: statusForm.riskLevel.trim(),
        conditionDescription: statusForm.conditionDescription.trim(),
      }
      : {}),
    ...(introActionType === 'greenhouseCare'
      ? {
        careType: statusForm.careType.trim(),
        careIntervalDays: statusForm.careIntervalDays.trim(),
        wateringIntervalDays: statusForm.wateringIntervalDays.trim(),
        waterVolume: statusForm.waterVolume.trim(),
        productName: statusForm.productName.trim(),
        dosage: statusForm.dosage.trim(),
        applicationMethod: statusForm.applicationMethod.trim(),
        plantReaction: statusForm.plantReaction.trim(),
        riskLevel: statusForm.riskLevel.trim(),
      }
      : {}),
    ...(introActionType === 'greenhouseEnvironment'
      ? {
        environmentTemperature: statusForm.environmentTemperature.trim(),
        environmentAirHumidity: statusForm.environmentAirHumidity.trim() || statusForm.environmentHumidity.trim(),
        environmentLight: statusForm.environmentLight.trim(),
        ventilation: statusForm.ventilation.trim(),
        placement: statusForm.placement.trim(),
        densityChange: statusForm.densityChange.trim(),
        growthRate: statusForm.growthRate.trim(),
        stability: statusForm.stability.trim(),
        riskLevel: statusForm.riskLevel.trim(),
      }
      : {}),
    ...(introActionType === 'greenhouseDisease'
      ? {
        diseaseName: statusForm.diseaseName.trim(),
        pestName: statusForm.pestName.trim(),
        diseaseSeverity: statusForm.diseaseSeverity.trim(),
        riskLevel: statusForm.riskLevel.trim(),
        productName: statusForm.productName.trim(),
        dosage: statusForm.dosage.trim(),
        applicationMethod: statusForm.applicationMethod.trim(),
        plantReaction: statusForm.plantReaction.trim(),
      }
      : {}),
    ...(introActionType === 'movement'
      ? {
        previousLocation: editedOperation?.previousLocation || selectedCard.locationDescription || '',
        nextLocation: buildMovementLocation(),
        greenhouseName: statusForm.greenhouseName.trim(),
        rackName: statusForm.rackName.trim(),
        shelfName: statusForm.shelfName.trim(),
      }
      : {}),
    ...(introActionType === 'transplant'
      ? {
        placement: statusForm.placement.trim(),
        densityChange: statusForm.densityChange.trim(),
        growthRate: statusForm.growthRate.trim(),
        stability: statusForm.stability.trim(),
      }
      : {}),
    createdAt: editedOperation?.createdAt || nowIso,
    createdBy: editedOperation?.createdBy || userId,
    ...(editingOperationId ? { updatedAt: nowIso, updatedBy: userId } : {}),
  };
}
