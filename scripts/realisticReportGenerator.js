const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

require('./register-domain-tests');

const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'test-results', 'realistic-reports');
const photoDir = path.join(projectRoot, 'docs', 'photo');
const catalogPath = path.join(projectRoot, 'data', 'plantsCatalog.js');
const appVersion = require(path.join(projectRoot, 'package.json')).version || '';

const {
  INTRO_STAGE,
  stages,
} = require('../src/domain/constants');
const {
  buildAdminReportSnapshot,
} = require('../src/services/adminReportSnapshot');
const {
  buildDerivedChildBatch,
  buildPropagationChildCard,
  attachChildToOperation,
} = require('../src/domain/propagationChildCard');
const {
  validateParentChildIntegrity,
} = require('../src/domain/parentChildIntegrity');
const {
  buildStageChangeOperation,
} = require('../src/domain/stageTransition');
const {
  createBatchCreatedOperation,
  createQrGeneratedOperation,
  getCardActiveProblemQuantity,
  getCardCurrentQuantity,
  normalizeCultureCard,
} = require('../src/domain/batch');
const {
  completionResultOptions,
  getCareTypeOptions,
  getProblemTypeOptions,
  getSupportedReportOperationTypes,
  hardeningCareOptions,
  hardeningProblemTypeOptions,
  introProblemTypeOptions,
  plantingCareOptions,
  plantingProblemTypeOptions,
  readinessOptions,
  requiredReportEnumCoverage,
  riskLevelOptions,
  survivalRateOptions,
  turgorOptions,
} = require('../src/domain/reportCoverageConfig');

const REPORT_COUNT = 10;
const GOLDEN_REPORT_FILE = 'golden-integration-report.zip';
const FORBIDDEN_LEGACY_KEYS = ['photoNote', 'startPhotoNote', 'statusChange'];
const EMPLOYEES = [
  ['demo-user-001', 'Иван', 'Петров', 'agronom'],
  ['demo-user-002', 'Мария', 'Иванова', 'lab'],
  ['demo-user-003', 'Алексей', 'Сидоров', 'technologist'],
  ['demo-user-004', 'Елена', 'Смирнова', 'greenhouse'],
  ['demo-user-005', 'Ильдар', 'Унаибеков', 'admin'],
  ['demo-user-006', 'Анна', 'Ковалева', 'agronom'],
  ['demo-user-007', 'Сергей', 'Мельников', 'lab'],
  ['demo-user-008', 'Ирина', 'Федорова', 'technologist'],
  ['demo-user-009', 'Павел', 'Соколов', 'greenhouse'],
  ['demo-user-010', 'Светлана', 'Николаева', 'admin'],
].map(([localUserId, firstName, lastName, role]) => ({
  displayName: `${firstName} ${lastName}`,
  firstName,
  lastName,
  localUserId,
  role,
}));

const STAGE_LOCATIONS = {
  [INTRO_STAGE]: ['Лаборатория · стеллаж Л-1', 'Лаборатория · стеллаж Л-2', 'Карантинный бокс · стол 1'],
  [stages[1]]: ['Клонарий · секция А', 'Клонарий · секция B'],
  [stages[2]]: ['Адаптационная зона · полка 1', 'Адаптационная зона · полка 3'],
  [stages[3]]: ['Теплица 1 · стеллаж B · полка 3', 'Теплица 2 · стол T-4'],
  [stages[4]]: ['Закалочная площадка · сектор 2', 'Закалочная площадка · сектор 4'],
  [stages[5]]: ['Участок 1 · грядка A-3', 'Участок 2 · грядка C-1'],
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeSeed(seed) {
  return `${seed || process.env.DEMO_REPORT_SEED || '20260807'}`.trim() || '20260807';
}

function createSeededRandom(seedText) {
  let h1 = 1779033703 ^ seedText.length;
  let h2 = 3144134277 ^ seedText.length;
  let h3 = 1013904242 ^ seedText.length;
  let h4 = 2773480762 ^ seedText.length;

  for (let index = 0; index < seedText.length; index += 1) {
    const charCode = seedText.charCodeAt(index);
    h1 = Math.imul(h1 ^ charCode, 597399067);
    h2 = Math.imul(h2 ^ charCode, 2869860233);
    h3 = Math.imul(h3 ^ charCode, 951274213);
    h4 = Math.imul(h4 ^ charCode, 2716044179);
  }

  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);

  return function random() {
    const result = (h1 ^ h2 ^ h3 ^ h4) >>> 0;
    h1 = h2;
    h2 = h3;
    h3 = h4;
    h4 = (h4 + 0x6D2B79F5) >>> 0;
    return result / 4294967296;
  };
}

function randomInt(min, max, rng) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick(items, rng, offset = 0) {
  return items[(randomInt(0, items.length - 1, rng) + offset) % items.length];
}

function isoDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

function isoDateTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}

function plusHours(value, hours) {
  return new Date(value.getTime() + hours * 60 * 60 * 1000);
}

function plusDays(value, days) {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
}

function ensureDir(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function cleanupOutputDirectory() {
  if (!fs.existsSync(outputDir)) {
    return;
  }

  fs.readdirSync(outputDir).forEach((name) => {
    if (/\.zip$/i.test(name)) {
      fs.rmSync(path.join(outputDir, name), { force: true });
    }
  });
}

function loadPhotoPool() {
  assert(fs.existsSync(photoDir), `Photo directory is missing: ${photoDir}`);
  const files = fs.readdirSync(photoDir)
    .map((name) => path.join(photoDir, name))
    .filter((filePath) => /\.(jpe?g|png|webp)$/i.test(filePath))
    .sort((left, right) => left.localeCompare(right, 'ru'));
  assert(files.length > 0, 'No photos found for realistic reports');
  return files;
}

function loadUniqueCultures() {
  const source = fs.readFileSync(catalogPath, 'utf8')
    .replace(/export default plantsCatalog;?\s*$/, '');
  const catalog = new Function(`${source}\nreturn plantsCatalog;`)();
  const seen = new Set();

  return catalog.filter((plant) => {
    const key = [plant.cultureName, plant.speciesName, plant.varietyName]
      .map((value) => `${value || ''}`.trim())
      .join('|');
    if (!plant.cultureName || !plant.speciesName || !plant.varietyName || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function createContext(seed) {
  return {
    cardSequence: 0,
    commentSequence: 0,
    cultures: loadUniqueCultures(),
    cultureCursor: 0,
    photoCursor: 0,
    photoPool: loadPhotoPool(),
    rng: createSeededRandom(normalizeSeed(seed)),
    seed: normalizeSeed(seed),
  };
}

function takeCulture(context) {
  const culture = context.cultures[context.cultureCursor];
  assert(culture, 'Not enough unique cultures for realistic reports');
  context.cultureCursor += 1;
  return culture;
}

function nextPhoto(context) {
  const photo = context.photoPool[context.photoCursor % context.photoPool.length];
  context.photoCursor += 1;
  return photo;
}

function makeCardId(context, prefix) {
  context.cardSequence += 1;
  return `${prefix}-${String(context.cardSequence).padStart(4, '0')}`;
}

function makeCode(stage, reportIndex, cardIndex) {
  const prefix = stage === stages[1]
    ? 'KL'
    : stage === stages[2]
      ? 'AD'
      : stage === stages[3]
        ? 'TP'
        : stage === stages[4]
          ? 'ZA'
          : stage === stages[5]
            ? 'VS'
            : 'VK';

  return `${prefix}-202607${String(reportIndex + 11).padStart(2, '0')}-${String(cardIndex + 1).padStart(2, '0')}`;
}

function makeComment(context, card, type, reportIndex, text) {
  context.commentSequence += 1;
  return `${text} ${card.cultureName} ${card.speciesName} ${card.varietyName}; партия ${card.code}; смена ${reportIndex + 1}; запись ${context.commentSequence}.`;
}

function locationForStage(stage, index) {
  const locations = STAGE_LOCATIONS[stage];
  return locations[index % locations.length];
}

function refreshCard(card) {
  return Object.assign(card, normalizeCultureCard(card));
}

function currentQuantity(card) {
  return getCardCurrentQuantity(refreshCard(card));
}

function activeProblemQuantity(card) {
  return getCardActiveProblemQuantity(refreshCard(card));
}

function pushOperation(card, operation, updates = {}) {
  card.operations = [...(card.operations || []), operation];
  Object.assign(card, updates, {
    updatedAt: operation.createdAt || card.updatedAt,
  });

  if (operation.type === 'stageChange' && operation.toStage) {
    card.stage = operation.toStage;
    card.stageChangedAt = operation.stageChangedAt || operation.date;
  }

  if (operation.type === 'movement' && operation.nextLocation) {
    card.locationDescription = operation.nextLocation;
  }

  if (operation.type === 'plantingCompletion') {
    card.batchStatus = 'archived';
  }

  refreshCard(card);
  return card;
}

function createRootCard(context, {
  cardIndex,
  createdAt,
  reportIndex,
  targetStageIndex,
  user,
}) {
  const culture = takeCulture(context);
  const stage = stages[targetStageIndex];
  const quantity = 72 + (reportIndex % 5) * 9 + targetStageIndex * 11 + cardIndex * 7;
  const card = {
    id: makeCardId(context, 'root-card'),
    code: makeCode(stage, reportIndex, cardIndex),
    createdAt: isoDate(createdAt),
    updatedAt: isoDateTime(createdAt),
    createdBy: user.localUserId,
    createdByName: user.displayName,
    updatedBy: user.localUserId,
    cultureName: culture.cultureName,
    speciesName: culture.speciesName,
    varietyName: culture.varietyName,
    name: `${culture.cultureName} ${culture.speciesName} ${culture.varietyName}`,
    quantity,
    currentQuantity: quantity,
    sourceMaterial: 'Маточное растение',
    parentBatch: '',
    locationDescription: locationForStage(INTRO_STAGE, reportIndex + cardIndex),
    sterilityStatus: 'unchecked',
    batchStatus: 'active',
    status: 'active',
    qrStatus: 'pending_print',
    qrPrinted: false,
    qrPrintedAt: '',
    qrPrintedBy: '',
    startPhotoUri: '',
    startPhotoUris: cardIndex % 2 === 0 ? [nextPhoto(context)] : [],
    stage: INTRO_STAGE,
    stageChangedAt: isoDate(createdAt),
    originType: 'initial',
    parentCardId: '',
    parentCode: '',
    sourceEventId: '',
    generation: 0,
    healthStatus: 'healthy',
    isolationStatus: '',
    operations: [],
  };

  const batchCreated = createBatchCreatedOperation(card, isoDateTime(createdAt));
  const qrGenerated = createQrGeneratedOperation(card, isoDateTime(plusHours(createdAt, 1)), {
    id: user.localUserId,
    fullName: user.displayName,
  });

  card.operations = [batchCreated, qrGenerated];
  refreshCard(card);

  for (let stageIndex = 1; stageIndex <= targetStageIndex; stageIndex += 1) {
    const stageDate = plusDays(createdAt, stageIndex * 4 + cardIndex);
    const toStage = stages[stageIndex];
    const stageChange = buildStageChangeOperation({
      currentQuantity: currentQuantity(card),
      nextStage: toStage,
      nowIso: isoDateTime(stageDate),
      operationId: `${card.id}-stage-${stageIndex}`,
      selectedCard: card,
      selectedCalendarDate: isoDate(stageDate),
      userId: user.localUserId,
    });
    pushOperation(card, stageChange, {
      locationDescription: locationForStage(toStage, reportIndex + cardIndex + stageIndex),
    });
    pushOperation(card, {
      id: `${card.id}-movement-${stageIndex}`,
      type: 'movement',
      title: 'Перемещение',
      stage: toStage,
      date: isoDate(plusHours(stageDate, 4)),
      previousLocation: card.locationDescription,
      nextLocation: locationForStage(toStage, reportIndex + cardIndex + stageIndex),
      comment: makeComment(context, card, 'movement', reportIndex, `Партия переведена на рабочую локацию стадии «${toStage}».`),
      photoUris: stageIndex % 2 === 0 ? [nextPhoto(context)] : [],
      createdAt: isoDateTime(plusHours(stageDate, 4)),
      createdBy: user.localUserId,
    });
  }

  return refreshCard(card);
}

function addRooting(context, card, reportIndex, user, createdAt) {
  const rootedCount = Math.max(4, Math.round(card.quantity * 0.28));
  return pushOperation(card, {
    id: `${card.id}-rooting`,
    type: 'rooting',
    title: 'Укоренение',
    stage: card.stage,
    date: isoDate(createdAt),
    createdAt: isoDateTime(createdAt),
    createdBy: user.localUserId,
    count: rootedCount,
    rootedCount,
    rootingPercent: Math.min(Math.round((rootedCount / card.quantity) * 100), 100),
    currentQuantity: currentQuantity(card),
    comment: makeComment(context, card, 'rooting', reportIndex, 'Зафиксировано плановое укоренение растений.'),
  });
}

function addLossOperation(context, card, reportIndex, user, createdAt, type, count, reason) {
  const previousQuantity = currentQuantity(card);
  const safeCount = Math.min(count, previousQuantity);
  return pushOperation(card, {
    id: `${card.id}-${type}-${createdAt.getTime()}`,
    type,
    title: type === 'discard' ? 'Выбраковка' : type === 'death' ? 'Гибель' : 'Потери',
    stage: card.stage,
    date: isoDate(createdAt),
    createdAt: isoDateTime(createdAt),
    createdBy: user.localUserId,
    count: safeCount,
    previousQuantity,
    currentQuantity: Math.max(previousQuantity - safeCount, 0),
    reason,
    lossReason: type === 'introLoss' ? reason : '',
    comment: makeComment(context, card, type, reportIndex, reason),
  }, {
    batchStatus: Math.max(previousQuantity - safeCount, 0) === 0 ? 'sold' : card.batchStatus,
  });
}

function addSale(context, card, reportIndex, user, createdAt, count) {
  const previousQuantity = currentQuantity(card);
  const safeCount = Math.min(count, previousQuantity);
  const afterQuantity = Math.max(previousQuantity - safeCount, 0);

  return pushOperation(card, {
    id: `${card.id}-sale-${createdAt.getTime()}`,
    type: 'sale',
    title: 'Продажа',
    stage: card.stage,
    date: isoDate(createdAt),
    createdAt: isoDateTime(createdAt),
    createdBy: user.localUserId,
    count: safeCount,
    previousQuantity,
    currentQuantity: afterQuantity,
    saleType: safeCount > 6 ? 'Оптовая' : 'Розничная',
    recipient: safeCount > 6 ? 'Постоянный заказчик' : 'Локальный клиент',
    saleAmount: `${safeCount * (40 + reportIndex * 5)}`,
    comment: makeComment(context, card, 'sale', reportIndex, 'Часть партии реализована после контрольной приёмки.'),
    photoUris: [nextPhoto(context)],
  }, {
    batchStatus: afterQuantity === 0 ? 'sold' : 'partial',
  });
}

function addProblem(context, card, reportIndex, user, createdAt, options = {}) {
  const previousQuantity = currentQuantity(card);
  const healthyQuantity = Math.max(previousQuantity - activeProblemQuantity(card), 0);
  const affectedQuantity = Math.min(options.affectedQuantity || Math.max(2, Math.round(previousQuantity * 0.12)), healthyQuantity);
  const problemType = options.problemType || pick(getProblemTypeOptions(card.stage), context.rng, reportIndex);
  const riskLevel = options.riskLevel || riskLevelOptions[reportIndex % riskLevelOptions.length];

  return pushOperation(card, {
    id: `${card.id}-problem-${createdAt.getTime()}`,
    type: 'problem',
    title: 'Проблема',
    stage: card.stage,
    date: isoDate(createdAt),
    createdAt: isoDateTime(createdAt),
    createdBy: user.localUserId,
    problemType,
    riskLevel,
    affectedQuantity,
    currentQuantity: previousQuantity,
    problemDescription: options.problemDescription || `Выявлено отклонение: ${problemType.toLowerCase()}.`,
    comment: makeComment(context, card, 'problem', reportIndex, options.commentText || 'Проблема зафиксирована и поставлена на контроль.'),
    photoUris: [nextPhoto(context)],
  }, {
    batchStatus: problemType === 'Карантин' ? 'quarantine' : 'problem',
    healthStatus: 'problem',
    sterilityStatus: problemType === 'Контаминация' ? 'contaminated' : card.sterilityStatus,
  });
}

function addProblemRecovery(context, card, reportIndex, user, createdAt, count) {
  const activeQuantity = activeProblemQuantity(card);
  const recoveredQuantity = Math.min(count || Math.max(1, Math.floor(activeQuantity / 2)), activeQuantity);

  return pushOperation(card, {
    id: `${card.id}-recovery-${createdAt.getTime()}`,
    type: 'problemRecovery',
    title: 'Выздоровление',
    stage: card.stage,
    date: isoDate(createdAt),
    createdAt: isoDateTime(createdAt),
    createdBy: user.localUserId,
    recoveredQuantity,
    activeProblemQuantityBefore: activeQuantity,
    currentQuantity: currentQuantity(card),
    riskLevel: riskLevelOptions[Math.max(reportIndex - 1, 0) % riskLevelOptions.length],
    comment: makeComment(context, card, 'problemRecovery', reportIndex, 'Проведена корректирующая обработка и контроль выздоровления.'),
  }, {
    healthStatus: recoveredQuantity >= activeQuantity ? 'healthy' : 'monitoring',
  });
}

function addContamination(context, card, reportIndex, user, createdAt) {
  return pushOperation(card, {
    id: `${card.id}-contamination-${createdAt.getTime()}`,
    type: 'contamination',
    title: 'Контаминация',
    stage: card.stage,
    date: isoDate(createdAt),
    createdAt: isoDateTime(createdAt),
    createdBy: user.localUserId,
    contaminationNote: 'Выявлены признаки контаминации в партии.',
    comment: makeComment(context, card, 'contamination', reportIndex, 'Контаминация подтверждена при повторном осмотре.'),
    photoUris: [nextPhoto(context)],
  }, {
    batchStatus: 'problem',
    healthStatus: 'problem',
    sterilityStatus: 'contaminated',
  });
}

function addQuarantine(context, card, reportIndex, user, createdAt) {
  return pushOperation(card, {
    id: `${card.id}-quarantine-${createdAt.getTime()}`,
    type: 'quarantine',
    title: 'Карантин',
    stage: card.stage,
    date: isoDate(createdAt),
    createdAt: isoDateTime(createdAt),
    createdBy: user.localUserId,
    quarantineReason: 'Партия переведена в карантин до уточнения статуса.',
    comment: makeComment(context, card, 'quarantine', reportIndex, 'Партия временно изолирована по регламенту.'),
    photoUris: [nextPhoto(context)],
  }, {
    batchStatus: 'quarantine',
    healthStatus: 'problem',
  });
}

function addObservationOrCare(context, card, reportIndex, user, createdAt) {
  if (card.stage === stages[2]) {
    pushOperation(card, {
      id: `${card.id}-adaptation-stress`,
      type: 'adaptationStress',
      title: 'Наблюдение',
      stage: card.stage,
      date: isoDate(createdAt),
      createdAt: isoDateTime(createdAt),
      createdBy: user.localUserId,
      stressLevel: riskLevelOptions[reportIndex % riskLevelOptions.length],
      turgor: turgorOptions[reportIndex % turgorOptions.length],
      comment: makeComment(context, card, 'adaptationStress', reportIndex, 'Проведён контроль состояния на адаптации.'),
      photoUris: reportIndex % 2 === 0 ? [nextPhoto(context)] : [],
    });
    return pushOperation(card, {
      id: `${card.id}-adaptation-care`,
      type: 'adaptationCare',
      title: 'Уход',
      stage: card.stage,
      date: isoDate(plusHours(createdAt, 5)),
      createdAt: isoDateTime(plusHours(createdAt, 5)),
      createdBy: user.localUserId,
      careType: getCareTypeOptions('adaptationCare')[reportIndex % getCareTypeOptions('adaptationCare').length],
      comment: makeComment(context, card, 'adaptationCare', reportIndex, 'Выполнен коррекционный уход по графику.'),
    });
  }

  if (card.stage === stages[3]) {
    pushOperation(card, {
      id: `${card.id}-greenhouse-observation`,
      type: 'greenhouseObservation',
      title: 'Наблюдение',
      stage: card.stage,
      date: isoDate(createdAt),
      createdAt: isoDateTime(createdAt),
      createdBy: user.localUserId,
      riskLevel: riskLevelOptions[reportIndex % riskLevelOptions.length],
      stressLevel: riskLevelOptions[(reportIndex + 1) % riskLevelOptions.length],
      growthRate: ['Низкий', 'Средний', 'Высокий'][reportIndex % 3],
      conditionDescription: 'Прирост равномерный, состояние партии контролируемое.',
      comment: makeComment(context, card, 'greenhouseObservation', reportIndex, 'Проведён плановый тепличный осмотр.'),
      photoUris: [nextPhoto(context)],
    });
    pushOperation(card, {
      id: `${card.id}-greenhouse-care`,
      type: 'greenhouseCare',
      title: 'Уход',
      stage: card.stage,
      date: isoDate(plusHours(createdAt, 4)),
      createdAt: isoDateTime(plusHours(createdAt, 4)),
      createdBy: user.localUserId,
      careType: getCareTypeOptions('greenhouseCare')[reportIndex % getCareTypeOptions('greenhouseCare').length],
      careIntervalDays: `${2 + (reportIndex % 4)}`,
      wateringIntervalDays: `${2 + (reportIndex % 3)}`,
      waterVolume: `${1 + (reportIndex % 2)}`,
      productName: 'Комплексное удобрение',
      dosage: '10 мл',
      applicationMethod: 'Полив',
      plantReaction: 'Положительная',
      riskLevel: riskLevelOptions[(reportIndex + 2) % riskLevelOptions.length],
      comment: makeComment(context, card, 'greenhouseCare', reportIndex, 'Выполнен плановый уход в теплице.'),
    });
    return pushOperation(card, {
      id: `${card.id}-transplant`,
      type: 'transplant',
      title: 'Пересадка',
      stage: card.stage,
      date: isoDate(plusHours(createdAt, 8)),
      createdAt: isoDateTime(plusHours(createdAt, 8)),
      createdBy: user.localUserId,
      count: Math.max(3, Math.round(card.quantity * 0.1)),
      placement: 'Центральный ряд',
      densityChange: 'Уменьшена',
      growthRate: 'Средний',
      stability: 'Стабильная',
      currentQuantity: currentQuantity(card),
      comment: makeComment(context, card, 'transplant', reportIndex, 'Часть партии пересажена для снижения плотности.'),
      photoUris: [nextPhoto(context)],
    });
  }

  if (card.stage === stages[4]) {
    pushOperation(card, {
      id: `${card.id}-hardening-observation`,
      type: 'hardeningObservation',
      title: 'Наблюдение',
      stage: card.stage,
      date: isoDate(createdAt),
      createdAt: isoDateTime(createdAt),
      createdBy: user.localUserId,
      stressLevel: riskLevelOptions[reportIndex % riskLevelOptions.length],
      turgor: turgorOptions[(reportIndex + 1) % turgorOptions.length],
      readinessForPlanting: readinessOptions[reportIndex % readinessOptions.length],
      comment: makeComment(context, card, 'hardeningObservation', reportIndex, 'Оценена готовность партии к высадке.'),
      photoUris: [nextPhoto(context)],
    });
    return pushOperation(card, {
      id: `${card.id}-hardening-care`,
      type: 'hardeningCare',
      title: 'Уход',
      stage: card.stage,
      date: isoDate(plusHours(createdAt, 6)),
      createdAt: isoDateTime(plusHours(createdAt, 6)),
      createdBy: user.localUserId,
      careType: hardeningCareOptions[reportIndex % hardeningCareOptions.length],
      productName: 'Стимулятор',
      dosage: '5 мл',
      applicationMethod: 'Полив',
      plantReaction: 'Стабильная',
      comment: makeComment(context, card, 'hardeningCare', reportIndex, 'Проведён уход на этапе закалки.'),
    });
  }

  if (card.stage === stages[5]) {
    pushOperation(card, {
      id: `${card.id}-planting`,
      type: 'planting',
      title: 'Высадка',
      stage: card.stage,
      date: isoDate(createdAt),
      createdAt: isoDateTime(createdAt),
      createdBy: user.localUserId,
      plantingLocation: locationForStage(card.stage, reportIndex),
      plantingScheme: '30x40 см',
      plotArea: `Участок ${reportIndex + 1}, сектор ${card.quantity % 4 + 1}`,
      soilType: 'Подготовленный субстрат',
      comment: makeComment(context, card, 'planting', reportIndex, 'Высадка выполнена по схеме с предварительным увлажнением.'),
      photoUris: [nextPhoto(context)],
    });
    pushOperation(card, {
      id: `${card.id}-planting-observation`,
      type: 'plantingObservation',
      title: 'Наблюдение',
      stage: card.stage,
      date: isoDate(plusHours(createdAt, 10)),
      createdAt: isoDateTime(plusHours(createdAt, 10)),
      createdBy: user.localUserId,
      survivalRate: survivalRateOptions[reportIndex % survivalRateOptions.length],
      stressLevel: riskLevelOptions[(reportIndex + 1) % riskLevelOptions.length],
      turgor: turgorOptions[(reportIndex + 2) % turgorOptions.length],
      comment: makeComment(context, card, 'plantingObservation', reportIndex, 'После высадки выполнен контроль приживаемости.'),
      photoUris: [nextPhoto(context)],
    });
    pushOperation(card, {
      id: `${card.id}-planting-care`,
      type: 'plantingCare',
      title: 'Уход',
      stage: card.stage,
      date: isoDate(plusHours(createdAt, 16)),
      createdAt: isoDateTime(plusHours(createdAt, 16)),
      createdBy: user.localUserId,
      careType: plantingCareOptions[reportIndex % plantingCareOptions.length],
      productName: 'После высадочный комплекс',
      dosage: '1 мл/л',
      applicationMethod: 'Капельно',
      plantReaction: 'Без стресса',
      comment: makeComment(context, card, 'plantingCare', reportIndex, 'После высадки выполнен регламентный уход.'),
    });
    addProblem(context, card, reportIndex, user, plusHours(createdAt, 20), {
      problemType: plantingProblemTypeOptions[reportIndex % plantingProblemTypeOptions.length],
      riskLevel: riskLevelOptions[(reportIndex + 2) % riskLevelOptions.length],
      affectedQuantity: 3 + (reportIndex % 3),
      problemDescription: 'После высадки отмечены единичные стрессовые растения.',
      commentText: 'Проблема после высадки зафиксирована и взята в работу.',
    });
    addProblemRecovery(context, card, reportIndex, user, plusHours(createdAt, 22), 2 + (reportIndex % 2));

    return pushOperation(card, {
      id: `${card.id}-planting-completion`,
      type: 'plantingCompletion',
      title: 'Завершение',
      stage: card.stage,
      date: isoDate(plusHours(createdAt, 24)),
      createdAt: isoDateTime(plusHours(createdAt, 24)),
      createdBy: user.localUserId,
      completionResult: completionResultOptions[reportIndex % completionResultOptions.length],
      comment: makeComment(context, card, 'plantingCompletion', reportIndex, 'Итог высадки зафиксирован в журнале.'),
    }, {
      batchStatus: 'archived',
    });
  }

  return card;
}

function buildPropagationScenario(context, cards, parentCard, reportIndex, user, createdAt) {
  const count = Math.min(Math.max(4, Math.round(currentQuantity(parentCard) * 0.12)), currentQuantity(parentCard));
  const propagationOperation = {
    id: `${parentCard.id}-propagation-${createdAt.getTime()}`,
    type: 'propagation',
    title: 'Размножение',
    stage: parentCard.stage,
    date: isoDate(createdAt),
    createdAt: isoDateTime(createdAt),
    createdBy: user.localUserId,
    count,
    currentQuantity: currentQuantity(parentCard),
    propagationMethod: ['Черенкование', 'Деление куста', 'Микрочеренкование'][reportIndex % 3],
    comment: makeComment(context, parentCard, 'propagation', reportIndex, 'Из родительской партии выделен материал на размножение.'),
    photoUris: [nextPhoto(context)],
  };

  pushOperation(parentCard, propagationOperation);
  const childCard = buildPropagationChildCard({
    cultureCards: cards,
    parentCard,
    propagationOperation,
    quantity: count,
    userId: user.localUserId,
  });
  const linkedOperation = attachChildToOperation(propagationOperation, childCard);
  parentCard.operations[parentCard.operations.length - 1] = linkedOperation;
  refreshCard(parentCard);

  childCard.startPhotoUris = [nextPhoto(context)];
  childCard.operations = [
    ...childCard.operations,
    {
      id: `${childCard.id}-movement-1`,
      type: 'movement',
      title: 'Перемещение',
      stage: childCard.stage,
      date: isoDate(plusHours(createdAt, 6)),
      createdAt: isoDateTime(plusHours(createdAt, 6)),
      createdBy: user.localUserId,
      previousLocation: parentCard.locationDescription,
      nextLocation: locationForStage(childCard.stage, reportIndex + 20),
      comment: makeComment(context, childCard, 'movement', reportIndex, 'Дочерняя cloned-партия вынесена на отдельную полку.'),
    },
  ];
  refreshCard(childCard);

  validateParentChildIntegrity({
    cultureCards: [...cards, childCard],
    parentCard,
    childCard,
    parentOperation: linkedOperation,
    originType: 'cloned',
    quantity: count,
  });

  return refreshCard(childCard);
}

function buildIsolationScenario(context, cards, parentCard, reportIndex, user, createdAt, isFullIsolation) {
  const sourceProblem = parentCard.operations.filter((operation) => operation.type === 'problem').slice(-1)[0];
  assert(sourceProblem, `Isolation scenario requires a problem event on ${parentCard.id}`);
  const maxProblemQuantity = Number(sourceProblem.affectedQuantity) || activeProblemQuantity(parentCard) || 1;
  const isolationCount = isFullIsolation
    ? maxProblemQuantity
    : Math.max(1, Math.floor(maxProblemQuantity / 2));
  const isolationOperation = {
    id: `${parentCard.id}-isolation-${createdAt.getTime()}`,
    type: 'problemIsolation',
    title: 'Изоляция проблемы',
    stage: parentCard.stage,
    date: isoDate(createdAt),
    createdAt: isoDateTime(createdAt),
    createdBy: user.localUserId,
    count: isolationCount,
    quantity: isolationCount,
    currentQuantity: Math.max(currentQuantity(parentCard) - isolationCount, 0),
    sourceProblemEventId: sourceProblem.id,
    location: `Изолятор ${reportIndex + 1}`,
    nextLocation: `Изолятор ${reportIndex + 1}`,
    comment: makeComment(context, parentCard, 'problemIsolation', reportIndex, isFullIsolation
      ? 'Проблемный материал полностью выделен в изолятор.'
      : 'Проблемный материал частично выделен в изолятор.'),
    photoUris: [nextPhoto(context)],
  };

  pushOperation(parentCard, isolationOperation);
  const childCard = buildDerivedChildBatch({
    cultureCards: cards,
    parentCard,
    sourceOperation: isolationOperation,
    quantity: isolationCount,
    userId: user.localUserId,
    originType: 'problemIsolation',
    stage: parentCard.stage,
    locationDescription: `Изолятор ${reportIndex + 1}`,
    batchStatus: 'problem',
    healthStatus: 'problem',
    isolationStatus: 'isolated',
    sourceProblemOperation: sourceProblem,
  });
  const linkedOperation = attachChildToOperation(isolationOperation, childCard);
  parentCard.operations[parentCard.operations.length - 1] = linkedOperation;
  refreshCard(parentCard);

  childCard.startPhotoUris = [nextPhoto(context)];
  childCard.operations = (childCard.operations || []).map((operation) => (
    operation.type === 'problem'
      ? {
        ...operation,
        comment: makeComment(context, childCard, 'problem', reportIndex, 'Проблема перенесена в isolated child и ведётся отдельно от родителя.'),
      }
      : operation
  ));
  childCard.operations = [
    ...childCard.operations,
    {
      id: `${childCard.id}-recovery-${createdAt.getTime()}`,
      type: 'problemRecovery',
      title: 'Выздоровление',
      stage: childCard.stage,
      date: isoDate(plusHours(createdAt, 20)),
      createdAt: isoDateTime(plusHours(createdAt, 20)),
      createdBy: user.localUserId,
      recoveredQuantity: Math.max(1, Math.floor(isolationCount / 2)),
      activeProblemQuantityBefore: isolationCount,
      currentQuantity: isolationCount,
      riskLevel: riskLevelOptions[Math.max(reportIndex - 1, 0) % riskLevelOptions.length],
      comment: makeComment(context, childCard, 'problemRecovery', reportIndex, 'На изолированной партии проведена восстановительная обработка.'),
      photoUris: [nextPhoto(context)],
    },
  ];
  refreshCard(childCard);

  validateParentChildIntegrity({
    cultureCards: [...cards, childCard],
    parentCard,
    childCard,
    parentOperation: linkedOperation,
    originType: 'problemIsolation',
    quantity: isolationCount,
  });

  return refreshCard(childCard);
}

function buildEmployeeReportCards(context, reportIndex, user) {
  const reportDate = new Date(Date.UTC(2026, 6, 15 + reportIndex, 14, 30, 0));
  const roots = stages.map((stage, stageIndex) => createRootCard(context, {
    cardIndex: stageIndex,
    createdAt: plusDays(reportDate, -36 + stageIndex * 5),
    reportIndex,
    targetStageIndex: stageIndex,
    user,
  }));

  roots.forEach((card, stageIndex) => {
    const stageActionDate = plusDays(reportDate, -5 + stageIndex);
    if (stageIndex === 0) {
      pushOperation(card, {
        id: `${card.id}-comment`,
        type: 'comment',
        title: 'Комментарий',
        stage: card.stage,
        date: isoDate(stageActionDate),
        createdAt: isoDateTime(stageActionDate),
        createdBy: user.localUserId,
        comment: makeComment(context, card, 'comment', reportIndex, 'Стартовая партия прошла входной контроль и заведена в журнал.'),
      });
      addLossOperation(context, card, reportIndex, user, plusHours(stageActionDate, 4), 'introLoss', 2 + (reportIndex % 3), 'Списаны единичные потери при первичном осмотре.');
      addProblem(context, card, reportIndex, user, plusHours(stageActionDate, 8), {
        problemType: introProblemTypeOptions[reportIndex % introProblemTypeOptions.length],
        riskLevel: riskLevelOptions[reportIndex % riskLevelOptions.length],
        affectedQuantity: 3 + (reportIndex % 4),
        problemDescription: 'На старте обнаружено отклонение, требующее фиксации в журнале.',
        commentText: 'Проблема стартовой партии зафиксирована при осмотре.',
      });
    } else if (stageIndex === 1) {
      addRooting(context, card, reportIndex, user, stageActionDate);
      addLossOperation(context, card, reportIndex, user, plusHours(stageActionDate, 4), 'death', 1 + (reportIndex % 2), 'Списаны единичные растения после укоренения.');
    } else {
      addObservationOrCare(context, card, reportIndex, user, stageActionDate);
    }
  });

  addProblem(context, roots[4], reportIndex, user, plusDays(reportDate, -2), {
    problemType: hardeningProblemTypeOptions[reportIndex % hardeningProblemTypeOptions.length],
    riskLevel: riskLevelOptions[(reportIndex + 1) % riskLevelOptions.length],
    affectedQuantity: 4 + (reportIndex % 3),
    problemDescription: 'На этапе закалки выявлены стрессовые растения.',
    commentText: 'Проблема на закалке зафиксирована после контрольного осмотра.',
  });

  const cards = [...roots];
  const cloneChild = buildPropagationScenario(context, cards, roots[1], reportIndex, user, plusDays(reportDate, -3));
  cards.push(cloneChild);

  addProblem(context, roots[3], reportIndex, user, plusDays(reportDate, -2), {
    problemType: getProblemTypeOptions(roots[3].stage)[reportIndex % getProblemTypeOptions(roots[3].stage).length],
    riskLevel: riskLevelOptions[(reportIndex + 1) % riskLevelOptions.length],
    problemDescription: 'Выявлена тепличная проблема на контрольной выборке.',
    commentText: 'Проблема зафиксирована в тепличной партии.',
  });

  if (reportIndex === 0) {
    addProblem(context, roots[0], reportIndex, user, plusDays(reportDate, -2), {
      problemType: introProblemTypeOptions[0],
      riskLevel: 'Критический',
      affectedQuantity: 8,
    });
    cards.push(buildIsolationScenario(context, cards, roots[0], reportIndex, user, plusDays(reportDate, -1), true));
  } else if (reportIndex === 1) {
    addContamination(context, roots[0], reportIndex, user, plusDays(reportDate, -2));
    addSale(context, roots[2], reportIndex, user, plusDays(reportDate, -1), 3);
  } else if (reportIndex === 2) {
    addProblem(context, roots[4], reportIndex, user, plusDays(reportDate, -2), {
      problemType: hardeningProblemTypeOptions[reportIndex % hardeningProblemTypeOptions.length],
      riskLevel: 'Высокий',
      affectedQuantity: 10,
    });
    cards.push(buildIsolationScenario(context, cards, roots[4], reportIndex, user, plusDays(reportDate, -1), false));
    addQuarantine(context, roots[0], reportIndex, user, plusDays(reportDate, -1));
  } else if (reportIndex === 3) {
    addProblem(context, roots[3], reportIndex, user, plusDays(reportDate, -1), {
      problemType: getProblemTypeOptions(roots[3].stage)[(reportIndex + 1) % getProblemTypeOptions(roots[3].stage).length],
      riskLevel: 'Средний',
      affectedQuantity: 5,
      commentText: 'Повторная проблема зафиксирована на той же партии.',
    });
    addProblemRecovery(context, roots[3], reportIndex, user, plusHours(plusDays(reportDate, -1), 8), 4);
  } else if (reportIndex === 4) {
    addLossOperation(context, roots[1], reportIndex, user, plusDays(reportDate, -1), 'discard', 2, 'Отбракованы слабые экземпляры после отбора.');
    addSale(context, roots[5], reportIndex, user, plusHours(plusDays(reportDate, -1), 8), 5);
  } else if (reportIndex === 5) {
    addSale(context, roots[2], reportIndex, user, plusDays(reportDate, -1), 4);
    addProblemRecovery(context, roots[3], reportIndex, user, plusHours(plusDays(reportDate, -1), 6), 2);
  } else if (reportIndex === 6) {
    addProblem(context, roots[5], reportIndex, user, plusDays(reportDate, -1), {
      problemType: plantingProblemTypeOptions[reportIndex % plantingProblemTypeOptions.length],
      riskLevel: 'Высокий',
      affectedQuantity: 6,
    });
    addSale(context, roots[5], reportIndex, user, plusHours(plusDays(reportDate, -1), 7), 3);
  } else if (reportIndex === 7) {
    addProblem(context, roots[0], reportIndex, user, plusDays(reportDate, -1), {
      problemType: introProblemTypeOptions[(reportIndex + 2) % introProblemTypeOptions.length],
      riskLevel: 'Средний',
      affectedQuantity: 4,
    });
    addProblemRecovery(context, roots[0], reportIndex, user, plusHours(plusDays(reportDate, -1), 8), 2);
  } else if (reportIndex === 8) {
    addQuarantine(context, roots[0], reportIndex, user, plusDays(reportDate, -1));
    addSale(context, roots[3], reportIndex, user, plusHours(plusDays(reportDate, -1), 4), 2);
  } else {
    addContamination(context, roots[0], reportIndex, user, plusDays(reportDate, -2));
    addLossOperation(context, roots[1], reportIndex, user, plusDays(reportDate, -1), 'discard', 1, 'Списаны ослабленные растения после отбора.');
    addSale(context, roots[5], reportIndex, user, plusHours(plusDays(reportDate, -1), 6), 2);
  }

  return cards.map((card) => refreshCard(card));
}

async function buildZipReport(cards, meta) {
  const zip = new JSZip();
  const report = await buildAdminReportSnapshot(cards, {
    appVersion,
    currentEmployee: meta.employee,
    currentUser: {
      id: meta.employee.localUserId,
      role: meta.employee.role,
    },
    deviceId: meta.deviceId,
    reportCreatedAt: meta.createdAt,
    reportId: meta.reportId,
    testLocation: meta.testLocation,
  }, {
    addFile(relativeFileName, sourceUri) {
      try {
        zip.file(relativeFileName, fs.readFileSync(sourceUri));
        return true;
      } catch {
        return false;
      }
    },
  });

  zip.file('report.json', JSON.stringify(report, null, 2));

  return {
    report,
    zipBuffer: await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    }),
  };
}

function buildGoldenCards(context) {
  const user = EMPLOYEES[0];
  const cards = buildEmployeeReportCards(context, 0, user);
  const plantingRoot = cards.find((card) => !card.parentCardId && card.stage === stages[5]);

  if (plantingRoot) {
    addSale(context, plantingRoot, 0, user, new Date(Date.UTC(2026, 6, 30, 12, 0, 0)), 2);
  }

  return cards.map((card) => refreshCard(card));
}

function enumerateCards(reportEntries) {
  return reportEntries.flatMap((entry) => entry.report.cards || []);
}

function enumerateEvents(reportEntries) {
  return enumerateCards(reportEntries).flatMap((card) => card.events || []);
}

function validateNoForbiddenKeys(value, pathLabel = 'report') {
  if (!value || typeof value !== 'object') {
    return;
  }

  Object.entries(value).forEach(([key, item]) => {
    assert(!FORBIDDEN_LEGACY_KEYS.includes(key), `${pathLabel} contains forbidden legacy key ${key}`);
    if (item && typeof item === 'object') {
      validateNoForbiddenKeys(item, `${pathLabel}.${key}`);
    }
  });
}

function recomputeCurrentQuantity(card) {
  return (card.events || []).reduce((quantity, event) => {
    if (['sale', 'death', 'discard', 'introLoss'].includes(event.type)) {
      return Math.max(quantity - (Number(event.count) || 0), 0);
    }

    if (event.type === 'propagation' && !event.childCardId) {
      return quantity + (Number(event.count) || 0);
    }

    if (event.type === 'problemIsolation') {
      return Math.max(quantity - (Number(event.count || event.quantity) || 0), 0);
    }

    return quantity;
  }, Number(card.quantity) || 0);
}

function validateParentChildGraph(cards) {
  const byId = new Map(cards.map((card) => [card.cardId, card]));
  const codes = new Set();
  const ids = new Set();

  cards.forEach((card) => {
    assert(card.cardId && !ids.has(card.cardId), `Duplicate or empty cardId: ${card.cardId}`);
    ids.add(card.cardId);
    assert(card.code && !codes.has(card.code), `Duplicate or empty code: ${card.code}`);
    codes.add(card.code);

    if (card.parentCardId) {
      assert(byId.has(card.parentCardId), `Missing parentCardId target: ${card.parentCardId}`);
    }
  });

  cards.forEach((card) => {
    const visited = new Set([card.cardId]);
    let currentParentId = card.parentCardId;

    while (currentParentId) {
      assert(!visited.has(currentParentId), `Cycle detected at ${card.cardId}`);
      visited.add(currentParentId);
      currentParentId = byId.get(currentParentId)?.parentCardId || '';
    }
  });
}

function validateArchives(entries) {
  return Promise.all(entries.map(async (entry) => {
    const zip = await JSZip.loadAsync(entry.zipBuffer);
    assert(zip.file('report.json'), `${entry.fileName} is missing report.json`);
    const reportJson = await zip.file('report.json').async('string');
    const report = JSON.parse(reportJson);

    report.cards.forEach((card) => {
      (card.events || []).forEach((event) => {
        (event.photoFiles || []).forEach((photoPath) => {
          assert(zip.file(photoPath), `${entry.fileName} is missing ${photoPath}`);
        });
      });

      const startPhotoFiles = card.extraFields?.startPhotoFiles || [];
      startPhotoFiles.forEach((photoPath) => {
        assert(zip.file(photoPath), `${entry.fileName} is missing ${photoPath}`);
      });
    });
  }));
}

function validateRealisticReportBundle(bundle) {
  const employeeReports = bundle.employeeReports || [];
  const goldenReport = bundle.goldenReport || null;

  assert(employeeReports.length === REPORT_COUNT, `Expected ${REPORT_COUNT} employee reports`);
  assert(goldenReport, 'Golden report is missing');

  employeeReports.forEach(({ report }) => validateNoForbiddenKeys(report));
  validateNoForbiddenKeys(goldenReport.report, 'goldenReport');

  const users = new Set(employeeReports.map(({ report }) => report.user.userId));
  assert(users.size === REPORT_COUNT, 'Employee reports must belong to unique users');

  const allCards = enumerateCards(employeeReports);
  const allEvents = enumerateEvents(employeeReports);
  const stageSet = new Set(allCards.map((card) => card.stage));
  const operationTypeSet = new Set(allEvents.map((event) => event.type));
  const rootPlantSet = new Set();

  stages.forEach((stage) => assert(stageSet.has(stage), `Missing stage coverage for ${stage}`));
  getSupportedReportOperationTypes().forEach((type) => {
    assert(operationTypeSet.has(type), `Missing operation coverage for ${type}`);
  });

  employeeReports.forEach(({ report }) => {
    report.cards.forEach((card) => {
      assert(recomputeCurrentQuantity(card) === Number(card.currentQuantity), `Invalid currentQuantity for ${card.cardId}`);
      assert(Number(card.currentQuantity) >= 0, `Negative currentQuantity for ${card.cardId}`);
      assert(Number(card.activeProblemQuantity) >= 0, `Negative activeProblemQuantity for ${card.cardId}`);
      assert(Number(card.healthyQuantity) === Number(card.currentQuantity) - Number(card.activeProblemQuantity), `Invalid healthyQuantity for ${card.cardId}`);

      if (!card.parentCardId) {
        const plantKey = `${card.cultureName}|${card.speciesName}|${card.varietyName}`;
        assert(!rootPlantSet.has(plantKey), `Duplicate root plant across reports: ${plantKey}`);
        rootPlantSet.add(plantKey);
      }
    });
  });

  validateParentChildGraph(allCards);

  const enumCoverage = {
    completionResult: new Set(allEvents.map((event) => event.extraFields?.completionResult || event.extraFields?.completionResult).filter(Boolean)),
    hardeningCareType: new Set(allEvents.filter((event) => event.type === 'hardeningCare').map((event) => event.extraFields?.careType || event.extraFields?.careType).filter(Boolean)),
    hardeningProblemType: new Set(allEvents.filter((event) => event.stage === stages[4] && event.type === 'problem').map((event) => event.problemType).filter(Boolean)),
    introProblemType: new Set(allEvents.filter((event) => event.stage === INTRO_STAGE && event.type === 'problem').map((event) => event.problemType).filter(Boolean)),
    plantingCareType: new Set(allEvents.filter((event) => event.type === 'plantingCare').map((event) => event.extraFields?.careType || event.extraFields?.careType).filter(Boolean)),
    plantingProblemType: new Set(allEvents.filter((event) => event.stage === stages[5] && event.type === 'problem').map((event) => event.problemType).filter(Boolean)),
    readinessForPlanting: new Set(allEvents.filter((event) => event.type === 'hardeningObservation').map((event) => event.extraFields?.readinessForPlanting || event.extraFields?.readinessForPlanting).filter(Boolean)),
    riskLevel: new Set(allEvents.map((event) => event.riskLevel).filter(Boolean)),
    survivalRate: new Set(allEvents.filter((event) => event.type === 'plantingObservation').map((event) => event.extraFields?.survivalRate || event.extraFields?.survivalRate).filter(Boolean)),
    turgor: new Set(allEvents.flatMap((event) => [event.extraFields?.turgor]).filter(Boolean)),
  };

  Object.entries(requiredReportEnumCoverage).forEach(([key, values]) => {
    values.forEach((value) => assert(enumCoverage[key].has(value), `Missing enum coverage for ${key}: ${value}`));
  });

  const clonedChildren = allCards.filter((card) => card.originType === 'cloned');
  const isolationChildren = allCards.filter((card) => card.originType === 'problemIsolation');
  const fullIsolationExists = allEvents.some((event) => event.type === 'problemIsolation' && Number(event.count) === 8);
  const partialIsolationExists = allEvents.some((event) => event.type === 'problemIsolation' && Number(event.count) < 8);
  const recoveryExists = allEvents.some((event) => event.type === 'problemRecovery');
  const multipleProblemHistoryExists = allCards.some((card) => (card.events || []).filter((event) => event.type === 'problem').length >= 2);

  assert(clonedChildren.length > 0, 'Missing cloned child scenario');
  assert(isolationChildren.length > 0, 'Missing problem isolation child scenario');
  assert(fullIsolationExists, 'Missing full isolation scenario');
  assert(partialIsolationExists, 'Missing partial isolation scenario');
  assert(recoveryExists, 'Missing problem recovery scenario');
  assert(multipleProblemHistoryExists, 'Missing multiple problem history scenario');

  const comments = new Set();
  allEvents.forEach((event) => {
    if (!event.comment) {
      return;
    }

    assert(!comments.has(event.comment), `Duplicate event comment detected: ${event.comment}`);
    comments.add(event.comment);
  });

  const goldenCards = goldenReport.report.cards || [];
  assert(goldenCards.some((card) => card.originType === 'cloned'), 'Golden report is missing cloned child');
  assert(goldenCards.some((card) => card.originType === 'problemIsolation'), 'Golden report is missing isolation child');
  assert(goldenCards.some((card) => (card.events || []).some((event) => event.type === 'plantingCompletion')), 'Golden report is missing completed planting');
  assert(goldenCards.some((card) => card.batchStatus === 'problem'), 'Golden report is missing active problem');
  assert(goldenCards.some((card) => card.batchStatus === 'partial' || card.batchStatus === 'sold'), 'Golden report is missing sale or partial state');

  return {
    enumCoverage,
    operationTypesCovered: operationTypeSet,
    stagesCovered: stageSet,
  };
}

async function writeBundle(bundle) {
  ensureDir(outputDir);
  cleanupOutputDirectory();

  for (const entry of bundle.employeeReports) {
    entry.filePath = path.join(outputDir, entry.fileName);
    fs.writeFileSync(entry.filePath, entry.zipBuffer);
  }

  bundle.goldenReport.filePath = path.join(outputDir, bundle.goldenReport.fileName);
  fs.writeFileSync(bundle.goldenReport.filePath, bundle.goldenReport.zipBuffer);
}

function buildSummary(bundle, validation) {
  const employeeCards = enumerateCards(bundle.employeeReports);
  const employeeEvents = enumerateEvents(bundle.employeeReports);
  const clonedCount = employeeCards.filter((card) => card.originType === 'cloned').length;
  const isolationCount = employeeCards.filter((card) => card.originType === 'problemIsolation').length;
  const rootCount = employeeCards.filter((card) => !card.parentCardId).length;

  return {
    clonedCount,
    goldenReportsCreated: 1,
    isolationCount,
    operationTypesCovered: validation.operationTypesCovered.size,
    reportCount: bundle.employeeReports.length,
    rootCount,
    stagesCovered: validation.stagesCovered.size,
    totalCards: employeeCards.length,
    totalEvents: employeeEvents.length,
  };
}

async function buildRealisticReportBundle(options = {}) {
  const context = createContext(options.seed);
  const employeeReports = [];

  for (let reportIndex = 0; reportIndex < REPORT_COUNT; reportIndex += 1) {
    const employee = EMPLOYEES[reportIndex];
    const cards = buildEmployeeReportCards(context, reportIndex, employee);
    const createdAt = new Date(Date.UTC(2026, 6, 15 + reportIndex, 14, 30, 0)).toISOString();
    const reportId = `report-realistic-${String(reportIndex + 1).padStart(2, '0')}`;
    const deviceId = `device-realistic-${String(reportIndex + 1).padStart(2, '0')}`;
    const built = await buildZipReport(cards, {
      createdAt,
      deviceId,
      employee,
      reportId,
      testLocation: `Sadovnik Demo Zone ${reportIndex + 1}`,
    });
    employeeReports.push({
      ...built,
      fileName: `sadovnik-realistic-report-${String(reportIndex + 1).padStart(2, '0')}-${employee.localUserId}.zip`,
    });
  }

  const goldenCards = buildGoldenCards(createContext(`${context.seed}-golden`));
  const goldenEmployee = EMPLOYEES[0];
  const goldenReport = await buildZipReport(goldenCards, {
    createdAt: new Date(Date.UTC(2026, 6, 31, 10, 0, 0)).toISOString(),
    deviceId: 'device-golden-report',
    employee: goldenEmployee,
    reportId: 'report-golden-integration',
    testLocation: 'Sadovnik Golden Integration Fixture',
  });

  return {
    employeeReports,
    goldenReport: {
      ...goldenReport,
      fileName: GOLDEN_REPORT_FILE,
    },
    seed: context.seed,
  };
}

async function generateRealisticReports(options = {}) {
  const bundle = await buildRealisticReportBundle(options);
  await validateArchives([...bundle.employeeReports, bundle.goldenReport]);
  const validation = validateRealisticReportBundle(bundle);
  await writeBundle(bundle);
  const summary = buildSummary(bundle, validation);

  return {
    bundle,
    summary,
    validation,
  };
}

module.exports = {
  buildRealisticReportBundle,
  generateRealisticReports,
  outputDir,
  validateRealisticReportBundle,
};
