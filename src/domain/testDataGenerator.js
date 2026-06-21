import { createBatchCreatedOperation, normalizeCultureCard } from './batch.js';
import plantsCatalog from '../../data/plantsCatalog.js';
import { currentUser, INTRO_STAGE, SOURCE_MATERIAL_OPTIONS, stages } from './constants.js';
import { isoFromDate } from './dates.js';
import { getCardCurrentQuantity } from './batch.js';
import { buildStageChangeOperation, buildStageTransitionCard } from './stageTransition.js';

const TRANSPARENT_PIXEL_DATA_URI =
  'data:image/gif;base64,R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==';
const STAGE_COVERAGE_CARD_COUNTS = {
  [INTRO_STAGE]: 7,
  [stages[1]]: 7,
  [stages[2]]: 6,
  [stages[3]]: 6,
  [stages[4]]: 4,
  [stages[5]]: 6,
};

function normalizeSeed(seed) {
  const seedText = `${seed || ''}`.trim();

  return seedText || 'coverage-seed-v1';
}

function createSeededRandom(seed) {
  let h1 = 1779033703 ^ seed.length;
  let h2 = 3144134277 ^ seed.length;
  let h3 = 1013904242 ^ seed.length;
  let h4 = 2773480762 ^ seed.length;

  for (let index = 0; index < seed.length; index += 1) {
    const charCode = seed.charCodeAt(index);
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
    const t = (h1 ^ h2 ^ h3 ^ h4) >>> 0;
    h1 = h2;
    h2 = h3;
    h3 = h4;
    h4 = (h4 + 0x6D2B79F5) >>> 0;
    return t / 4294967296;
  };
}

function randomInt(min, max, rng = Math.random) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randomChoice(items, rng = Math.random) {
  return items[randomInt(0, items.length - 1, rng)];
}

function randomDateBetween(start, end, rng = Math.random) {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const min = Math.min(startTime, endTime);
  const max = Math.max(startTime, endTime);
  return new Date(min + rng() * (max - min));
}

function toIsoDate(value) {
  return isoFromDate(value instanceof Date ? value : new Date(value));
}

function buildProfileForCulture(seedIndex) {
  const plant = plantsCatalog[seedIndex % plantsCatalog.length];

  if (!plant) {
    return {
      cultureName: '',
      speciesName: '',
      varietyName: '',
      originalName: '',
    };
  }

  return {
    cultureName: plant.cultureName || '',
    speciesName: plant.speciesName || '',
    varietyName: plant.varietyName || '',
    originalName: plant.originalName || '',
  };
}

function buildOperationBase({
  cardId,
  createdAt,
  index,
  stage,
  type,
  title,
  field,
  value,
  user,
}) {
  const createdAtIso = createdAt.toISOString();
  const operationId = `${cardId}-${type}-${index}-${createdAt.getTime().toString(36)}`;

  return {
    id: operationId,
    type,
    title,
    stage,
    date: toIsoDate(createdAt),
    createdAt: createdAtIso,
    createdBy: user.id,
    createdByName: user.fullName || user.id,
    [field]: value,
  };
}

function buildTransitionOperation({
  createdAt,
  fromStage,
  toStage,
  quantity,
  operationId,
}) {
  return buildStageChangeOperation({
    currentQuantity: quantity,
    operationId,
    nextStage: toStage,
    nowIso: createdAt.toISOString(),
    selectedCard: {
      stage: fromStage,
      quantity,
    },
    selectedCalendarDate: toIsoDate(createdAt),
  });
}

function buildUniqueCode({ stage, createdAt, existingCodes, index, rng = Math.random }) {
  const stagePrefix = stage === stages[1]
    ? 'KL'
    : stage === stages[2]
      ? 'AD'
      : stage === stages[3]
        ? 'TP'
        : 'VK';
  const datePart = toIsoDate(createdAt).replaceAll('-', '');

  let attempt = 0;
  while (attempt < 20) {
    const code = `${stagePrefix}-${datePart}-${String(index + 1).padStart(2, '0')}-${randomInt(1000, 9999, rng)}`;
    if (!existingCodes.has(code)) {
      existingCodes.add(code);
      return code;
    }

    attempt += 1;
  }

  const fallbackCode = `${stagePrefix}-${datePart}-${index + 1}-${randomInt(1000, 9999, rng).toString(36)}`;
  existingCodes.add(fallbackCode);
  return fallbackCode;
}

function buildUniqueId({ existingIds, stage, index, rng = Math.random }) {
  let attempt = 0;
  while (attempt < 20) {
    const candidate = `test-${stage.replaceAll(/\s+/g, '-').toLowerCase()}-${index + 1}-${randomInt(1000, 9999, rng).toString(36)}-${randomInt(1000, 9999, rng)}`;
    if (!existingIds.has(candidate)) {
      existingIds.add(candidate);
      return candidate;
    }

    attempt += 1;
  }

  const fallbackId = `test-${stage.replaceAll(/\s+/g, '-').toLowerCase()}-${index + 1}-${randomInt(1000, 9999, rng).toString(36)}${randomInt(1000, 9999, rng).toString(36)}`;
  existingIds.add(fallbackId);
  return fallbackId;
}

function buildEventDate(baseDate, hoursOffset) {
  return new Date(baseDate.getTime() + hoursOffset * 60 * 60 * 1000);
}

function buildStageEventSpec(stage, stageIndex, cardIndex, card, createdAt, updatedAt) {
  const stageEvents = {
    [INTRO_STAGE]: [
      {
        type: 'comment',
        title: 'Комментарий',
        comment: 'Карточка создана и подготовлена к работе.',
        photoNote: 'Фото базовой партии.',
      },
      {
        type: 'rooting',
        title: 'Укоренение',
        rootedCount: Math.max(1, Math.round(card.quantity * 0.35)),
        rootingPercent: 35,
        comment: 'Фиксация части укорененных растений.',
        photoNote: 'Фото укоренения.',
      },
      {
        type: 'introLoss',
        title: 'Потери',
        count: 4,
        lossReason: 'Единичные потери при первичном осмотре.',
        reason: 'Единичные потери при первичном осмотре.',
        comment: 'Потери зафиксированы и списаны.',
        photoNote: 'Фото потерь.',
      },
      {
        type: 'propagation',
        title: 'Размножение',
        count: 6,
        propagationMethod: 'Черенкование',
        comment: 'Запущено вегетативное размножение.',
        photoNote: 'Фото размножения.',
      },
      {
        type: 'quarantine',
        title: 'Карантин',
        quarantineReason: 'Требуется изоляция партии после осмотра.',
        reason: 'Требуется изоляция партии после осмотра.',
        comment: 'Карточка переведена в карантин.',
        photoNote: 'Фото карантина.',
      },
      {
        type: 'problem',
        title: 'Проблема',
        problemType: 'Контаминация',
        riskLevel: 'Высокий',
        problemDescription: 'Обнаружено отклонение при проверке партии.',
        comment: 'Проблема требует наблюдения.',
        photoNote: 'Фото проблемы.',
      },
      {
        type: 'movement',
        title: 'Перемещение',
        greenhouseName: `Теплица ${stageIndex + 1}`,
        rackName: `Стеллаж ${cardIndex + 1}`,
        shelfName: `${(cardIndex % 8) + 1}`,
        comment: 'Карточка перемещена на новое место.',
        photoNote: 'Фото перемещения.',
      },
    ],
    [stages[1]]: [
      {
        type: 'rooting',
        title: 'Укоренение',
        rootedCount: Math.max(1, Math.round(card.quantity * 0.42)),
        rootingPercent: 42,
        comment: 'Укоренение в норме.',
        photoNote: 'Фото укоренения.',
      },
      {
        type: 'propagation',
        title: 'Размножение',
        count: 8,
        propagationMethod: 'Деление куста',
        comment: 'Размножение по стандартной схеме.',
        photoNote: 'Фото размножения.',
      },
      {
        type: 'sale',
        title: 'Продажа',
        count: 12,
        saleType: 'Оптовая',
        recipient: 'Демо-клиент',
        saleAmount: '12',
        comment: 'Часть партии реализована.',
        photoNote: 'Фото продажи.',
      },
      {
        type: 'death',
        title: 'Гибель',
        count: 3,
        reason: 'Потери после стресса укоренения.',
        comment: 'Фиксация гибели части растений.',
        photoNote: 'Фото гибели.',
      },
      {
        type: 'discard',
        title: 'Выбраковка',
        count: 2,
        reason: 'Отбраковка слабых экземпляров.',
        comment: 'Выбраковка выполнена.',
        photoNote: 'Фото выбраковки.',
      },
      {
        type: 'problem',
        title: 'Проблема',
        problemType: 'Вредители',
        riskLevel: 'Критический',
        problemDescription: 'Зафиксированы вредители на части партии.',
        comment: 'Требуется обработка.',
        photoNote: 'Фото проблемы.',
      },
      {
        type: 'movement',
        title: 'Перемещение',
        greenhouseName: `Теплица ${stageIndex + 1}`,
        rackName: `Стеллаж ${cardIndex + 2}`,
        shelfName: `${((cardIndex + 1) % 8) + 1}`,
        comment: 'Перевод на следующую локацию.',
        photoNote: 'Фото перемещения.',
      },
    ],
    [stages[2]]: [
      {
        type: 'adaptationStress',
        title: 'Наблюдение',
        stressLevel: 'Высокий',
        turgor: 'Снижен',
        stability: 'Средняя',
        environmentTemperature: '24',
        environmentAirHumidity: '72',
        substrateHumidity: 'Умеренная',
        environmentLight: 'Яркий рассеянный',
        ventilation: 'Нормальная',
        comment: 'Карточка находится под наблюдением.',
        photoNote: 'Фото наблюдения.',
      },
      {
        type: 'adaptationEnvironment',
        title: 'Изменение среды',
        environmentTemperature: '23',
        environmentAirHumidity: '68',
        substrateHumidity: 'Повышенная',
        environmentLight: 'Средний',
        ventilation: 'Усиленная',
        humidityReduction: 'Да',
        turgor: 'Стабильный',
        stability: 'Хорошая',
        comment: 'Среда скорректирована.',
        photoNote: 'Фото среды.',
      },
      {
        type: 'adaptationHumidityReduction',
        title: 'Снижение влажности',
        environmentAirHumidity: '65',
        substrateHumidity: 'Умеренная',
        humidityReduction: 'Да',
        turgor: 'Стабильный',
        stability: 'Хорошая',
        comment: 'Влажность снижена по плану.',
        photoNote: 'Фото влажности.',
      },
      {
        type: 'adaptationCare',
        title: 'Уход',
        careType: 'Полив',
        comment: 'Выполнен плановый уход.',
        photoNote: 'Фото ухода.',
      },
      {
        type: 'problem',
        title: 'Проблема',
        problemType: 'Стресс',
        riskLevel: 'Высокий',
        problemDescription: 'Стресс после смены условий.',
        comment: 'Нужен контроль состояния.',
        photoNote: 'Фото проблемы.',
      },
      {
        type: 'movement',
        title: 'Перемещение',
        greenhouseName: `Теплица ${stageIndex + 1}`,
        rackName: `Стеллаж ${cardIndex + 3}`,
        shelfName: `${((cardIndex + 2) % 8) + 1}`,
        comment: 'Перенос в более стабильную зону.',
        photoNote: 'Фото перемещения.',
      },
    ],
    [stages[3]]: [
      {
        type: 'greenhouseObservation',
        title: 'Наблюдение',
        growthRate: 'Средний',
        stressLevel: 'Низкий',
        stability: 'Стабильная',
        riskLevel: 'Низкий',
        conditionDescription: 'Состояние партии стабильное.',
        comment: 'Плановое наблюдение.',
        photoNote: 'Фото наблюдения.',
      },
      {
        type: 'greenhouseCare',
        title: 'Уход',
        careType: 'Полив',
        careIntervalDays: '2',
        wateringIntervalDays: '2',
        waterVolume: '1.5',
        productName: 'Комплексное удобрение',
        dosage: '10 мл',
        applicationMethod: 'Полив',
        plantReaction: 'Положительная',
        riskLevel: 'Низкий',
        comment: 'Регулярный уход выполнен.',
        photoNote: 'Фото ухода.',
      },
      {
        type: 'greenhouseEnvironment',
        title: 'Среда',
        environmentTemperature: '25',
        environmentAirHumidity: '70',
        environmentLight: 'Рассеянный',
        ventilation: 'Нормальная',
        placement: 'Центральный ряд',
        densityChange: 'Нет',
        growthRate: 'Средний',
        stability: 'Стабильная',
        riskLevel: 'Средний',
        comment: 'Среда контролируется.',
        photoNote: 'Фото среды.',
      },
      {
        type: 'greenhouseDisease',
        title: 'Болезни / вредители',
        diseaseName: 'Пятнистость листьев',
        pestName: 'Трипсы',
        diseaseSeverity: 'Средняя',
        riskLevel: 'Высокий',
        productName: 'Фунгицид',
        dosage: '15 мл',
        applicationMethod: 'Опрыскивание',
        plantReaction: 'Нейтральная',
        comment: 'Требуется обработка.',
        photoNote: 'Фото болезни.',
      },
      {
        type: 'problem',
        title: 'Проблема',
        problemType: 'Вредители',
        riskLevel: 'Критический',
        problemDescription: 'Риск распространения вредителей.',
        comment: 'Партия требует внимания.',
        photoNote: 'Фото проблемы.',
      },
      {
        type: 'movement',
        title: 'Перемещение',
        greenhouseName: `Теплица ${stageIndex + 1}`,
        rackName: `Стеллаж ${cardIndex + 4}`,
        shelfName: `${((cardIndex + 3) % 8) + 1}`,
        comment: 'Перемещение внутри теплицы.',
        photoNote: 'Фото перемещения.',
      },
    ],
    [stages[4]]: [
      {
        type: 'hardeningObservation',
        title: 'Наблюдение',
        stressLevel: 'Средний',
        turgor: 'Хороший',
        readinessForPlanting: 'Частично готова',
        comment: 'Контроль приживаемости после закалки.',
        photoNote: 'Фото наблюдения.',
      },
      {
        type: 'hardeningCare',
        title: 'Уход',
        careType: 'Полив',
        productName: 'Стимулятор',
        dosage: '5 мл',
        applicationMethod: 'Полив',
        plantReaction: 'Положительная',
        comment: 'Уход проведен согласно плану.',
        photoNote: 'Фото ухода.',
      },
      {
        type: 'problem',
        title: 'Проблема',
        problemType: 'Погодный стресс',
        riskLevel: 'Высокий',
        problemDescription: 'Партия реагирует на перепады условий.',
        comment: 'Нужен дополнительный контроль.',
        photoNote: 'Фото проблемы.',
      },
      {
        type: 'movement',
        title: 'Перемещение',
        greenhouseName: `Теплица ${stageIndex + 1}`,
        rackName: `Стеллаж ${cardIndex + 5}`,
        shelfName: `${((cardIndex + 4) % 8) + 1}`,
        comment: 'Перемещение на более светлое место.',
        photoNote: 'Фото перемещения.',
      },
    ],
    [stages[5]]: [
      {
        type: 'planting',
        title: 'Высадка',
        plantingLocation: 'Открытый грунт',
        plantingScheme: 'Схема 40x40',
        plotArea: 'Участок 1',
        soilType: 'Субстрат A',
        comment: 'Высадка выполнена по схеме.',
        photoNote: 'Фото высадки.',
      },
      {
        type: 'plantingObservation',
        title: 'Наблюдение',
        survivalRate: 'Высокая',
        stressLevel: 'Низкий',
        turgor: 'Хороший',
        comment: 'Приживаемость в норме.',
        photoNote: 'Фото наблюдения.',
      },
      {
        type: 'plantingCare',
        title: 'Уход',
        careType: 'Полив',
        productName: 'Удобрение для укоренения',
        dosage: '8 мл',
        applicationMethod: 'Полив',
        plantReaction: 'Положительная',
        comment: 'После высадки выполнен уход.',
        photoNote: 'Фото ухода.',
      },
      {
        type: 'plantingCompletion',
        title: 'Завершение',
        completionResult: 'Частично прижилась',
        comment: 'Высадка завершена, результат зафиксирован.',
        photoNote: 'Фото завершения.',
      },
      {
        type: 'problem',
        title: 'Проблема',
        problemType: 'Ожоги',
        riskLevel: 'Средний',
        problemDescription: 'Солнечный стресс после высадки.',
        comment: 'Нужен контроль состояния.',
        photoNote: 'Фото проблемы.',
      },
      {
        type: 'movement',
        title: 'Перемещение',
        greenhouseName: `Участок ${stageIndex + 1}`,
        rackName: `Ряд ${cardIndex + 1}`,
        shelfName: `${((cardIndex + 5) % 8) + 1}`,
        comment: 'Перенос в зону высадки.',
        photoNote: 'Фото перемещения.',
      },
    ],
  };

  const events = stageEvents[stage] || stageEvents[INTRO_STAGE];
  const eventSpec = events[(stageIndex + cardIndex) % events.length];
  const eventDate = buildEventDate(createdAt, 3 + (cardIndex % 4) * 3);

  return {
    ...eventSpec,
    stage,
    date: toIsoDate(eventDate <= updatedAt ? eventDate : updatedAt),
  };
}

function buildTestEventFromSpec(card, eventSpec, eventIndex, user) {
  const previousQuantity = getCardCurrentQuantity(card);
  const count = Number(eventSpec.count || eventSpec.rootedCount || eventSpec.saleAmount || 0) || 0;
  const createdAt = eventSpec.date ? new Date(eventSpec.date) : new Date(card.updatedAt || card.createdAt);
  const currentQuantity = eventSpec.type === 'statusChange'
    ? Math.max(
      previousQuantity
      + (Number(eventSpec.propagationCount) || 0)
      + (Number(eventSpec.rootedCount) || 0)
      - (Number(eventSpec.saleCount) || 0)
      - (Number(eventSpec.deathCount) || 0)
      - (Number(eventSpec.discardCount) || 0),
      0,
    )
    : ['sale', 'death', 'discard', 'introLoss'].includes(eventSpec.type)
    ? Math.max(previousQuantity - count, 0)
    : eventSpec.type === 'propagation'
      ? previousQuantity + count
      : previousQuantity;

  return {
    id: `${card.id || 'card'}-${eventSpec.type}-${eventIndex + 1}-${createdAt.getTime().toString(36)}`,
    type: eventSpec.type,
    title: eventSpec.title || eventSpec.type,
    stage: eventSpec.stage || card.stage || INTRO_STAGE,
    date: toIsoDate(createdAt),
    createdAt: createdAt.toISOString(),
    createdBy: user.id,
    createdByName: user.fullName || user.id,
    comment: eventSpec.comment || '',
    photoNote: eventSpec.photoNote || '',
    ...(eventSpec.photoUri ? { photoUri: eventSpec.photoUri } : {}),
    ...(Array.isArray(eventSpec.photoUris) && eventSpec.photoUris.length
      ? { photoUris: eventSpec.photoUris.filter(Boolean) }
      : {}),
    count,
    previousQuantity,
    currentQuantity,
    ...eventSpec,
    extraFields: {
      ...(eventSpec.extraFields || {}),
    },
  };
}

function applyEventToCardState(card, event) {
  const count = Number(event.count) || 0;
  const previousQuantity = Number(card.currentQuantity) || 0;

  if (['sale', 'death', 'discard', 'introLoss'].includes(event.type)) {
    card.currentQuantity = Math.max(previousQuantity - count, 0);

    if (event.type === 'sale') {
      card.batchStatus = card.currentQuantity === 0 ? 'sold' : 'partial';
    }

    return;
  }

  if (event.type === 'propagation') {
    card.currentQuantity = previousQuantity + count;
    return;
  }

  if (event.type === 'statusChange') {
    card.currentQuantity = Math.max(
      previousQuantity
      + (Number(event.rootedCount) || 0)
      + (Number(event.propagationCount) || 0)
      - (Number(event.saleCount) || 0)
      - (Number(event.deathCount) || 0)
      - (Number(event.discardCount) || 0),
      0,
    );

    if (Number(event.saleCount) > 0) {
      card.batchStatus = card.currentQuantity === 0 ? 'sold' : 'partial';
    }

    return;
  }

  if (event.type === 'qrGenerated') {
    card.qrStatus = 'printed';
    card.qrPrinted = true;
    card.qrPrintedAt = event.createdAt;
    card.qrPrintedBy = event.createdBy;
    return;
  }

  if (event.type === 'quarantine') {
    card.batchStatus = 'quarantine';
    card.sterilityStatus = 'contaminated';
    return;
  }

  if (event.type === 'quarantineReleased') {
    card.batchStatus = card.currentQuantity > 0 ? 'active' : card.batchStatus;
    return;
  }

  if (['problem', 'contamination', 'greenhouseDisease'].includes(event.type)) {
    card.batchStatus = 'problem';
    card.sterilityStatus = 'contaminated';
  }
}

function buildCoverageEventSpec(stage, stageIndex, cardIndex, card, createdAt, updatedAt) {
  const eventCount = STAGE_COVERAGE_CARD_COUNTS[stage] || 1;
  const normalizedIndex = cardIndex % eventCount;

  return buildStageEventSpec(
    stage,
    stageIndex,
    normalizedIndex,
    card,
    createdAt,
    updatedAt,
  );
}

function buildCoverageCard({
  existingIds,
  existingCodes,
  user,
  stage,
  stageIndex,
  cardIndex,
  createdAt,
  updatedAt,
  eventSpec,
  rng,
  quantityOverride,
}) {
  const cardSeedIndex = stageIndex * 100 + cardIndex;
  const profile = buildProfileForCulture(cardSeedIndex);
  const cardId = buildUniqueId({ existingIds, stage, index: cardSeedIndex, rng });
  const code = buildUniqueCode({
    createdAt,
    existingCodes,
    index: cardSeedIndex,
    stage,
    rng,
  });
  const quantity = Number.isFinite(Number(quantityOverride))
    ? Number(quantityOverride)
    : Math.max(60, 140 + stageIndex * 25 + cardIndex * 11);
  const qrStatus = randomChoice(['pending_print', 'printed'], rng);
  const qrPrintedAt = qrStatus === 'printed'
    ? randomDateBetween(createdAt, updatedAt, rng).toISOString()
    : null;

  const batchCreatedOperation = createBatchCreatedOperation({
    id: cardId,
    createdAt: toIsoDate(createdAt),
    stage: INTRO_STAGE,
    quantity,
    code,
    createdBy: user.id,
    createdByName: user.fullName || user.id,
  }, createdAt.toISOString());

  const baseCard = normalizeCultureCard({
    id: cardId,
    name: '',
    createdAt: toIsoDate(createdAt),
    updatedAt: updatedAt.toISOString(),
    updatedBy: user.id,
    createdBy: user.id,
    createdByName: user.fullName || user.id,
    cultureName: profile.cultureName,
    speciesName: profile.speciesName,
    varietyName: profile.varietyName,
    name: profile.originalName || '',
    code,
    quantity,
    sourceMaterial: randomChoice(SOURCE_MATERIAL_OPTIONS.slice(0, 4)),
    parentBatch: '',
    sterilityStatus: 'sterile',
    batchStatus: 'active',
    status: 'active',
    qrStatus,
    qrPrinted: qrStatus === 'printed',
    qrPrintedAt,
    qrPrintedBy: qrPrintedAt ? user.id : null,
    startPhotoNote: '',
    startPhotoUri: '',
    startPhotoUris: [],
    operations: [batchCreatedOperation],
    stage: INTRO_STAGE,
  });

  const card = stage === INTRO_STAGE
    ? baseCard
    : buildStageTransitionCard({
      card: baseCard,
      nextOperation: buildTransitionOperation({
        createdAt,
        fromStage: INTRO_STAGE,
        toStage: stage,
        quantity,
        operationId: `stage-change-${stageIndex}-${cardIndex}-${createdAt.getTime().toString(36)}`,
      }),
      nextStage: stage,
      nowIso: updatedAt.toISOString(),
      selectedCalendarDate: toIsoDate(updatedAt),
      selectedStage: INTRO_STAGE,
      userId: user.id,
    });

  card.currentQuantity = getCardCurrentQuantity(card);

  const coverageEvent = buildTestEventFromSpec(card, eventSpec, 1, user);
  applyEventToCardState(card, coverageEvent);
  card.operations = [...(card.operations || []), coverageEvent];
  card.name = card.name || `${card.cultureName} ${card.speciesName} ${card.varietyName}`
    .replace(/\s+/g, ' ')
    .trim();

  return {
    card,
    journalRecordsCount: card.operations.length,
  };
}

export function buildDevelopmentCoverageTestCultureCards(existingCards, { now = new Date(), user = currentUser, seed = 'coverage-seed-v1' } = {}) {
  const rng = createSeededRandom(normalizeSeed(seed));
  const nextCards = [...(existingCards || [])];
  const existingIds = new Set(nextCards.map((card) => `${card.id || ''}`));
  const existingCodes = new Set(
    nextCards
      .map((card) => `${card.code || ''}`.trim())
      .filter(Boolean),
  );
  const createdCards = [];
  const updatedWindowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const creationWindowStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const stagePlans = stages.map((stage, stageIndex) => ({
    stage,
    stageIndex,
    count: STAGE_COVERAGE_CARD_COUNTS[stage] || 1,
  }));

  for (const { stage, stageIndex, count } of stagePlans) {
    for (let cardIndex = 0; cardIndex < count; cardIndex += 1) {
      const createdAt = randomDateBetween(creationWindowStart, now, rng);
      const updatedAt = randomDateBetween(
        new Date(Math.max(createdAt.getTime(), updatedWindowStart.getTime())),
        now,
        rng,
      );
      const eventSpec = buildCoverageEventSpec(
        stage,
        stageIndex,
        cardIndex,
        { quantity: 140 + stageIndex * 25 + cardIndex * 11 },
        createdAt,
        updatedAt,
      );
      const { card } = buildCoverageCard({
      existingIds,
        existingCodes,
        user,
        stage,
        stageIndex,
        cardIndex,
        createdAt,
        updatedAt,
        eventSpec,
        rng,
      });

      createdCards.push(card);
    }
  }

  const extraScenarios = [
    {
      stage: INTRO_STAGE,
      stageIndex: 0,
      eventSpec: {
        type: 'qrGenerated',
        title: 'QR подготовлен к печати',
        qrStatus: 'printed',
        comment: 'QR-код подготовлен к печати.',
      },
    },
    {
      stage: INTRO_STAGE,
      stageIndex: 0,
      eventSpec: {
        type: 'comment',
        title: 'Комментарий',
        comment: 'Дополнительный комментарий к партии.',
        photoNote: 'Фото комментария.',
      },
    },
    {
      stage: INTRO_STAGE,
      stageIndex: 0,
      eventSpec: {
        type: 'photo',
        title: 'Фото',
        comment: 'Фотофиксация без дополнительного действия.',
        photoNote: 'Фотография партии.',
      },
    },
    {
      stage: INTRO_STAGE,
      stageIndex: 0,
      eventSpec: {
        type: 'contamination',
        title: 'Контаминация',
        problemType: 'Контаминация',
        riskLevel: 'Высокий',
        contaminationNote: 'Обнаружена контаминация на стартовой партии.',
        problemDescription: 'Требуется санитарный контроль.',
        comment: 'Партия помечена как проблемная.',
        photoNote: 'Фото контаминации.',
      },
    },
    {
      stage: INTRO_STAGE,
      stageIndex: 0,
      eventSpec: {
        type: 'quarantineReleased',
        title: 'Снятие карантина',
        reason: 'Риски устранены, партия возвращена в работу.',
        quarantineReason: 'Риски устранены, партия возвращена в работу.',
        comment: 'Карантин снят.',
      },
    },
    {
      stage: stages[1],
      stageIndex: 1,
      eventSpec: {
        type: 'statusChange',
        title: 'Изменение статуса',
        rootedCount: 12,
        rootingPercent: 40,
        propagationCount: 6,
        saleCount: 2,
        deathCount: 1,
        discardCount: 1,
        comment: 'Статусная операция для тестирования журнала.',
      },
    },
    {
      stage: stages[3],
      stageIndex: 3,
      eventSpec: {
        type: 'transplant',
        title: 'Пересадка',
        placement: 'Центральный ряд',
        densityChange: 'Уменьшена',
        growthRate: 'Средний',
        stability: 'Стабильная',
        comment: 'Пересадка внутри теплицы.',
        photoNote: 'Фото пересадки.',
      },
    },
    {
      stage: INTRO_STAGE,
      stageIndex: 0,
      quantityOverride: 1,
      eventSpec: {
        type: 'introLoss',
        title: 'Потери на минимальном остатке',
        count: 1,
        lossReason: 'Потери на минимальном остатке.',
        reason: 'Потери на минимальном остатке.',
        comment: 'Остаток ушел в ноль.',
        photoNote: '',
      },
    },
    {
      stage: stages[1],
      stageIndex: 1,
      quantityOverride: 1,
      eventSpec: {
        type: 'sale',
        title: 'Продажа на минимальном остатке',
        count: 1,
        saleType: 'Розничная',
        recipient: 'Демо-клиент',
        saleAmount: '1',
        comment: 'Продажа закрыла остаток.',
        photoNote: 'Фото продажи.',
        photoUri: TRANSPARENT_PIXEL_DATA_URI,
        photoUris: [TRANSPARENT_PIXEL_DATA_URI],
      },
    },
    {
      stage: stages[2],
      stageIndex: 2,
      quantityOverride: 2,
      eventSpec: {
        type: 'discard',
        title: 'Выбраковка с остатком 1',
        count: 1,
        reason: 'Отбраковка слабых экземпляров.',
        comment: 'Остаток после выбраковки 1.',
        photoNote: '',
      },
    },
    {
      stage: stages[4],
      stageIndex: 4,
      quantityOverride: 1,
      eventSpec: {
        type: 'death',
        title: 'Гибель на остатке 1',
        count: 1,
        reason: 'Гибель на минимальном остатке.',
        comment: 'Партия закрыта нулевым остатком.',
        photoNote: '',
      },
    },
    {
      stage: stages[5],
      stageIndex: 5,
      eventSpec: {
        type: 'plantingObservation',
        title: 'Наблюдение с пустыми доп.полями',
        survivalRate: 'Высокая',
        stressLevel: 'Низкий',
        turgor: 'Хороший',
        comment: '',
        photoNote: '',
      },
    },
  ];

  for (let index = 0; index < extraScenarios.length; index += 1) {
    const scenario = extraScenarios[index];
    const createdAt = randomDateBetween(creationWindowStart, now, rng);
    const updatedAt = randomDateBetween(
      new Date(Math.max(createdAt.getTime(), updatedWindowStart.getTime())),
      now,
      rng,
    );
    const { card } = buildCoverageCard({
      existingIds,
      existingCodes,
      user,
      stage: scenario.stage,
      stageIndex: scenario.stageIndex,
      cardIndex: index + 100,
      createdAt,
      updatedAt,
      eventSpec: scenario.eventSpec,
      rng,
      quantityOverride: scenario.quantityOverride,
    });

    if (scenario.eventSpec.type === 'statusChange') {
      card.currentQuantity = Math.max(
        (Number(card.currentQuantity) || 0) + (Number(scenario.eventSpec.propagationCount) || 0)
          - (Number(scenario.eventSpec.saleCount) || 0)
          - (Number(scenario.eventSpec.deathCount) || 0)
          - (Number(scenario.eventSpec.discardCount) || 0),
        0,
      );
    }

    createdCards.push(card);
  }

  const journalRecordsCount = createdCards.reduce(
    (sum, card) => sum + (card.operations || []).length,
    0,
  );

  return {
    createdCardsCount: createdCards.length,
    journalRecordsCount,
    nextCards: [...nextCards, ...createdCards],
  };
}
