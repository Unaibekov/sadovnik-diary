// Построение операции изменения статуса.
import { getCardActiveProblemQuantity } from './batch';
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
  const hasLegacyAdaptationStabilityValue = `${editedOperation?.stability || statusForm.stability || ''}`.trim();
  const hasLegacyAdaptationEnvironmentValues = [
    'environmentTemperature',
    'environmentAirHumidity',
    'environmentHumidity',
    'substrateHumidity',
    'environmentLight',
    'ventilation',
  ].some((field) => `${editedOperation?.[field] || statusForm[field] || ''}`.trim());

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
    ...(introActionType === 'introLoss'
      ? {
        previousQuantity: editedOperation?.previousQuantity ?? currentQuantity,
        currentQuantity: Math.max(
          (Number(editedOperation?.previousQuantity ?? currentQuantity) || 0) - (Number(count) || 0),
          0,
        ),
      }
      : {}),
    ...(introActionType === 'propagation'
      ? { currentQuantity }
      : {}),
    comment: introActionType === 'introLoss'
      ? ''
      : introActionType === 'movement'
        ? statusForm.movementComment.trim()
        : statusForm.comment.trim(),
    ...(normalizedPhotoUris[0] ? { photoUri: normalizedPhotoUris[0] } : {}),
    ...(normalizedPhotoUris.length ? { photoUris: normalizedPhotoUris } : {}),
    ...(['death', 'discard'].includes(introActionType)
      ? { reason: statusForm.reason.trim() }
      : {}),
    ...(introActionType === 'introLoss'
      ? { reason: statusForm.reason.trim(), lossReason: statusForm.reason.trim() }
      : {}),
    ...(introActionType === 'quarantine'
      ? { quarantineReason: statusForm.reason.trim() }
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
        turgor: statusForm.turgor.trim(),
        ...(hasLegacyAdaptationStabilityValue
          ? { stability: editedOperation?.stability?.trim() || statusForm.stability.trim() }
          : {}),
        ...(hasLegacyAdaptationEnvironmentValues
          ? {
            environmentTemperature: editedOperation?.environmentTemperature?.trim() || statusForm.environmentTemperature.trim(),
            environmentAirHumidity: editedOperation?.environmentAirHumidity?.trim() || statusForm.environmentAirHumidity.trim() || statusForm.environmentHumidity.trim(),
            environmentHumidity: editedOperation?.environmentHumidity?.trim() || statusForm.environmentHumidity.trim(),
            substrateHumidity: editedOperation?.substrateHumidity?.trim() || statusForm.substrateHumidity.trim(),
            environmentLight: editedOperation?.environmentLight?.trim() || statusForm.environmentLight.trim(),
            ventilation: editedOperation?.ventilation?.trim() || statusForm.ventilation.trim(),
          }
          : {}),
      }
      : {}),
    ...(introActionType === 'adaptationCare'
      ? { careType: statusForm.careType.trim() }
      : {}),
    ...(introActionType === 'hardeningObservation'
      ? {
        stressLevel: statusForm.stressLevel.trim(),
        turgor: statusForm.turgor.trim(),
        readinessForPlanting: statusForm.readinessForPlanting.trim(),
      }
      : {}),
    ...(introActionType === 'hardeningCare'
      ? {
        careType: statusForm.careType.trim(),
        productName: statusForm.productName.trim(),
        dosage: statusForm.dosage.trim(),
        applicationMethod: statusForm.applicationMethod.trim(),
        plantReaction: statusForm.plantReaction.trim(),
      }
      : {}),
    ...(introActionType === 'planting'
      ? {
        plantingLocation: statusForm.plantingLocation.trim(),
        plantingScheme: statusForm.plantingScheme.trim(),
        plotArea: statusForm.plotArea.trim(),
        soilType: statusForm.soilType.trim(),
      }
      : {}),
    ...(introActionType === 'plantingObservation'
      ? {
        survivalRate: statusForm.survivalRate.trim(),
        stressLevel: statusForm.stressLevel.trim(),
        turgor: statusForm.turgor.trim(),
      }
      : {}),
    ...(introActionType === 'plantingCare'
      ? {
        careType: statusForm.careType.trim(),
        productName: statusForm.productName.trim(),
        dosage: statusForm.dosage.trim(),
        applicationMethod: statusForm.applicationMethod.trim(),
        plantReaction: statusForm.plantReaction.trim(),
      }
      : {}),
    ...(introActionType === 'plantingCompletion'
      ? {
        completionResult: statusForm.completionResult.trim(),
      }
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
    ...(introActionType === 'problem'
      ? {
        problemType: statusForm.problemType.trim(),
        riskLevel: statusForm.riskLevel.trim(),
        affectedQuantity: Number(statusForm.affectedQuantity) || 0,
        currentQuantity,
        problemDescription: statusForm.problemDescription.trim(),
        comment: statusForm.comment.trim(),
      }
      : {}),
    ...(introActionType === 'problemRecovery'
      ? {
        recoveredQuantity: Number(statusForm.recoveredQuantity) || 0,
        activeProblemQuantityBefore: getCardActiveProblemQuantity(selectedCard),
        currentQuantity,
        riskLevel: statusForm.riskLevel.trim(),
      }
      : {}),
    ...(introActionType === 'problemIsolation'
      ? {
        count: Number(statusForm.isolationQuantity) || 0,
        quantity: Number(statusForm.isolationQuantity) || 0,
        currentQuantity: Math.max(currentQuantity - (Number(statusForm.isolationQuantity) || 0), 0),
        sourceProblemEventId: statusForm.sourceProblemEventId || '',
        location: statusForm.isolationLocation.trim(),
        nextLocation: statusForm.isolationLocation.trim(),
        comment: statusForm.isolationComment.trim() || statusForm.comment.trim(),
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
