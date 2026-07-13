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
const BATCHES_PER_STAGE = 10;
const TOTAL_BATCHES = STAGES.length * BATCHES_PER_STAGE;
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
  [INTRO_STAGE]: ['Лаборатория, стеллаж Л-1', 'Лаборатория, стеллаж Л-2'],
  Клонирование: ['Лаборатория клонирования, стеллаж К-3'],
  Адаптация: ['Зона адаптации, стеллаж А-2'],
  Теплица: ['Теплица 1, стеллаж B, полка 3'],
  Закалка: ['Площадка закалки, сектор 2'],
  Высадка: ['Участок 1, грядка A-3'],
};
const LOSS_TYPES = new Set(['death', 'discard', 'introLoss']);
const QUANTITY_DECREASE_TYPES = new Set(['sale', ...LOSS_TYPES]);
const PROBLEM_TYPES = new Set(['problem', 'contamination', 'quarantine', 'greenhouseDisease']);

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

function reportDayTime(dayIndex, hour, minute = 0) {
  return iso(Date.UTC(2026, 5, 10 + dayIndex, hour, minute));
}

function historyTime(dayOffset, hour, minute = 0) {
  return iso(Date.UTC(2026, 4, 28 + dayOffset, hour, minute));
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
    .forEach((name) => fs.unlinkSync(path.join(reportsDir, name)));
}

function loadPhotoPool() {
  assert(fs.existsSync(photoDir), `photo directory is missing: ${photoDir}`);
  const files = fs.readdirSync(photoDir)
    .map((name) => path.join(photoDir, name))
    .filter((filePath) => /\.(jpe?g|png|webp)$/i.test(filePath))
    .sort((left, right) => left.localeCompare(right));
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
    if (!plant.cultureName || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  assert(cultures.length >= TOTAL_BATCHES, `catalog has only ${cultures.length} unique cultures`);
  return cultures.slice(0, TOTAL_BATCHES);
}

function createWorld(photoPool, reportIndex) {
  const idBase = Date.UTC(2026, 4, 20 + reportIndex, 8, 0, 0);

  return {
    cards: new Map(),
    cardIdBase: idBase,
    deviceId: `device-${idBase}-dmo${String(reportIndex + 1).padStart(3, '0')}`,
    eventIdBase: idBase + 100000,
    eventSequence: 0,
    photoCursor: 0,
    photoPool,
    reportIdBase: idBase + 200000,
    reportIndex,
  };
}

function stageLocation(stage, index) {
  const locations = STAGE_LOCATIONS[stage];
  assert(locations, `unknown stage: ${stage}`);
  return locations[index % locations.length];
}

function nextEventId(world, card, type) {
  if (type === 'batchCreated') {
    return `batch-created-${card.cardId}`;
  }

  if (type === 'qrGenerated') {
    return `qr-generated-${card.cardId}`;
  }

  world.eventSequence += 1;
  return `${world.eventIdBase + world.eventSequence}`;
}

function getProblemStatus(event) {
  if (event.type === 'quarantine') {
    return 'quarantine';
  }
  if (event.type === 'contamination') {
    return 'problem';
  }
  if (event.type !== 'problem') {
    return '';
  }
  if (event.problemType === 'Карантин') {
    return 'quarantine';
  }
  return ['Контаминация', 'Болезнь', 'Вредители', 'Стресс', 'Ожоги', 'Увядание', 'Погодный стресс', 'Другое']
    .includes(event.problemType) ? 'problem' : '';
}

// Mirrors the relevant rules from batch.js, statusProblemValidation.js and
// statusCardStatusResolver.js. The mobile domain modules are ESM; this CLI is CJS.
function applyEvent(world, card, spec) {
  const event = {
    eventId: nextEventId(world, card, spec.type),
    type: spec.type,
    title: spec.title || spec.type,
    stage: spec.stage || card.stage,
    date: spec.date,
    createdAt: spec.date,
    createdBy: spec.createdBy,
    comment: spec.comment || '',
    photoNote: spec.photoNote || '',
    photoFiles: [],
    problemType: spec.problemType || '',
    riskLevel: spec.riskLevel || '',
    count: Number(spec.count) || 0,
    previousQuantity: card.currentQuantity,
    currentQuantity: card.currentQuantity,
    fromStage: spec.fromStage,
    toStage: spec.toStage,
    extraFields: { ...(spec.extraFields || {}) },
  };
  Object.assign(event, spec.details || {});

  if (spec.photo) {
    event._photoSourceIndex = world.photoCursor % world.photoPool.length;
    world.photoCursor += 1;
  }

  if (QUANTITY_DECREASE_TYPES.has(event.type)) {
    event.count = Math.min(event.count, card.currentQuantity);
    event.currentQuantity = card.currentQuantity - event.count;
    card.currentQuantity = event.currentQuantity;
    if (event.type === 'sale' && !['problem', 'quarantine'].includes(card.batchStatus)) {
      card.batchStatus = card.currentQuantity === 0 ? 'sold' : 'partial';
    }
  } else if (event.type === 'propagation') {
    event.currentQuantity = card.currentQuantity + event.count;
    card.currentQuantity = event.currentQuantity;
  } else if (event.type === 'stageChange') {
    assert(event.fromStage === card.stage, `${card.cardId} has invalid source stage`);
    assert(STAGES.indexOf(event.toStage) === STAGES.indexOf(card.stage) + 1, `${card.cardId} skips a stage`);
    event.stage = event.toStage;
    event.stageChangedAt = event.date;
    card.stage = event.toStage;
  } else if (event.type === 'movement') {
    event.previousLocation = card.locationDescription;
    event.nextLocation = spec.nextLocation || stageLocation(card.stage, card.index);
    card.locationDescription = event.nextLocation;
  } else if (event.type === 'plantingCompletion') {
    card.batchStatus = 'archived';
  } else {
    const problemStatus = getProblemStatus(event);
    if (problemStatus) {
      card.batchStatus = problemStatus;
    }
    if (event.type === 'contamination' || (event.type === 'problem' && event.problemType === 'Контаминация')) {
      card.sterilityStatus = 'contaminated';
    }
  }

  card.events.push(event);
  card.updatedAt = event.createdAt;
}

function addHistoricalStageMove(world, card, stageIndex, user) {
  const fromStage = card.stage;
  const toStage = STAGES[stageIndex];
  applyEvent(world, card, {
    type: 'stageChange', title: 'Изменение стадии', fromStage, toStage,
    date: historyTime(stageIndex + 1, 10, (card.index % 10) * 3), createdBy: user.userId,
    photo: (card.index + stageIndex) % 2 === 0,
    photoNote: (card.index + stageIndex) % 2 === 0 ? `Фотофиксация перехода в стадию «${toStage}».` : '',
    details: { rootedCount: Math.round(card.currentQuantity * 0.8), rootingPercent: 80 },
  });
  applyEvent(world, card, {
    type: 'movement', title: 'Перемещение', stage: card.stage,
    date: historyTime(stageIndex + 1, 11, (card.index % 10) * 3), createdBy: user.userId,
    comment: `Партия размещена на стадии «${card.stage}».`, nextLocation: stageLocation(card.stage, card.index),
  });
}

function createInitialWorld(world, cultures) {
  const user = USERS[world.reportIndex];
  cultures.forEach((culture, index) => {
    const targetStageIndex = Math.floor(index / BATCHES_PER_STAGE);
    const createdAt = historyTime(0, 8, index % 50);
    const quantity = 72 + (index % 8) * 11;
    const card = {
      cardId: `${world.cardIdBase + index}`,
      code: `VK-202605${String(20 + world.reportIndex).padStart(2, '0')}-${String(world.reportIndex + 1).padStart(2, '0')}-${String(1000 + index)}`,
      cultureName: culture.cultureName,
      speciesName: culture.speciesName,
      varietyName: culture.varietyName,
      stage: INTRO_STAGE,
      batchStatus: 'active',
      sterilityStatus: 'unchecked',
      quantity,
      currentQuantity: quantity,
      locationDescription: stageLocation(INTRO_STAGE, index),
      createdAt,
      updatedAt: createdAt,
      events: [],
      index,
    };
    world.cards.set(card.cardId, card);
    applyEvent(world, card, {
      type: 'batchCreated', title: 'Создание партии', stage: INTRO_STAGE, date: createdAt, createdBy: user.userId,
      details: { quantity, qrStatus: 'pending_print' }, extraFields: { source: 'demo-world' },
    });
    applyEvent(world, card, {
      type: 'qrGenerated', title: 'QR-код сформирован', stage: INTRO_STAGE,
      date: historyTime(0, 9, index % 50), createdBy: user.userId, details: { code: card.code, qrStatus: 'pending_print' },
    });
    for (let stageIndex = 1; stageIndex <= targetStageIndex; stageIndex += 1) {
      addHistoricalStageMove(world, card, stageIndex, user);
    }
  });
}

function getCard(world, stageIndex, dayIndex) {
  return world.cards.get(`${world.cardIdBase + stageIndex * BATCHES_PER_STAGE + dayIndex}`);
}

function addDailyEvent(world, dayIndex, stageIndex, hour, minute, spec) {
  const card = getCard(world, stageIndex, dayIndex);
  assert(card, `daily card is missing for ${STAGES[stageIndex]}`);
  applyEvent(world, card, {
    ...spec,
    stage: card.stage,
    date: reportDayTime(dayIndex, hour, minute),
    createdBy: USERS[world.reportIndex].userId,
  });
}

function applyDayScenario(world, dayIndex) {
  const photos = new Set([0, 3, 5]);
  const withPhoto = (stageIndex, photoNote) => ({ photo: photos.has(stageIndex), photoNote: photos.has(stageIndex) ? photoNote : '' });

  if (dayIndex === 0) {
    addDailyEvent(world, dayIndex, 0, 9, 0, { type: 'contamination', title: 'Контаминация', ...withPhoto(0, 'Контрольная фиксация контаминации.'), details: { contaminationNote: 'Признаки бактериального заражения.' } });
    addDailyEvent(world, dayIndex, 1, 10, 0, { type: 'rooting', title: 'Укоренение', count: 54, details: { rootedCount: 54, rootingPercent: 75 } });
    addDailyEvent(world, dayIndex, 2, 11, 0, { type: 'adaptationStress', title: 'Наблюдение', details: { stressLevel: 'Средний', turgor: 'Снижен', stability: 'Стабилизируется' } });
    addDailyEvent(world, dayIndex, 3, 12, 0, { type: 'greenhouseObservation', title: 'Наблюдение', ...withPhoto(3, 'Состояние партии в теплице.'), details: { growthRate: 'Равномерный', stressLevel: 'Низкий', stability: 'Стабильная', riskLevel: 'Низкий', conditionDescription: 'Листья плотные, прирост равномерный.' } });
    addDailyEvent(world, dayIndex, 4, 13, 0, { type: 'hardeningObservation', title: 'Наблюдение', details: { stressLevel: 'Средний', turgor: 'Удовлетворительный', readinessForPlanting: 'Готова через 3 дня' } });
    addDailyEvent(world, dayIndex, 5, 14, 0, { type: 'plantingObservation', title: 'Наблюдение', ...withPhoto(5, 'Контроль приживаемости на участке.'), details: { survivalRate: 'Высокая', stressLevel: 'Низкий', turgor: 'Хороший' } });
    return;
  }
  if (dayIndex === 1) {
    addDailyEvent(world, dayIndex, 0, 9, 0, { type: 'quarantine', title: 'Карантин', ...withPhoto(0, 'Партия в карантинной зоне.'), comment: 'Партия изолирована до повторного анализа.', details: { reason: 'Подозрение на инфекцию', quarantineReason: 'Подозрение на инфекцию' } });
    addDailyEvent(world, dayIndex, 1, 10, 0, { type: 'propagation', title: 'Размножение', count: 12, details: { propagationMethod: 'Черенкование' } });
    addDailyEvent(world, dayIndex, 2, 11, 0, { type: 'adaptationEnvironment', title: 'Изменение среды', details: { environmentTemperature: '23 C', environmentAirHumidity: '76%', substrateHumidity: 'Умеренная', environmentLight: 'Рассеянный свет', ventilation: 'Проветривание 2 раза в день', humidityReduction: 'Плавное снижение', turgor: 'Восстановлен', stability: 'Стабильная' } });
    addDailyEvent(world, dayIndex, 3, 12, 0, { type: 'greenhouseCare', title: 'Уход', ...withPhoto(3, 'Подкормка в тепличной зоне.'), details: { careType: 'Подкормка', productName: 'Комплексное удобрение', dosage: '1 мл/л', applicationMethod: 'Полив под корень', plantReaction: 'Реакция положительная' } });
    addDailyEvent(world, dayIndex, 4, 13, 0, { type: 'hardeningCare', title: 'Уход', details: { careType: 'Полив', productName: 'Антистресс', dosage: '1.5 мл/л', applicationMethod: 'Листовая обработка', plantReaction: 'Тургор восстановлен' } });
    addDailyEvent(world, dayIndex, 5, 14, 0, { type: 'plantingCare', title: 'Уход', ...withPhoto(5, 'Полив после высадки.'), details: { careType: 'Полив', productName: 'Укоренитель', dosage: '1 г/л', applicationMethod: 'Полив в посадочную лунку', plantReaction: 'Реакция положительная' } });
    return;
  }
  if (dayIndex === 2) {
    addDailyEvent(world, dayIndex, 0, 9, 0, { type: 'movement', title: 'Перемещение', ...withPhoto(0, 'Новое размещение в лаборатории.'), comment: 'Партия переведена на резервный стеллаж.', nextLocation: 'Лаборатория, стеллаж Л-2' });
    addDailyEvent(world, dayIndex, 1, 10, 0, { type: 'sale', title: 'Продажа', count: 10, details: { saleType: 'Частичная реализация', recipient: 'Цветочный салон', saleAmount: '8500' } });
    addDailyEvent(world, dayIndex, 2, 11, 0, { type: 'adaptationCare', title: 'Уход', details: { careType: 'Увлажнение' } });
    addDailyEvent(world, dayIndex, 3, 12, 0, { type: 'greenhouseEnvironment', title: 'Среда', ...withPhoto(3, 'Контроль параметров тепличной среды.'), details: { environmentTemperature: '24 C', environmentAirHumidity: '64%', environmentLight: 'PPFD 160', ventilation: 'Автоматическая вентиляция', placement: 'Стеллаж верхний ярус', densityChange: 'Разрежение посадки', growthRate: 'Активный рост', stability: 'Стабильная' } });
    addDailyEvent(world, dayIndex, 4, 13, 0, { type: 'hardeningObservation', title: 'Наблюдение', details: { stressLevel: 'Низкий', turgor: 'Хороший', readinessForPlanting: 'Готова к высадке' } });
    addDailyEvent(world, dayIndex, 5, 14, 0, { type: 'plantingObservation', title: 'Наблюдение', ...withPhoto(5, 'Проверка приживаемости после высадки.'), details: { survivalRate: 'Высокая', stressLevel: 'Низкий', turgor: 'Хороший' } });
    return;
  }
  if (dayIndex === 3) {
    addDailyEvent(world, dayIndex, 0, 9, 0, { type: 'comment', title: 'Комментарий', ...withPhoto(0, 'Фото контрольного осмотра.'), comment: 'Партия развивается в штатном режиме.' });
    addDailyEvent(world, dayIndex, 1, 10, 0, { type: 'rooting', title: 'Укоренение', count: 48, details: { rootedCount: 48, rootingPercent: 72 } });
    addDailyEvent(world, dayIndex, 2, 11, 0, { type: 'adaptationStress', title: 'Наблюдение', details: { stressLevel: 'Низкий', turgor: 'Хороший', stability: 'Стабильная' } });
    addDailyEvent(world, dayIndex, 3, 12, 0, { type: 'greenhouseDisease', title: 'Болезни / вредители', ...withPhoto(3, 'Осмотр листовой пластины.'), riskLevel: 'Средний', details: { diseaseName: 'Пятнистость листьев', pestName: 'Не выявлен', diseaseSeverity: 'Средняя', productName: 'Фунгицид', dosage: '2 мл/л', applicationMethod: 'Опрыскивание', plantReaction: 'Распространение остановлено' } });
    addDailyEvent(world, dayIndex, 4, 13, 0, { type: 'hardeningCare', title: 'Уход', details: { careType: 'Профилактика', productName: 'Антистресс', dosage: '1 мл/л', applicationMethod: 'Листовая обработка', plantReaction: 'Стабильная' } });
    addDailyEvent(world, dayIndex, 5, 14, 0, { type: 'plantingCare', title: 'Уход', ...withPhoto(5, 'Полив в посадочной лунке.'), details: { careType: 'Полив', productName: 'Укоренитель', dosage: '1 г/л', applicationMethod: 'Полив', plantReaction: 'Состояние стабильное' } });
    return;
  }
  if (dayIndex === 4) {
    addDailyEvent(world, dayIndex, 0, 9, 0, { type: 'introLoss', title: 'Потери', count: 4, ...withPhoto(0, 'Контрольный снимок после ревизии.'), details: { reason: 'Некроз части эксплантов', lossReason: 'Некроз части эксплантов' } });
    addDailyEvent(world, dayIndex, 1, 10, 0, { type: 'sale', title: 'Продажа', count: 14, details: { saleType: 'Частичная реализация', recipient: 'Питомник', saleAmount: '11200' } });
    addDailyEvent(world, dayIndex, 2, 11, 0, { type: 'adaptationCare', title: 'Уход', details: { careType: 'Полив' } });
    addDailyEvent(world, dayIndex, 3, 12, 0, { type: 'greenhouseObservation', title: 'Наблюдение', ...withPhoto(3, 'Рост партии в тепличной зоне.'), details: { growthRate: 'Равномерный', stressLevel: 'Низкий', stability: 'Стабильная', riskLevel: 'Низкий', conditionDescription: 'Новый прирост формируется равномерно.' } });
    addDailyEvent(world, dayIndex, 4, 13, 0, { type: 'hardeningObservation', title: 'Наблюдение', details: { stressLevel: 'Средний', turgor: 'Удовлетворительный', readinessForPlanting: 'Нужен контроль через 2 дня' } });
    addDailyEvent(world, dayIndex, 5, 14, 0, { type: 'sale', title: 'Продажа', ...withPhoto(5, 'Партия подготовлена к отгрузке.'), count: 16, details: { saleType: 'Частичная реализация', recipient: 'Садовый центр', saleAmount: '14400' } });
    return;
  }
  if (dayIndex === 5) {
    addDailyEvent(world, dayIndex, 0, 9, 0, { type: 'problem', title: 'Проблема', ...withPhoto(0, 'Температурный стресс в лаборатории.'), problemType: 'Стресс', riskLevel: 'Высокий', comment: 'Партия оставлена на дополнительном контроле.' });
    addDailyEvent(world, dayIndex, 1, 10, 0, { type: 'propagation', title: 'Размножение', count: 10, details: { propagationMethod: 'Черенкование' } });
    addDailyEvent(world, dayIndex, 2, 11, 0, { type: 'adaptationEnvironment', title: 'Изменение среды', details: { environmentTemperature: '23 C', environmentAirHumidity: '72%', substrateHumidity: 'Контролируемая', humidityReduction: 'Снижение на 5%', turgor: 'Без потери тургора', stability: 'Стабильная' } });
    addDailyEvent(world, dayIndex, 3, 12, 0, { type: 'transplant', title: 'Пересадка', ...withPhoto(3, 'Партия после пересадки.'), count: 18, details: { placement: 'Стеллаж B, полка 3', densityChange: 'Разрежение посадки', growthRate: 'Равномерный', stability: 'Стабильная' } });
    addDailyEvent(world, dayIndex, 4, 13, 0, { type: 'hardeningCare', title: 'Уход', details: { careType: 'Полив', productName: 'Антистресс', dosage: '1.5 мл/л', applicationMethod: 'Листовая обработка', plantReaction: 'Тургор восстановлен' } });
    addDailyEvent(world, dayIndex, 5, 14, 0, { type: 'plantingObservation', title: 'Наблюдение', ...withPhoto(5, 'Состояние растений после высадки.'), details: { survivalRate: 'Высокая', stressLevel: 'Низкий', turgor: 'Хороший' } });
    return;
  }
  if (dayIndex === 6) {
    addDailyEvent(world, dayIndex, 0, 9, 0, { type: 'comment', title: 'Комментарий', ...withPhoto(0, 'Контрольное фото лабораторной партии.'), comment: 'Рост стабилен, назначен следующий контроль.' });
    addDailyEvent(world, dayIndex, 1, 10, 0, { type: 'death', title: 'Гибель', count: 3, details: { reason: 'Потери после стрессового периода' } });
    addDailyEvent(world, dayIndex, 2, 11, 0, { type: 'adaptationStress', title: 'Наблюдение', details: { stressLevel: 'Средний', turgor: 'Снижен', stability: 'Стабилизируется' } });
    addDailyEvent(world, dayIndex, 3, 12, 0, { type: 'greenhouseCare', title: 'Уход', ...withPhoto(3, 'Полив и подкормка в теплице.'), details: { careType: 'Полив', wateringIntervalDays: '2', waterVolume: '250 мл' } });
    addDailyEvent(world, dayIndex, 4, 13, 0, { type: 'problem', title: 'Проблема', problemType: 'Ожоги', riskLevel: 'Высокий', comment: 'Партия переведена в затененный сектор.' });
    addDailyEvent(world, dayIndex, 5, 14, 0, { type: 'plantingCare', title: 'Уход', ...withPhoto(5, 'Уход после высадки.'), details: { careType: 'Полив', productName: 'Укоренитель', dosage: '1 г/л', applicationMethod: 'Полив', plantReaction: 'Состояние стабильное' } });
    return;
  }
  if (dayIndex === 7) {
    addDailyEvent(world, dayIndex, 0, 9, 0, { type: 'movement', title: 'Перемещение', ...withPhoto(0, 'Новое размещение партии в лаборатории.'), comment: 'Партия переведена на освещенный стеллаж.', nextLocation: 'Лаборатория, стеллаж Л-1' });
    addDailyEvent(world, dayIndex, 1, 10, 0, { type: 'sale', title: 'Продажа', count: 12, details: { saleType: 'Частичная реализация', recipient: 'Ландшафтная студия', saleAmount: '9600' } });
    addDailyEvent(world, dayIndex, 2, 11, 0, { type: 'adaptationCare', title: 'Уход', details: { careType: 'Увлажнение' } });
    addDailyEvent(world, dayIndex, 3, 12, 0, { type: 'greenhouseObservation', title: 'Наблюдение', ...withPhoto(3, 'Проверка состояния тепличной партии.'), details: { growthRate: 'Активный рост', stressLevel: 'Низкий', stability: 'Стабильная', riskLevel: 'Низкий', conditionDescription: 'Растения готовы к дальнейшему развитию.' } });
    addDailyEvent(world, dayIndex, 4, 13, 0, { type: 'hardeningCare', title: 'Уход', details: { careType: 'Профилактика', productName: 'Антистресс', dosage: '1 мл/л', applicationMethod: 'Листовая обработка', plantReaction: 'Стабильная' } });
    addDailyEvent(world, dayIndex, 5, 14, 0, { type: 'problem', title: 'Проблема', ...withPhoto(5, 'Погодный стресс после высадки.'), problemType: 'Погодный стресс', riskLevel: 'Высокий', comment: 'Партия оставлена под ежедневным наблюдением.' });
    return;
  }
  if (dayIndex === 8) {
    addDailyEvent(world, dayIndex, 0, 9, 0, { type: 'introLoss', title: 'Потери', count: 2, ...withPhoto(0, 'Ревизия лабораторной партии.'), details: { reason: 'Потери при контрольном осмотре', lossReason: 'Потери при контрольном осмотре' } });
    addDailyEvent(world, dayIndex, 1, 10, 0, { type: 'propagation', title: 'Размножение', count: 8, details: { propagationMethod: 'Черенкование' } });
    addDailyEvent(world, dayIndex, 2, 11, 0, { type: 'adaptationCare', title: 'Уход', details: { careType: 'Полив' } });
    addDailyEvent(world, dayIndex, 3, 12, 0, { type: 'greenhouseCare', title: 'Уход', ...withPhoto(3, 'Плановый уход в теплице.'), details: { careType: 'Подкормка', productName: 'Комплексное удобрение', dosage: '1 мл/л', applicationMethod: 'Полив под корень', plantReaction: 'Реакция положительная' } });
    addDailyEvent(world, dayIndex, 4, 13, 0, { type: 'hardeningObservation', title: 'Наблюдение', details: { stressLevel: 'Низкий', turgor: 'Хороший', readinessForPlanting: 'Готова к высадке' } });
    addDailyEvent(world, dayIndex, 5, 14, 0, { type: 'sale', title: 'Продажа', ...withPhoto(5, 'Частичная отгрузка посадочного материала.'), count: 18, details: { saleType: 'Частичная реализация', recipient: 'Оптовый покупатель', saleAmount: '16200' } });
    return;
  }
  addDailyEvent(world, dayIndex, 0, 9, 0, { type: 'comment', title: 'Комментарий', ...withPhoto(0, 'Итоговый осмотр лабораторной партии.'), comment: 'Партия оставлена на текущей стадии.' });
  addDailyEvent(world, dayIndex, 1, 10, 0, { type: 'rooting', title: 'Укоренение', count: 46, details: { rootedCount: 46, rootingPercent: 70 } });
  addDailyEvent(world, dayIndex, 2, 11, 0, { type: 'problem', title: 'Проблема', problemType: 'Стресс', riskLevel: 'Высокий', comment: 'Требуется продлить адаптационный период.' });
  addDailyEvent(world, dayIndex, 3, 12, 0, { type: 'greenhouseDisease', title: 'Болезни / вредители', ...withPhoto(3, 'Финальный осмотр листьев.'), riskLevel: 'Средний', details: { diseaseName: 'Пятнистость листьев', pestName: 'Не выявлен', diseaseSeverity: 'Средняя', productName: 'Фунгицид', dosage: '2 мл/л', applicationMethod: 'Опрыскивание', plantReaction: 'Распространение остановлено' } });
  addDailyEvent(world, dayIndex, 4, 13, 0, { type: 'hardeningCare', title: 'Уход', details: { careType: 'Полив', productName: 'Антистресс', dosage: '1 мл/л', applicationMethod: 'Листовая обработка', plantReaction: 'Стабильная' } });
  addDailyEvent(world, dayIndex, 5, 14, 0, { type: 'plantingCompletion', title: 'Завершение', ...withPhoto(5, 'Финальное состояние высаженной партии.'), details: { completionResult: 'Высадка завершена, партия передана в архив.' } });
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
    photoNote: sourceEvent.photoNote,
    photoFiles: sourceEvent.photoFiles,
    problemType: sourceEvent.problemType,
    riskLevel: sourceEvent.riskLevel,
    count: sourceEvent.count,
    previousQuantity: sourceEvent.previousQuantity,
    currentQuantity: sourceEvent.currentQuantity,
    // The mobile exporter publishes a fixed event schema; operation-specific
    // fields remain local to the source card and are not included in report.json.
    extraFields: {},
  };
  if (_photoSourceIndex !== undefined) {
    const extension = path.extname(photoPool[_photoSourceIndex]).toLowerCase() || '.jpg';
    result.photoFiles = [`photos/${result.eventId}${extension}`];
  }
  return result;
}

function buildSummary(cards) {
  const summary = { cardsCount: cards.length, eventsCount: 0, photosCount: 0, problemsCount: 0, activeCount: 0, soldCount: 0, quarantineCount: 0, problemCount: 0, partialCount: 0, archivedCount: 0 };
  cards.forEach((card) => {
    summary.eventsCount += card.events.length;
    summary.photosCount += card.events.reduce((total, event) => total + event.photoFiles.length, 0);
    summary[`${card.batchStatus}Count`] += 1;
    card.events.forEach((event) => {
      if (PROBLEM_TYPES.has(event.type)) {
        summary.problemsCount += 1;
      }
    });
  });
  return summary;
}

function createSnapshot(world, reportIndex) {
  const cards = [...world.cards.values()].map((sourceCard) => {
    const { index, ...card } = clone(sourceCard);
    card.events = sourceCard.events.map((event) => publicEvent(event, world.photoPool));
    card.extraFields = {};
    return card;
  });
  const user = USERS[reportIndex];
  const report = {
    reportId: `report-${world.reportIdBase}-dmo${String(reportIndex + 1).padStart(3, '0')}`,
    createdAt: iso(REPORT_DATES[reportIndex]), appVersion, deviceId: world.deviceId,
    user, testLocation: 'Демо-площадка Sadovnik Diary', summary: buildSummary(cards), cards,
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
    if (QUANTITY_DECREASE_TYPES.has(event.type)) return Math.max(quantity - event.count, 0);
    return event.type === 'propagation' ? quantity + event.count : quantity;
  }, card.quantity);
}

function validateReports(reports) {
  assert(reports.length === 10, 'expected 10 reports');
  const seenCardIds = new Set();
  const seenCodes = new Set();
  const seenDeviceIds = new Set();
  const seenEventIds = new Set();
  let previousCreatedAt = '';
  reports.forEach((report, reportIndex) => {
    assert(report.cards.length === TOTAL_BATCHES, `report ${reportIndex + 1} must have ${TOTAL_BATCHES} cards`);
    assert(new Date(report.createdAt) > new Date(previousCreatedAt || 0), 'report timestamps are not sequential');
    assert(!seenDeviceIds.has(report.deviceId), `duplicate deviceId in report ${reportIndex + 1}`);
    seenDeviceIds.add(report.deviceId);
    const stageCounts = report.cards.reduce((counts, card) => ({ ...counts, [card.stage]: (counts[card.stage] || 0) + 1 }), {});
    STAGES.forEach((stage) => assert(stageCounts[stage] === BATCHES_PER_STAGE, `report ${reportIndex + 1} has invalid ${stage} count`));
    const cultureKeys = new Set(report.cards.map((card) => `${card.cultureName}|${card.speciesName}|${card.varietyName}`));
    assert(cultureKeys.size === TOTAL_BATCHES, `report ${reportIndex + 1} repeats a plant`);
    report.cards.forEach((card) => {
      assert(card.events.every((event) => event.createdBy && event.createdAt <= report.createdAt), `${card.cardId} has invalid event author or date`);
      assert(recalculateQuantity(card) === card.currentQuantity, `${card.cardId} has invalid quantity`);
      const sourceCard = report._sourceCards?.get(card.cardId);
      if (sourceCard) {
        const history = sourceCard.events.filter((event) => event.type === 'stageChange');
        let stage = INTRO_STAGE;
        history.forEach((event) => {
          assert(event.fromStage === stage && STAGES.indexOf(event.toStage) === STAGES.indexOf(stage) + 1, `${card.cardId} has invalid stage history`);
          stage = event.toStage;
        });
        assert(stage === card.stage, `${card.cardId} stage is not backed by events`);
      }
      assert(!seenCardIds.has(card.cardId), `duplicate cardId: ${card.cardId}`);
      assert(!seenCodes.has(card.code), `duplicate code: ${card.code}`);
      seenCardIds.add(card.cardId);
      seenCodes.add(card.code);
      card.events.forEach((event) => {
        assert(!seenEventIds.has(event.eventId), `duplicate eventId: ${event.eventId}`);
        seenEventIds.add(event.eventId);
      });
    });
    assert(JSON.stringify(report.summary) === JSON.stringify(buildSummary(report.cards)), `summary mismatch in report ${reportIndex + 1}`);
    previousCreatedAt = report.createdAt;
  });
}

async function readAndValidateArchives(filePaths) {
  const reports = [];
  for (const filePath of filePaths) {
    const zip = await JSZip.loadAsync(fs.readFileSync(filePath));
    assert(zip.file('report.json'), `${path.basename(filePath)} has no report.json`);
    assert(Object.keys(zip.files).some((name) => name.startsWith('photos/')), `${path.basename(filePath)} has no photos directory`);
    const report = JSON.parse(await zip.file('report.json').async('string'));
    report.cards.forEach((card) => card.events.forEach((event) => event.photoFiles.forEach((photoPath) => assert(zip.file(photoPath), `${photoPath} is missing`))));
    reports.push(report);
  }
  validateReports(reports);
}

async function main() {
  ensureDir(reportsDir);
  cleanupOldDemoReports();
  const photoPool = loadPhotoPool();
  const cultures = loadUniqueCultures();
  const filePaths = [];
  for (let index = 0; index < REPORT_DATES.length; index += 1) {
    const world = createWorld(photoPool, index);
    createInitialWorld(world, cultures);
    applyDayScenario(world, index);
    const report = createSnapshot(world, index);
    const fileName = `sadovnik-demo-report-${String(index + 1).padStart(2, '0')}-${report.createdAt.slice(0, 10)}-${report.user.userId}.zip`;
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
