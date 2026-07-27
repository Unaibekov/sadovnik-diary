import { createBatchCreatedOperation, generatePlantingCode, getCardDisplayName } from './batch';
import { INTRO_STAGE, stages } from './constants';

function buildUniqueId(existingIds, prefix = 'card') {
  let index = 0;
  let id = `${prefix}-${Date.now()}`;

  while (existingIds.has(id)) {
    index += 1;
    id = `${prefix}-${Date.now()}-${index}`;
  }

  existingIds.add(id);
  return id;
}

function buildUniqueCode(existingCodes, createdAt, stage) {
  let index = 0;
  let code = generatePlantingCode(createdAt, stage);

  while (existingCodes.has(code.toLowerCase())) {
    index += 1;
    code = `${generatePlantingCode(createdAt, stage)}-${index}`;
  }

  existingCodes.add(code.toLowerCase());
  return code;
}

function getParentGeneration(parentCard) {
  return Number(parentCard?.generation) || 0;
}

function buildSourceProblemOperation(sourceProblemOperation, {
  childId,
  childCode,
  createdAt,
  date,
  quantity,
  stage,
  userId,
}) {
  return {
    id: `isolated-problem-${childId}`,
    type: 'problem',
    title: sourceProblemOperation?.title || 'Проблема',
    stage,
    date,
    problemType: sourceProblemOperation?.problemType || '',
    riskLevel: sourceProblemOperation?.riskLevel || '',
    affectedQuantity: Number(quantity) || 0,
    currentQuantity: Number(quantity) || 0,
    problemDescription: sourceProblemOperation?.problemDescription || '',
    comment: sourceProblemOperation?.comment || '',
    sourceProblemEventId: sourceProblemOperation?.id || '',
    parentProblemEventId: sourceProblemOperation?.id || '',
    childCardId: childId,
    childCode,
    createdAt,
    createdBy: userId,
  };
}

export function buildDerivedChildBatch({
  cultureCards,
  parentCard,
  sourceOperation,
  quantity,
  userId,
  originType,
  stage,
  locationDescription,
  batchStatus = 'active',
  healthStatus = 'healthy',
  isolationStatus = '',
  propagationMethod = '',
  sourceProblemOperation = null,
}) {
  const createdAt = sourceOperation?.date || new Date().toISOString().slice(0, 10);
  const createdAtIso = sourceOperation?.createdAt || new Date().toISOString();
  const childStage = stage || parentCard?.stage || INTRO_STAGE;
  const existingIds = new Set((cultureCards || []).map((card) => `${card.id || ''}`));
  const existingCodes = new Set(
    (cultureCards || [])
      .map((card) => `${card.code || ''}`.trim().toLowerCase())
      .filter(Boolean),
  );
  const childId = buildUniqueId(existingIds, `${originType || 'child'}-card`);
  const childCode = buildUniqueCode(existingCodes, createdAt, childStage);
  const generation = getParentGeneration(parentCard) + 1;
  const childCardBase = {
    id: childId,
    createdAt,
    updatedAt: createdAtIso,
    updatedBy: userId,
    createdBy: userId,
    cultureName: parentCard?.cultureName || '',
    speciesName: parentCard?.speciesName || '',
    varietyName: parentCard?.varietyName || '',
    name: getCardDisplayName(parentCard),
    code: childCode,
    quantity: Number(quantity) || 0,
    currentQuantity: Number(quantity) || 0,
    sourceMaterial: parentCard?.sourceMaterial || '',
    parentBatch: parentCard?.code || parentCard?.parentBatch || '',
    locationDescription: locationDescription || parentCard?.locationDescription || '',
    sterilityStatus: healthStatus === 'problem' ? 'contaminated' : 'unchecked',
    batchStatus,
    activeProblemQuantity: healthStatus === 'problem' ? Number(quantity) || 0 : 0,
    healthStatus,
    isolationStatus,
    status: 'active',
    qrStatus: 'pending_print',
    qrPrinted: false,
    qrPrintedAt: null,
    qrPrintedBy: null,
    startPhotoUri: '',
    startPhotoUris: [],
    stage: childStage,
    originType,
    parentCardId: parentCard?.id || '',
    parentCode: parentCard?.code || '',
    sourceEventId: sourceOperation?.id || '',
    generation,
    ...(propagationMethod ? { propagationMethod, propagatedAt: sourceOperation?.date || '' } : {}),
    ...(sourceProblemOperation?.id ? { sourceProblemEventId: sourceProblemOperation.id } : {}),
  };
  const batchCreatedOperation = createBatchCreatedOperation(childCardBase, createdAtIso);
  const originOperation = {
    id: `${originType || 'child'}-from-${sourceOperation?.id || childId}`,
    type: originType === 'problemIsolation' ? 'isolatedFromParent' : 'clonedFromParent',
    title: originType === 'problemIsolation'
      ? 'Создана из изоляции проблемы'
      : 'Создана из размножения',
    stage: childStage,
    date: createdAt,
    quantity: Number(quantity) || 0,
    parentCardId: parentCard?.id || '',
    parentCode: parentCard?.code || '',
    sourceEventId: sourceOperation?.id || '',
    sourceProblemEventId: sourceProblemOperation?.id || '',
    generation,
    propagationMethod,
    location: locationDescription || parentCard?.locationDescription || '',
    createdAt: createdAtIso,
    createdBy: userId,
  };
  const problemOperation = originType === 'problemIsolation'
    ? buildSourceProblemOperation(sourceProblemOperation, {
      childId,
      childCode,
      createdAt: createdAtIso,
      date: createdAt,
      quantity,
      stage: childStage,
      userId,
    })
    : null;

  return {
    ...childCardBase,
    operations: [batchCreatedOperation, originOperation, problemOperation].filter(Boolean),
  };
}

export function buildPropagationChildCard({
  cultureCards,
  parentCard,
  propagationOperation,
  quantity,
  userId,
}) {
  return buildDerivedChildBatch({
    cultureCards,
    parentCard,
    sourceOperation: propagationOperation,
    quantity,
    userId,
    originType: 'cloned',
    stage: stages[1],
    locationDescription: propagationOperation.nextLocation || parentCard.locationDescription || '',
    propagationMethod: propagationOperation.propagationMethod || '',
  });
}

export function attachChildToOperation(operation, childCard) {
  return {
    ...operation,
    childCardId: childCard.id,
    childCode: childCard.code,
  };
}

export function attachPropagationChildToOperation(operation, childCard) {
  return attachChildToOperation(operation, childCard);
}
