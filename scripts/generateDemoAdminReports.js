const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const projectRoot = path.resolve(__dirname, '..');
const photoDir = path.join(projectRoot, 'docs', 'photo');
const reportsDir = path.join(projectRoot, 'docs', 'reports');
const appVersion = require(path.join(projectRoot, 'package.json')).version || '';
const catalogPath = path.join(projectRoot, 'data', 'plantsCatalog.js');

const INTRO_STAGE = 'Введение в культуру';
const STAGES = [INTRO_STAGE, 'Клонирование', 'Адаптация', 'Теплица', 'Закалка', 'Высадка'];
const INITIAL_BATCHES_PER_STAGE = 9;
const ADDED_BATCHES_PER_STAGE = 1;
const TOTAL_INITIAL_BATCHES = STAGES.length * INITIAL_BATCHES_PER_STAGE;
const TOTAL_FINAL_BATCHES = TOTAL_INITIAL_BATCHES + STAGES.length * ADDED_BATCHES_PER_STAGE;
const REPORT_DATES = Array.from({ length: 10 }, (_, index) => new Date(Date.UTC(2026, 5, 10 + index, 18, 45)));

const USERS = [
  ['demo-user-001', 'Иван', 'Петров', 'Агроном'],
  ['demo-user-002', 'Мария', 'Иванова', 'Лаборант'],
  ['demo-user-003', 'Алексей', 'Сидоров', 'Технолог'],
  ['demo-user-004', 'Елена', 'Смирнова', 'Сотрудник теплицы'],
  ['demo-user-005', 'Ильдар', 'Унайбеков', 'Администратор'],
  ['demo-user-006', 'Анна', 'Ковалева', 'Агроном'],
  ['demo-user-007', 'Сергей', 'Мельников', 'Лаборант'],
  ['demo-user-008', 'Ирина', 'Федорова', 'Технолог'],
  ['demo-user-009', 'Павел', 'Соколов', 'Сотрудник теплицы'],
  ['demo-user-010', 'Светлана', 'Николаева', 'Администратор'],
].map(([userId, firstName, lastName, role]) => ({ userId, firstName, lastName, displayName: `${firstName} ${lastName}`, role }));

const STAGE_LOCATIONS = {
  [INTRO_STAGE]: ['Лаборатория, стеллаж Л-1', 'Лаборатория, стеллаж Л-2', 'Лаборатория, карантинный бокс'],
  Клонирование: ['Лаборатория клонирования, стеллаж К-1', 'Лаборатория клонирования, стеллаж К-3'],
  Адаптация: ['Зона адаптации, стол А-2', 'Зона адаптации, стеллаж А-5'],
  Теплица: ['Теплица 1, стеллаж B, полка 3', 'Теплица 2, стол T-4'],
  Закалка: ['Площадка закалки, сектор 2', 'Площадка закалки, сектор 4'],
  Высадка: ['Участок 1, грядка A-3', 'Участок 2, грядка C-1'],
};

const EVENT_TITLES = {
  batchCreated: 'Создание партии',
  qrGenerated: 'QR-код сформирован',
  stageChange: 'Изменение стадии',
  comment: 'Комментарий',
  contamination: 'Контаминация',
  introLoss: 'Потери',
  movement: 'Перемещение',
  quarantine: 'Карантин',
  problem: 'Проблема',
  rooting: 'Укоренение',
  death: 'Гибель',
  discard: 'Выбраковка',
  sale: 'Продажа',
  propagation: 'Размножение',
  adaptationStress: 'Наблюдение',
  adaptationCare: 'Уход',
  greenhouseObservation: 'Наблюдение',
  greenhouseCare: 'Уход',
  hardeningObservation: 'Наблюдение',
  hardeningCare: 'Уход',
  planting: 'Высадка',
  plantingObservation: 'Наблюдение',
  plantingCare: 'Уход',
  plantingCompletion: 'Завершение',
  transplant: 'Пересадка',
};

const REAL_EVENT_TYPES = Object.keys(EVENT_TITLES);
const QUANTITY_DECREASE_TYPES = new Set(['sale', 'death', 'discard', 'introLoss']);
const PROBLEM_TYPES = new Set(['problem', 'contamination', 'quarantine']);
const LEGACY_FORBIDDEN_KEYS = ['photoNote', 'startPhotoNote', 'statusChange'];
const SNAPSHOT_DEVICE_ID = 'device-demo-nursery-snapshot';

const CARE_VARIANTS = ['полив', 'подкормка', 'антистрессовая обработка', 'профилактика', 'регулировка влажности'];
const PROBLEM_VARIANTS = ['Контаминация', 'Болезнь', 'Вредители', 'Стресс', 'Ожоги', 'Увядание', 'Погодный стресс', 'Карантин', 'Другое'];
const RISK_LEVELS = ['Низкий', 'Средний', 'Высокий', 'Критический'];

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Demo report validation failed: ${message}`);
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function iso(value) {
  return new Date(value).toISOString();
}

function reportTime(reportIndex, hour, minute = 0) {
  return iso(Date.UTC(2026, 5, 10 + reportIndex, hour, minute));
}

function historyTime(dayOffset, hour, minute = 0) {
  return iso(Date.UTC(2026, 3, 28 + dayOffset, hour, minute));
}

function ensureDir(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function cleanupOldDemoReports() {
  if (!fs.existsSync(reportsDir)) {
    return;
  }
  fs.readdirSync(reportsDir)
    .filter((name) => /^sadovnik-demo-report-.*\.zip$/i.test(name))
    .forEach((name) => fs.rmSync(path.join(reportsDir, name), {
      force: true,
      maxRetries: 10,
      retryDelay: 250,
    }));
}

function loadPhotoPool() {
  assert(fs.existsSync(photoDir), `photo directory is missing: ${photoDir}`);
  const files = fs.readdirSync(photoDir)
    .map((name) => path.join(photoDir, name))
    .filter((filePath) => /\.(jpe?g|png|webp)$/i.test(filePath))
    .sort((left, right) => left.localeCompare(right, 'ru'));
  assert(files.length > 0, 'no source photos were found');
  return files;
}

function loadUniqueCultures() {
  const source = fs.readFileSync(catalogPath, 'utf8')
    .replace(/export default plantsCatalog;?\s*$/, '');
  const catalog = new Function(`${source}\nreturn plantsCatalog;`)();
  const seen = new Set();
  const cultures = catalog.filter((plant) => {
    const key = [plant.cultureName, plant.speciesName, plant.varietyName].map((value) => `${value || ''}`.trim()).join('|');
    if (!plant.cultureName || !plant.speciesName || !plant.varietyName || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  assert(cultures.length >= TOTAL_FINAL_BATCHES, `catalog has only ${cultures.length} unique cultures`);
  return cultures.slice(0, TOTAL_FINAL_BATCHES);
}

function stageLocation(stage, index) {
  const locations = STAGE_LOCATIONS[stage];
  assert(locations, `unknown stage: ${stage}`);
  return locations[index % locations.length];
}

function createWorld(photoPool) {
  return {
    cards: new Map(),
    photoPool,
    photoCursor: 0,
    eventSequence: 0,
    cardIdBase: Date.UTC(2026, 3, 20, 8, 0, 0),
    reportIdBase: Date.UTC(2026, 5, 10, 18, 45, 0),
  };
}

function getUser(reportIndex) {
  return USERS[reportIndex % USERS.length];
}

function nextEventId(world, card, type) {
  if (type === 'batchCreated') {
    return `batch-created-${card.cardId}`;
  }
  if (type === 'qrGenerated') {
    return `qr-generated-${card.cardId}`;
  }
  world.eventSequence += 1;
  return `event-${world.reportIdBase}-${String(world.eventSequence).padStart(5, '0')}`;
}

function makeComment(card, type, reportIndex, text) {
  return `${text} ${card.cultureName} ${card.speciesName} ${card.varietyName}; партия ${card.code}; контроль ${reportIndex + 1}.`;
}

function shouldAttachPhoto(type, eventIndex) {
  return [
    'contamination',
    'quarantine',
    'problem',
    'movement',
    'greenhouseObservation',
    'greenhouseCare',
    'transplant',
    'hardeningObservation',
    'planting',
    'plantingObservation',
    'plantingCare',
    'plantingCompletion',
  ].includes(type) || eventIndex % 5 === 0;
}

function getProblemStatus(event) {
  if (event.type === 'quarantine') {
    return 'quarantine';
  }
  if (event.type === 'contamination') {
    return 'problem';
  }
  if (event.type === 'problem' && event.problemType === 'Карантин') {
    return 'quarantine';
  }
  if (event.type === 'problem' && event.problemType) {
    return 'problem';
  }
  return '';
}

function getHealthyQuantity(card) {
  return Math.max((Number(card.currentQuantity) || 0) - (Number(card.activeProblemQuantity) || 0), 0);
}

function getAffectedQuantity(card, spec) {
  if (spec.type !== 'problem') {
    return 0;
  }

  const healthyQuantity = getHealthyQuantity(card);
  const requestedQuantity = Number(spec.affectedQuantity) || Math.max(1, Math.round((Number(card.currentQuantity) || 0) * 0.08));

  return Math.min(requestedQuantity, healthyQuantity);
}

function applyEvent(world, card, spec) {
  assert(card, `cannot add ${spec.type} to missing card`);
  assert(REAL_EVENT_TYPES.includes(spec.type), `unknown event type: ${spec.type}`);

  const previousQuantity = Number(card.currentQuantity) || 0;
  const affectedQuantity = getAffectedQuantity(card, spec);
  const event = {
    eventId: nextEventId(world, card, spec.type),
    type: spec.type,
    title: spec.title || EVENT_TITLES[spec.type],
    stage: spec.stage || card.stage,
    date: spec.date,
    createdAt: spec.createdAt || spec.date,
    createdBy: spec.createdBy,
    comment: spec.comment || '',
    photoFiles: [],
    problemType: spec.problemType || '',
    riskLevel: spec.riskLevel || '',
    affectedQuantity,
    count: Number(spec.count) || 0,
    previousQuantity,
    currentQuantity: previousQuantity,
    extraFields: {},
  };

  if (spec.photo) {
    event._photoSourceIndex = world.photoCursor % world.photoPool.length;
    world.photoCursor += 1;
  }

  if (QUANTITY_DECREASE_TYPES.has(event.type)) {
    const maxDecreaseQuantity = event.type === 'sale' ? getHealthyQuantity(card) : previousQuantity;
    event.count = Math.min(event.count, maxDecreaseQuantity);
    event.currentQuantity = previousQuantity - event.count;
    card.currentQuantity = event.currentQuantity;
    card.activeProblemQuantity = Math.min(Number(card.activeProblemQuantity) || 0, card.currentQuantity);
    if (event.type === 'sale' && !['problem', 'quarantine'].includes(card.batchStatus)) {
      card.batchStatus = event.currentQuantity === 0 ? 'sold' : 'partial';
    }
  } else if (event.type === 'propagation') {
    event.currentQuantity = previousQuantity + event.count;
    card.currentQuantity = event.currentQuantity;
  } else if (event.type === 'stageChange') {
    const fromStage = spec.fromStage || card.stage;
    const toStage = spec.toStage;
    assert(fromStage === card.stage, `${card.cardId} has invalid source stage`);
    assert(STAGES.indexOf(toStage) === STAGES.indexOf(card.stage) + 1, `${card.cardId} skips a stage`);
    event.stage = toStage;
    card.stage = toStage;
    card.locationDescription = stageLocation(toStage, card.index);
  } else if (event.type === 'movement') {
    card.locationDescription = spec.nextLocation || stageLocation(card.stage, card.index + 1);
  } else if (event.type === 'plantingCompletion') {
    card.batchStatus = 'archived';
  } else {
    const problemStatus = getProblemStatus(event);
    if (problemStatus) {
      card.batchStatus = problemStatus;
      if (event.type === 'problem') {
        card.activeProblemQuantity = Math.min(
          (Number(card.activeProblemQuantity) || 0) + affectedQuantity,
          Number(card.currentQuantity) || 0,
        );
      }
    }
    if (event.type === 'contamination' || event.problemType === 'Контаминация') {
      card.sterilityStatus = 'contaminated';
    }
  }

  card.healthyQuantity = getHealthyQuantity(card);
  card.events.push(event);
  card.updatedAt = event.createdAt;
  return event;
}

function createCard(world, culture, index, targetStageIndex, reportIndex, createdAt) {
  const user = getUser(reportIndex);
  const quantity = 72 + (index % 8) * 11;
  const card = {
    cardId: `${world.cardIdBase + index}`,
    code: `VK-2026-${String(index + 1).padStart(4, '0')}`,
    cultureName: culture.cultureName,
    speciesName: culture.speciesName,
    varietyName: culture.varietyName,
    stage: INTRO_STAGE,
    batchStatus: 'active',
    sterilityStatus: index % 7 === 0 ? 'sterile' : 'unchecked',
    quantity,
    currentQuantity: quantity,
    activeProblemQuantity: 0,
    healthyQuantity: quantity,
    locationDescription: stageLocation(INTRO_STAGE, index),
    createdAt,
    updatedAt: createdAt,
    events: [],
    index,
  };

  world.cards.set(card.cardId, card);
  applyEvent(world, card, {
    type: 'batchCreated',
    stage: INTRO_STAGE,
    date: createdAt,
    createdBy: user.userId,
    comment: makeComment(card, 'batchCreated', reportIndex, 'Партия заведена после входного осмотра исходного материала.'),
  });
  applyEvent(world, card, {
    type: 'qrGenerated',
    stage: INTRO_STAGE,
    date: iso(new Date(createdAt).getTime() + 30 * 60 * 1000),
    createdBy: user.userId,
    comment: makeComment(card, 'qrGenerated', reportIndex, 'Маркировка подготовлена для прослеживаемости в журнале.'),
  });

  for (let stageIndex = 1; stageIndex <= targetStageIndex; stageIndex += 1) {
    const fromStage = card.stage;
    const toStage = STAGES[stageIndex];
    applyEvent(world, card, {
      type: 'stageChange',
      fromStage,
      toStage,
      date: historyTime(stageIndex + Math.floor(index / INITIAL_BATCHES_PER_STAGE), 9, index % 50),
      createdBy: user.userId,
      photo: (index + stageIndex) % 3 === 0,
      comment: makeComment(card, 'stageChange', reportIndex, `Переход выполнен из стадии «${fromStage}» в «${toStage}» после контрольного осмотра.`),
    });
    applyEvent(world, card, {
      type: 'movement',
      stage: card.stage,
      date: historyTime(stageIndex + Math.floor(index / INITIAL_BATCHES_PER_STAGE), 10, index % 50),
      createdBy: user.userId,
      nextLocation: stageLocation(card.stage, index),
      photo: (index + stageIndex) % 4 === 0,
      comment: makeComment(card, 'movement', reportIndex, `Партия размещена на рабочей локации стадии «${card.stage}».`),
    });
  }

  return card;
}

function seedInitialCards(world, cultures) {
  cultures.slice(0, TOTAL_INITIAL_BATCHES).forEach((culture, index) => {
    const targetStageIndex = Math.floor(index / INITIAL_BATCHES_PER_STAGE);
    createCard(world, culture, index, targetStageIndex, 0, historyTime(0, 8, index % 50));
  });
}

function addNewStageCards(world, cultures, reportIndex) {
  const offset = TOTAL_INITIAL_BATCHES;
  STAGES.forEach((stage, stageIndex) => {
    const index = offset + stageIndex;
    createCard(world, cultures[index], index, stageIndex, reportIndex, reportTime(reportIndex, 8, stageIndex * 4));
  });
}

function cardsByStage(world, stage) {
  return [...world.cards.values()].filter((card) => card.stage === stage);
}

function pickCard(world, stage, offset) {
  const cards = cardsByStage(world, stage).filter((card) => card.currentQuantity > 0);
  assert(cards.length > 0, `no active cards for stage ${stage}`);
  return cards[offset % cards.length];
}

function addTypedEvent(world, reportIndex, stage, offset, spec) {
  const card = pickCard(world, stage, offset);
  const eventIndex = card.events.length + reportIndex + offset;
  applyEvent(world, card, {
    ...spec,
    stage,
    date: reportTime(reportIndex, 9 + (offset % 8), (offset * 7) % 55),
    createdBy: getUser(reportIndex).userId,
    photo: spec.photo ?? shouldAttachPhoto(spec.type, eventIndex),
    comment: spec.comment || makeComment(card, spec.type, reportIndex, spec.text),
  });
}

function addCoverageEvents(world, reportIndex) {
  let offset = reportIndex * 11;

  addTypedEvent(world, reportIndex, INTRO_STAGE, offset += 1, {
    type: 'comment',
    text: 'После ревизии отмечена ровная окраска эксплантов, среда прозрачная, рост без отклонений.',
  });
  addTypedEvent(world, reportIndex, INTRO_STAGE, offset += 1, {
    type: 'contamination',
    problemType: 'Контаминация',
    riskLevel: RISK_LEVELS[(reportIndex + 2) % RISK_LEVELS.length],
    text: 'В одной пробирке отмечено помутнение среды, партия оставлена на отдельном контроле.',
  });
  addTypedEvent(world, reportIndex, INTRO_STAGE, offset += 1, {
    type: 'introLoss',
    count: 1 + (reportIndex % 3),
    text: 'Списаны нежизнеспособные экспланты после первичной выбраковки.',
  });
  addTypedEvent(world, reportIndex, INTRO_STAGE, offset += 1, {
    type: 'movement',
    nextLocation: stageLocation(INTRO_STAGE, offset),
    text: 'Материал переставлен в чистый бокс для раздельного наблюдения.',
  });
  addTypedEvent(world, reportIndex, INTRO_STAGE, offset += 1, {
    type: 'quarantine',
    problemType: 'Карантин',
    riskLevel: RISK_LEVELS[(reportIndex + 1) % RISK_LEVELS.length],
    text: 'Партия временно изолирована до повторного микробиологического контроля.',
  });
  addTypedEvent(world, reportIndex, INTRO_STAGE, offset += 1, {
    type: 'problem',
    problemType: PROBLEM_VARIANTS[reportIndex % PROBLEM_VARIANTS.length],
    riskLevel: RISK_LEVELS[reportIndex % RISK_LEVELS.length],
    text: 'Зафиксировано отклонение на старте культуры, назначен повторный осмотр.',
  });

  addTypedEvent(world, reportIndex, STAGES[1], offset += 1, {
    type: 'rooting',
    count: 38 + (reportIndex % 9),
    text: 'Укоренение идёт равномерно, корни светлые, без признаков некроза.',
  });
  addTypedEvent(world, reportIndex, STAGES[1], offset += 1, {
    type: 'propagation',
    count: 6 + (reportIndex % 5),
    text: 'После деления получены дополнительные жизнеспособные розетки.',
  });
  addTypedEvent(world, reportIndex, STAGES[1], offset += 1, {
    type: 'sale',
    count: 3 + (reportIndex % 4),
    text: 'Часть партии передана постоянному покупателю после контроля качества.',
  });
  addTypedEvent(world, reportIndex, STAGES[1], offset += 1, {
    type: 'death',
    count: 1 + (reportIndex % 2),
    text: 'Списаны единичные растения после стресса на укоренении.',
  });
  addTypedEvent(world, reportIndex, STAGES[1], offset += 1, {
    type: 'discard',
    count: 1,
    text: 'Удалены растения с отставанием по размеру и слабой точкой роста.',
  });

  addTypedEvent(world, reportIndex, STAGES[2], offset += 1, {
    type: 'adaptationStress',
    riskLevel: RISK_LEVELS[(reportIndex + 2) % RISK_LEVELS.length],
    text: 'После снятия укрытия тургор частично снижен, восстановление идёт постепенно.',
  });
  addTypedEvent(world, reportIndex, STAGES[2], offset += 1, {
    type: 'adaptationCare',
    text: `Проведён уход: ${CARE_VARIANTS[(reportIndex + 1) % CARE_VARIANTS.length]}, реакция растений стабильная.`,
  });
  addTypedEvent(world, reportIndex, STAGES[2], offset += 1, {
    type: 'sale',
    count: 2 + (reportIndex % 3),
    text: 'Отобран устойчивый материал для частичной реализации после адаптации.',
  });

  addTypedEvent(world, reportIndex, STAGES[3], offset += 1, {
    type: 'greenhouseObservation',
    riskLevel: RISK_LEVELS[reportIndex % RISK_LEVELS.length],
    text: 'В теплице прирост равномерный, окраска листьев соответствует сорту.',
  });
  addTypedEvent(world, reportIndex, STAGES[3], offset += 1, {
    type: 'greenhouseCare',
    riskLevel: RISK_LEVELS[(reportIndex + 1) % RISK_LEVELS.length],
    text: `Выполнен уход: ${CARE_VARIANTS[(reportIndex + 2) % CARE_VARIANTS.length]}, влажность субстрата выровнена.`,
  });
  addTypedEvent(world, reportIndex, STAGES[3], offset += 1, {
    type: 'transplant',
    count: 8 + (reportIndex % 5),
    text: 'Партия рассажена свободнее, густота снижена для лучшей вентиляции.',
  });
  addTypedEvent(world, reportIndex, STAGES[3], offset += 1, {
    type: 'problem',
    problemType: PROBLEM_VARIANTS[(reportIndex + 2) % PROBLEM_VARIANTS.length],
    riskLevel: RISK_LEVELS[(reportIndex + 3) % RISK_LEVELS.length],
    text: 'На отдельных растениях замечено отклонение, назначена точечная обработка.',
  });

  addTypedEvent(world, reportIndex, STAGES[4], offset += 1, {
    type: 'hardeningObservation',
    riskLevel: RISK_LEVELS[(reportIndex + 1) % RISK_LEVELS.length],
    text: 'Закалка проходит без резких провалов тургора, требуется плавное увеличение проветривания.',
  });
  addTypedEvent(world, reportIndex, STAGES[4], offset += 1, {
    type: 'hardeningCare',
    text: `Проведена ${CARE_VARIANTS[(reportIndex + 3) % CARE_VARIANTS.length]}, растения оставлены под вечерний контроль.`,
  });
  addTypedEvent(world, reportIndex, STAGES[4], offset += 1, {
    type: 'problem',
    problemType: PROBLEM_VARIANTS[(reportIndex + 4) % PROBLEM_VARIANTS.length],
    riskLevel: RISK_LEVELS[(reportIndex + 2) % RISK_LEVELS.length],
    text: 'После яркого солнца выявлены признаки стресса, партия перенесена в мягкий режим.',
  });

  addTypedEvent(world, reportIndex, STAGES[5], offset += 1, {
    type: 'planting',
    text: 'Высадка выполнена по схеме с сохранением кома, почва предварительно увлажнена.',
  });
  addTypedEvent(world, reportIndex, STAGES[5], offset += 1, {
    type: 'plantingObservation',
    riskLevel: RISK_LEVELS[reportIndex % RISK_LEVELS.length],
    text: 'После высадки листья держат тургор, признаки подвядания единичные.',
  });
  addTypedEvent(world, reportIndex, STAGES[5], offset += 1, {
    type: 'plantingCare',
    text: `После высадки выполнен ${CARE_VARIANTS[reportIndex % CARE_VARIANTS.length]}, реакция посадок ровная.`,
  });
  addTypedEvent(world, reportIndex, STAGES[5], offset += 1, {
    type: 'plantingCompletion',
    text: 'Партия закрыта как завершённая, растения переданы в эксплуатационный учёт.',
  });
  addTypedEvent(world, reportIndex, STAGES[5], offset += 1, {
    type: 'sale',
    count: 5 + (reportIndex % 6),
    text: 'Часть высаженного материала реализована после приёмки заказчиком.',
  });
}

function addSoldOutBatch(world, reportIndex) {
  const card = pickCard(world, STAGES[1], 7);
  applyEvent(world, card, {
    type: 'sale',
    stage: card.stage,
    count: card.currentQuantity,
    date: reportTime(reportIndex, 16, 40),
    createdBy: getUser(reportIndex).userId,
    photo: true,
    comment: makeComment(card, 'sale', reportIndex, 'Партия полностью реализована после финальной сверки количества и качества посадочного материала.'),
  });
}

function addDailyDelta(world, reportIndex) {
  const stage = STAGES[reportIndex % STAGES.length];
  const card = pickCard(world, stage, reportIndex + 5);
  const type = ['movement', 'problem', 'sale', 'greenhouseCare', 'hardeningObservation', 'plantingObservation'][reportIndex % 6];
  const safeType = stage === STAGES[3] ? type : (stage === STAGES[4] ? 'hardeningCare' : (stage === STAGES[5] ? 'plantingCare' : 'movement'));
  applyEvent(world, card, {
    type: safeType,
    stage,
    count: safeType === 'sale' ? 2 : 0,
    problemType: safeType === 'problem' ? PROBLEM_VARIANTS[(reportIndex + 5) % PROBLEM_VARIANTS.length] : '',
    riskLevel: RISK_LEVELS[(reportIndex + 1) % RISK_LEVELS.length],
    nextLocation: safeType === 'movement' ? stageLocation(stage, card.index + reportIndex) : undefined,
    date: reportTime(reportIndex, 17, 10 + reportIndex),
    createdBy: getUser(reportIndex).userId,
    photo: reportIndex % 2 === 0,
    comment: makeComment(card, safeType, reportIndex, 'Добавлена текущая запись смены: состояние сверено с предыдущим snapshot, расхождений по остатку нет.'),
  });
}

function publicEvent(event, photoPool) {
  const { _photoSourceIndex, ...sourceEvent } = clone(event);
  const result = {
    eventId: sourceEvent.eventId,
    type: sourceEvent.type,
    title: sourceEvent.title,
    stage: sourceEvent.stage,
    date: sourceEvent.date,
    createdAt: sourceEvent.createdAt,
    createdBy: sourceEvent.createdBy,
    comment: sourceEvent.comment,
    photoFiles: sourceEvent.photoFiles || [],
    problemType: sourceEvent.problemType || '',
    riskLevel: sourceEvent.riskLevel || '',
    affectedQuantity: Number(sourceEvent.affectedQuantity) || 0,
    count: Number(sourceEvent.count) || 0,
    previousQuantity: Number(sourceEvent.previousQuantity) || 0,
    currentQuantity: Number(sourceEvent.currentQuantity) || 0,
    extraFields: {},
  };
  if (_photoSourceIndex !== undefined) {
    const extension = path.extname(photoPool[_photoSourceIndex]).toLowerCase() || '.jpg';
    result.photoFiles = [`photos/${result.eventId}${extension}`];
  }
  return result;
}

function buildSummary(cards) {
  const summary = {
    cardsCount: cards.length,
    eventsCount: 0,
    photosCount: 0,
    problemsCount: 0,
    activeCount: 0,
    soldCount: 0,
    quarantineCount: 0,
    problemCount: 0,
    partialCount: 0,
    archivedCount: 0,
    lossCount: 0,
  };
  cards.forEach((card) => {
    summary.eventsCount += card.events.length;
    summary.photosCount += card.events.reduce((total, event) => total + event.photoFiles.length, 0);
    if (summary[`${card.batchStatus}Count`] !== undefined) {
      summary[`${card.batchStatus}Count`] += 1;
    }
    card.events.forEach((event) => {
      if (PROBLEM_TYPES.has(event.type)) {
        summary.problemsCount += 1;
      }
      if (['death', 'discard', 'introLoss'].includes(event.type)) {
        summary.lossCount += 1;
      }
    });
  });
  return summary;
}

function createSnapshot(world, reportIndex) {
  const cards = [...world.cards.values()].map((sourceCard) => {
    const { index, ...card } = clone(sourceCard);
    card.events = sourceCard.events.map((event) => publicEvent(event, world.photoPool));
    card.activeProblemQuantity = Math.min(Number(card.activeProblemQuantity) || 0, Number(card.currentQuantity) || 0);
    card.healthyQuantity = getHealthyQuantity(card);
    card.extraFields = {};
    return card;
  });
  const user = getUser(reportIndex);
  const report = {
    reportId: `report-${world.reportIdBase}-dmo${String(reportIndex + 1).padStart(3, '0')}`,
    createdAt: iso(REPORT_DATES[reportIndex]),
    appVersion,
    deviceId: SNAPSHOT_DEVICE_ID,
    user,
    testLocation: 'Демо-площадка Sadovnik Diary',
    summary: buildSummary(cards),
    cards,
  };
  Object.defineProperty(report, '_sourceCards', { value: world.cards, enumerable: false });
  return report;
}

async function buildZip(report, photoPool, filePath) {
  const zip = new JSZip();
  zip.folder('photos');
  report.cards.forEach((card) => card.events.forEach((event) => event.photoFiles.forEach((fileName) => {
    const originalEvent = report._sourceCards.get(card.cardId).events.find((item) => item.eventId === event.eventId);
    if (originalEvent?._photoSourceIndex !== undefined) {
      zip.file(fileName, fs.readFileSync(photoPool[originalEvent._photoSourceIndex]));
    }
  })));
  zip.file('report.json', JSON.stringify(report, null, 2));
  fs.writeFileSync(filePath, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } }));
}

function recalculateQuantity(card) {
  return card.events.reduce((quantity, event) => {
    if (QUANTITY_DECREASE_TYPES.has(event.type)) {
      return Math.max(quantity - event.count, 0);
    }
    if (event.type === 'propagation') {
      return quantity + event.count;
    }
    return quantity;
  }, card.quantity);
}

function validateNoForbiddenKeys(value, pathLabel = 'report') {
  if (!value || typeof value !== 'object') {
    return;
  }
  Object.entries(value).forEach(([key, item]) => {
    assert(!LEGACY_FORBIDDEN_KEYS.includes(key), `${pathLabel} contains legacy key ${key}`);
    if (item && typeof item === 'object') {
      validateNoForbiddenKeys(item, `${pathLabel}.${key}`);
    }
  });
}

function validateReports(reports) {
  assert(reports.length === 10, 'expected 10 reports');
  let previousCreatedAt = '';
  let previousEventIds = new Set();
  const commentsByEventId = new Map();

  reports.forEach((report, reportIndex) => {
    validateNoForbiddenKeys(report);
    assert(new Date(report.createdAt) > new Date(previousCreatedAt || 0), 'report timestamps are not sequential');
    assert(report.deviceId === SNAPSHOT_DEVICE_ID, `report ${reportIndex + 1} has invalid snapshot deviceId`);
    assert(report.cards.length >= TOTAL_INITIAL_BATCHES, `report ${reportIndex + 1} has too few cards`);
    assert(report.cards.length <= TOTAL_FINAL_BATCHES, `report ${reportIndex + 1} has too many cards`);

    const stageSet = new Set(report.cards.map((card) => card.stage));
    STAGES.forEach((stage) => assert(stageSet.has(stage), `report ${reportIndex + 1} misses stage ${stage}`));

    const typeSet = new Set(report.cards.flatMap((card) => card.events.map((event) => event.type)));
    REAL_EVENT_TYPES.forEach((type) => assert(typeSet.has(type), `report ${reportIndex + 1} misses event type ${type}`));

    const cultureKeys = new Set(report.cards.map((card) => `${card.cultureName}|${card.speciesName}|${card.varietyName}`));
    assert(cultureKeys.size === report.cards.length, `report ${reportIndex + 1} repeats a plant`);

    const reportEventIds = new Set();
    report.cards.forEach((card) => {
      assert(card.cardId && card.code && card.cultureName && card.speciesName && card.varietyName, `${card.cardId || 'card'} has empty identity fields`);
      assert(card.quantity >= 0 && card.currentQuantity >= 0, `${card.cardId} has negative quantity`);
      assert(card.activeProblemQuantity >= 0 && card.activeProblemQuantity <= card.currentQuantity, `${card.cardId} has invalid activeProblemQuantity`);
      assert(card.healthyQuantity === card.currentQuantity - card.activeProblemQuantity, `${card.cardId} has invalid healthyQuantity`);
      assert(recalculateQuantity(card) === card.currentQuantity, `${card.cardId} has invalid quantity`);
      card.events.forEach((event) => {
        assert(event.eventId && event.type && event.title && event.stage && event.date && event.createdAt && event.createdBy, `${card.cardId} has incomplete event`);
        assert(new Date(event.createdAt) <= new Date(report.createdAt), `${event.eventId} is newer than report`);
        assert(!reportEventIds.has(event.eventId), `duplicate eventId inside report ${reportIndex + 1}: ${event.eventId}`);
        reportEventIds.add(event.eventId);
        if (event.comment) {
          const existingComment = commentsByEventId.get(event.comment);
          assert(!existingComment || existingComment === event.eventId, `duplicate comment for different events: ${event.comment}`);
          commentsByEventId.set(event.comment, event.eventId);
        }
        if (event.type === 'problem') {
          assert(event.affectedQuantity > 0, `${event.eventId} has invalid affectedQuantity`);
          assert(event.affectedQuantity <= event.currentQuantity, `${event.eventId} affects more than current quantity`);
        }
      });
    });

    previousEventIds.forEach((eventId) => {
      assert(reportEventIds.has(eventId), `report ${reportIndex + 1} lost event ${eventId}`);
    });
    previousEventIds = reportEventIds;

    assert(JSON.stringify(report.summary) === JSON.stringify(buildSummary(report.cards)), `summary mismatch in report ${reportIndex + 1}`);
    previousCreatedAt = report.createdAt;
  });
}

async function readAndValidateArchives(filePaths) {
  const reports = [];
  for (const filePath of filePaths) {
    const zip = await JSZip.loadAsync(fs.readFileSync(filePath));
    assert(zip.file('report.json'), `${path.basename(filePath)} has no report.json`);
    const report = JSON.parse(await zip.file('report.json').async('string'));
    report.cards.forEach((card) => card.events.forEach((event) => event.photoFiles.forEach((photoPath) => {
      assert(zip.file(photoPath), `${path.basename(filePath)} is missing ${photoPath}`);
    })));
    reports.push(report);
  }
  validateReports(reports);
}

async function main() {
  ensureDir(reportsDir);
  cleanupOldDemoReports();

  const photoPool = loadPhotoPool();
  const cultures = loadUniqueCultures();
  const world = createWorld(photoPool);
  const filePaths = [];

  seedInitialCards(world, cultures);

  for (let reportIndex = 0; reportIndex < REPORT_DATES.length; reportIndex += 1) {
    if (reportIndex === 4) {
      addNewStageCards(world, cultures, reportIndex);
    }
    addCoverageEvents(world, reportIndex);
    if (reportIndex === 0) {
      addSoldOutBatch(world, reportIndex);
    }
    addDailyDelta(world, reportIndex);

    const report = createSnapshot(world, reportIndex);
    const fileName = `sadovnik-demo-report-${String(reportIndex + 1).padStart(2, '0')}-${report.createdAt.slice(0, 10)}-${report.user.userId}.zip`;
    const filePath = path.join(reportsDir, fileName);
    await buildZip(report, photoPool, filePath);
    filePaths.push(filePath);
  }

  await readAndValidateArchives(filePaths);
  console.log(`Generated and validated ${filePaths.length} demo ZIP reports in ${reportsDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
