const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const projectRoot = path.resolve(__dirname, '..');
const photoDir = path.join(projectRoot, 'docs', 'photo');
const reportsDir = path.join(projectRoot, 'docs', 'reports');
const packageJsonPath = path.join(projectRoot, 'package.json');
const appVersion = require(packageJsonPath).version || '';

const DAY_MS = 24 * 60 * 60 * 1000;
const INTRO_STAGE = 'Введение в культуру';
const STAGES = [
  INTRO_STAGE,
  'Клонирование',
  'Адаптация',
  'Теплица',
  'Закалка',
  'Высадка',
];
const CARDS_PER_REPORT = 10;

const EVENT_DETAIL_FIELDS = [
  'reason',
  'lossReason',
  'quarantineReason',
  'contaminationNote',
  'saleType',
  'recipient',
  'saleAmount',
  'propagationMethod',
  'fromStage',
  'toStage',
  'stageChangedAt',
  'rootedCount',
  'rootingPercent',
  'stressLevel',
  'turgor',
  'stability',
  'environmentTemperature',
  'environmentAirHumidity',
  'environmentHumidity',
  'substrateHumidity',
  'environmentLight',
  'ventilation',
  'humidityReduction',
  'careType',
  'growthRate',
  'conditionDescription',
  'readinessForPlanting',
  'survivalRate',
  'careIntervalDays',
  'wateringIntervalDays',
  'waterVolume',
  'productName',
  'dosage',
  'applicationMethod',
  'plantReaction',
  'diseaseName',
  'pestName',
  'diseaseSeverity',
  'placement',
  'densityChange',
  'problemType',
  'riskLevel',
  'problemDescription',
  'previousLocation',
  'nextLocation',
  'greenhouseName',
  'rackName',
  'shelfName',
  'plantingLocation',
  'plantingScheme',
  'plotArea',
  'soilType',
  'completionResult',
];

function buildStageSequence(extraStages = []) {
  const stageSequence = [...STAGES, ...extraStages];

  while (stageSequence.length < CARDS_PER_REPORT) {
    stageSequence.push(STAGES[stageSequence.length % STAGES.length]);
  }

  return stageSequence.slice(0, CARDS_PER_REPORT);
}

const CULTURES = [
  {
    cultureName: 'Монстера',
    speciesName: 'Monstera deliciosa',
    varietyName: 'Borsigiana',
  },
  {
    cultureName: 'Алоказия',
    speciesName: 'Alocasia cucullata',
    varietyName: 'Polly',
  },
  {
    cultureName: 'Антуриум',
    speciesName: 'Anthurium andraeanum',
    varietyName: 'Pink Champion',
  },
  {
    cultureName: 'Филодендрон',
    speciesName: 'Philodendron hederaceum',
    varietyName: 'Brasil',
  },
  {
    cultureName: 'Сингониум',
    speciesName: 'Syngonium podophyllum',
    varietyName: 'White Butterfly',
  },
  {
    cultureName: 'Спатифиллум',
    speciesName: 'Spathiphyllum wallisii',
    varietyName: 'Sensation',
  },
  {
    cultureName: 'Калатея',
    speciesName: 'Calathea lancifolia',
    varietyName: 'Rattlesnake',
  },
  {
    cultureName: 'Фикус',
    speciesName: 'Ficus elastica',
    varietyName: 'Robusta',
  },
  {
    cultureName: 'Драцена',
    speciesName: 'Dracaena marginata',
    varietyName: 'Tricolor',
  },
  {
    cultureName: 'Пеперомия',
    speciesName: 'Peperomia obtusifolia',
    varietyName: 'Green Gold',
  },
];

const REPORT_USERS = [
  {
    userId: 'demo-user-001',
    firstName: 'Иван',
    lastName: 'Петров',
    displayName: 'Иван Петров',
    role: 'Агроном',
  },
  {
    userId: 'demo-user-002',
    firstName: 'Мария',
    lastName: 'Иванова',
    displayName: 'Мария Иванова',
    role: 'Лаборант',
  },
  {
    userId: 'demo-user-003',
    firstName: 'Алексей',
    lastName: 'Сидоров',
    displayName: 'Алексей Сидоров',
    role: 'Технолог',
  },
  {
    userId: 'demo-user-004',
    firstName: 'Елена',
    lastName: 'Смирнова',
    displayName: 'Елена Смирнова',
    role: 'Сотрудник теплицы',
  },
  {
    userId: 'demo-user-005',
    firstName: 'Ильдар',
    lastName: 'Унайбеков',
    displayName: 'Ильдар Унайбеков',
    role: 'Администратор',
  },
];

const EXTRA_REPORT_USERS = [
  {
    userId: 'demo-user-006',
    firstName: 'Анна',
    lastName: 'Ковалева',
    displayName: 'Анна Ковалева',
    role: 'Агроном',
  },
  {
    userId: 'demo-user-007',
    firstName: 'Сергей',
    lastName: 'Мельников',
    displayName: 'Сергей Мельников',
    role: 'Лаборант',
  },
  {
    userId: 'demo-user-008',
    firstName: 'Ирина',
    lastName: 'Федорова',
    displayName: 'Ирина Федорова',
    role: 'Технолог',
  },
  {
    userId: 'demo-user-009',
    firstName: 'Павел',
    lastName: 'Соколов',
    displayName: 'Павел Соколов',
    role: 'Сотрудник теплицы',
  },
  {
    userId: 'demo-user-010',
    firstName: 'Светлана',
    lastName: 'Николаева',
    displayName: 'Светлана Николаева',
    role: 'Администратор',
  },
];

function normalizeText(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).replace(/\r?\n/g, ' ').trim();
}

function iso(value) {
  return new Date(value).toISOString();
}

function daysAgo(baseDate, days) {
  return new Date(baseDate.getTime() - days * DAY_MS);
}

function hoursAfter(baseDate, hours) {
  return new Date(baseDate.getTime() + hours * 60 * 60 * 1000);
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'report';
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function cleanupOldDemoReports() {
  if (!fs.existsSync(reportsDir)) {
    return;
  }

  for (const entry of fs.readdirSync(reportsDir)) {
    if (/^sadovnik-demo-report-.*\.zip$/i.test(entry)) {
      try {
        fs.unlinkSync(path.join(reportsDir, entry));
      } catch {
        // Keep going. On Windows the file can be briefly locked by shell tools.
      }
    }
  }
}

function loadPhotoPool() {
  if (!fs.existsSync(photoDir)) {
    throw new Error(`Photo directory not found: ${photoDir}`);
  }

  return fs
    .readdirSync(photoDir)
    .map((fileName) => path.join(photoDir, fileName))
    .filter((filePath) => /\.(jpe?g|png|webp)$/i.test(filePath))
    .sort((left, right) => left.localeCompare(right));
}

function stagePrefix(stage) {
  switch (stage) {
    case 'Клонирование':
      return 'KL';
    case 'Адаптация':
      return 'AD';
    case 'Теплица':
      return 'TP';
    case 'Закалка':
      return 'ZK';
    case 'Высадка':
      return 'VH';
    case INTRO_STAGE:
    default:
      return 'IV';
  }
}

const RACK_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function formatStorageLocation(greenhouseNumber, rackIndex, shelfNumber) {
  const rackLetter = RACK_LETTERS[rackIndex % RACK_LETTERS.length];
  return `Теплица ${greenhouseNumber}, Стеллаж ${rackLetter}, полка ${shelfNumber}`;
}

function locationByStage(stage, reportIndex, cardIndex) {
  const greenhouseNumber = reportIndex + 1;
  const rackIndex = reportIndex + cardIndex;
  const shelfNumber = (cardIndex % 8) + 1;

  return formatStorageLocation(greenhouseNumber, rackIndex, shelfNumber);
}

function createCardBlueprint(reportIndex, cardIndex, reportStageSequence, reportCreatedAt) {
  const culture = CULTURES[(reportIndex + cardIndex) % CULTURES.length];
  const stage = reportStageSequence[cardIndex];
  const quantity = 120 + reportIndex * 30 + cardIndex * 9;
  const batchStatus = 'active';
  const currentQuantity = quantity;
  const sterilityStatus = cardIndex % 3 === 0 ? 'sterile' : 'unchecked';

  const createdAt = iso(daysAgo(reportCreatedAt, 24 - cardIndex * 2));
  const updatedAt = iso(hoursAfter(new Date(createdAt), 12 + cardIndex * 4));

  return {
    cardId: `demo-report-${reportIndex + 1}-card-${String(cardIndex + 1).padStart(2, '0')}`,
    code: `${stagePrefix(stage)}-${String(reportIndex + 1).padStart(2, '0')}${String(cardIndex + 1).padStart(2, '0')}-${reportCreatedAt
      .toISOString()
      .slice(2, 10)
      .replaceAll('-', '')}`,
    cultureName: culture.cultureName,
    speciesName: culture.speciesName,
    varietyName: culture.varietyName,
    stage,
    batchStatus,
    sterilityStatus,
    quantity,
    currentQuantity,
    locationDescription: locationByStage(stage, reportIndex, cardIndex),
    createdAt,
    updatedAt,
    extraFields: {},
    events: [],
  };
}

function createBatchCreatedEvent(reportIndex, card, createdBy) {
  return {
    eventId: `${card.cardId}-event-01`,
    type: 'batchCreated',
    title: 'Создание партии',
    stage: INTRO_STAGE,
    date: card.createdAt,
    createdAt: card.createdAt,
    createdBy,
    comment: '',
    photoNote: '',
    photoFiles: [],
    problemType: '',
    riskLevel: '',
    count: 0,
    previousQuantity: 0,
    currentQuantity: card.quantity,
    extraFields: {
      reportIndex: reportIndex + 1,
    },
  };
}

function buildPhotoEntryName(eventId, sourcePath, photoIndex) {
  const extension = path.extname(sourcePath).toLowerCase() || '.jpg';
  return `photos/${eventId}-${photoIndex + 1}${extension}`;
}

function attachPhotoFiles(zip, eventId, sourcePath, photoIndex, photoFiles) {
  const entryName = buildPhotoEntryName(eventId, sourcePath, photoIndex);
  const fileBuffer = fs.readFileSync(sourcePath);
  zip.file(entryName, fileBuffer);
  photoFiles.push(entryName);
}

function foldLegacyPhotoEvents(extraEvents) {
  const normalizedEvents = [];

  for (const eventSpec of extraEvents) {
    if (eventSpec.type !== 'photo') {
      normalizedEvents.push({ ...eventSpec });
      continue;
    }

    const targetEvent = [...normalizedEvents]
      .reverse()
      .find((candidate) => candidate.cardIndex === eventSpec.cardIndex && candidate.type !== 'photo');

    if (!targetEvent) {
      continue;
    }

    targetEvent.photoNote = targetEvent.photoNote || eventSpec.photoNote || 'Фотофиксация события.';
    targetEvent.attachPhoto = true;
  }

  return normalizedEvents;
}

function buildDefaultEventDetails(eventSpec, card) {
  const defaults = {};
  const stageChangedAt = eventSpec.date || card.updatedAt;

  switch (eventSpec.type) {
    case 'comment':
      defaults.comment = eventSpec.comment || 'Рабочий комментарий по партии.';
      break;
    case 'contamination':
      defaults.problemType = eventSpec.problemType || 'Контаминация';
      defaults.riskLevel = eventSpec.riskLevel || 'Высокий';
      break;
    case 'quarantine':
      defaults.reason = eventSpec.reason || eventSpec.quarantineReason || eventSpec.comment || 'Партия требует изоляции.';
      defaults.quarantineReason = eventSpec.quarantineReason || defaults.reason;
      defaults.problemType = eventSpec.problemType || 'Карантин';
      defaults.riskLevel = eventSpec.riskLevel || 'Критический';
      break;
    case 'quarantineReleased':
      defaults.reason = eventSpec.reason || 'Риски устранены, партия возвращена в работу.';
      defaults.quarantineReason = eventSpec.quarantineReason || defaults.reason;
      defaults.riskLevel = eventSpec.riskLevel || 'Низкий';
      break;
    case 'introLoss':
      defaults.reason = eventSpec.reason || eventSpec.lossReason || eventSpec.comment || 'Потери зафиксированы при контрольном осмотре.';
      defaults.lossReason = eventSpec.lossReason || defaults.reason;
      break;
    case 'death':
      defaults.reason = eventSpec.reason || eventSpec.comment || 'Гибель растений после стрессового периода.';
      break;
    case 'discard':
      defaults.reason = eventSpec.reason || eventSpec.comment || 'Выбраковка по результатам осмотра.';
      break;
    case 'sale':
      defaults.saleType = eventSpec.saleType || 'Частичная реализация';
      defaults.recipient = eventSpec.recipient || 'Демо-клиент';
      defaults.saleAmount = eventSpec.saleAmount || '12500';
      break;
    case 'propagation':
      defaults.propagationMethod = eventSpec.propagationMethod || 'Черенкование';
      break;
    case 'stageChange':
      defaults.fromStage = eventSpec.fromStage || eventSpec.extraFields?.fromStage || INTRO_STAGE;
      defaults.toStage = eventSpec.toStage || eventSpec.extraFields?.toStage || eventSpec.stage || card.stage;
      defaults.stageChangedAt = eventSpec.stageChangedAt || stageChangedAt;
      defaults.rootedCount = eventSpec.rootedCount || 42;
      defaults.rootingPercent = eventSpec.rootingPercent || 86;
      break;
    case 'rooting':
      defaults.rootedCount = eventSpec.rootedCount || eventSpec.count || 12;
      defaults.rootingPercent = eventSpec.rootingPercent || 82;
      break;
    case 'adaptationStress':
      defaults.stressLevel = eventSpec.stressLevel || 'Средний';
      defaults.turgor = eventSpec.turgor || 'Сохранен';
      defaults.stability = eventSpec.stability || 'Стабилизируется';
      break;
    case 'adaptationEnvironment':
      defaults.environmentTemperature = eventSpec.environmentTemperature || '23 C';
      defaults.environmentAirHumidity = eventSpec.environmentAirHumidity || '78%';
      defaults.substrateHumidity = eventSpec.substrateHumidity || 'Умеренная';
      defaults.environmentLight = eventSpec.environmentLight || 'Рассеянный свет';
      defaults.ventilation = eventSpec.ventilation || 'Проветривание 2 раза в день';
      defaults.humidityReduction = eventSpec.humidityReduction || 'Плавное снижение';
      defaults.turgor = eventSpec.turgor || 'Хороший';
      defaults.stability = eventSpec.stability || 'Стабильная';
      break;
    case 'adaptationHumidityReduction':
      defaults.environmentAirHumidity = eventSpec.environmentAirHumidity || '70%';
      defaults.substrateHumidity = eventSpec.substrateHumidity || 'Контролируемая';
      defaults.humidityReduction = eventSpec.humidityReduction || 'Снижение на 5%';
      defaults.turgor = eventSpec.turgor || 'Без потери тургора';
      defaults.stability = eventSpec.stability || 'Стабильная';
      break;
    case 'adaptationCare':
      defaults.careType = eventSpec.careType || 'Полив';
      break;
    case 'greenhouseObservation':
      defaults.growthRate = eventSpec.growthRate || 'Активный рост';
      defaults.stressLevel = eventSpec.stressLevel || 'Низкий';
      defaults.stability = eventSpec.stability || 'Стабильная';
      defaults.riskLevel = eventSpec.riskLevel || 'Низкий';
      defaults.conditionDescription = eventSpec.conditionDescription || 'Листья плотные, прирост равномерный.';
      break;
    case 'greenhouseCare':
      defaults.careType = eventSpec.careType || 'Полив';
      defaults.careIntervalDays = eventSpec.careIntervalDays || '2';
      defaults.wateringIntervalDays = eventSpec.wateringIntervalDays || '2';
      defaults.waterVolume = eventSpec.waterVolume || '250 мл';
      defaults.productName = eventSpec.productName || 'Комплексное удобрение';
      defaults.dosage = eventSpec.dosage || '1 мл/л';
      defaults.applicationMethod = eventSpec.applicationMethod || 'Полив под корень';
      defaults.plantReaction = eventSpec.plantReaction || 'Реакция положительная';
      defaults.riskLevel = eventSpec.riskLevel || 'Низкий';
      break;
    case 'greenhouseEnvironment':
      defaults.environmentTemperature = eventSpec.environmentTemperature || '24 C';
      defaults.environmentAirHumidity = eventSpec.environmentAirHumidity || '64%';
      defaults.environmentLight = eventSpec.environmentLight || 'PPFD 160';
      defaults.ventilation = eventSpec.ventilation || 'Автоматическая вентиляция';
      defaults.placement = eventSpec.placement || 'Стеллаж верхний ярус';
      defaults.densityChange = eventSpec.densityChange || 'Разрежение посадки';
      defaults.growthRate = eventSpec.growthRate || 'Равномерный';
      defaults.stability = eventSpec.stability || 'Стабильная';
      defaults.riskLevel = eventSpec.riskLevel || 'Средний';
      break;
    case 'greenhouseDisease':
      defaults.diseaseName = eventSpec.diseaseName || 'Пятнистость листьев';
      defaults.pestName = eventSpec.pestName || 'Не выявлен';
      defaults.diseaseSeverity = eventSpec.diseaseSeverity || 'Средняя';
      defaults.productName = eventSpec.productName || 'Фунгицид';
      defaults.dosage = eventSpec.dosage || '2 мл/л';
      defaults.applicationMethod = eventSpec.applicationMethod || 'Опрыскивание';
      defaults.plantReaction = eventSpec.plantReaction || 'Распространение остановлено';
      defaults.riskLevel = eventSpec.riskLevel || 'Высокий';
      break;
    case 'hardeningObservation':
      defaults.stressLevel = eventSpec.stressLevel || 'Средний';
      defaults.turgor = eventSpec.turgor || 'Удовлетворительный';
      defaults.readinessForPlanting = eventSpec.readinessForPlanting || 'Готова через 3 дня';
      break;
    case 'hardeningCare':
      defaults.careType = eventSpec.careType || 'Профилактика';
      defaults.productName = eventSpec.productName || 'Антистресс';
      defaults.dosage = eventSpec.dosage || '1.5 мл/л';
      defaults.applicationMethod = eventSpec.applicationMethod || 'Листовая обработка';
      defaults.plantReaction = eventSpec.plantReaction || 'Тургор восстановлен';
      break;
    case 'planting':
      defaults.plantingLocation = eventSpec.plantingLocation || 'Грядка A-3';
      defaults.plantingScheme = eventSpec.plantingScheme || '30x40 см';
      defaults.plotArea = eventSpec.plotArea || '12 м2';
      defaults.soilType = eventSpec.soilType || 'Торфяной субстрат';
      break;
    case 'plantingObservation':
      defaults.survivalRate = eventSpec.survivalRate || 'Высокая';
      defaults.stressLevel = eventSpec.stressLevel || 'Низкий';
      defaults.turgor = eventSpec.turgor || 'Хороший';
      break;
    case 'plantingCare':
      defaults.careType = eventSpec.careType || 'Полив';
      defaults.productName = eventSpec.productName || 'Укоренитель';
      defaults.dosage = eventSpec.dosage || '1 г/л';
      defaults.applicationMethod = eventSpec.applicationMethod || 'Полив в посадочную лунку';
      defaults.plantReaction = eventSpec.plantReaction || 'Приживаемость без замечаний';
      break;
    case 'plantingCompletion':
      defaults.completionResult = eventSpec.completionResult || 'Высадка завершена';
      break;
    case 'problem':
      defaults.problemType = eventSpec.problemType || 'Отклонение состояния';
      defaults.riskLevel = eventSpec.riskLevel || 'Средний';
      defaults.problemDescription = eventSpec.problemDescription || eventSpec.comment || 'Проблема требует наблюдения.';
      break;
    case 'movement':
      defaults.previousLocation = eventSpec.previousLocation || card.locationDescription;
      defaults.greenhouseName = eventSpec.greenhouseName || `${card.cardId.slice(-2)}`;
      defaults.rackName = eventSpec.rackName || 'B';
      defaults.shelfName = eventSpec.shelfName || '2';
      defaults.nextLocation = eventSpec.nextLocation || `Теплица ${defaults.greenhouseName} · Стеллаж ${defaults.rackName} · Полка ${defaults.shelfName}`;
      break;
    case 'transplant':
      defaults.placement = eventSpec.placement || 'Контейнер 1.5 л';
      defaults.densityChange = eventSpec.densityChange || 'Снижена плотность';
      defaults.growthRate = eventSpec.growthRate || 'Активный рост после пересадки';
      defaults.stability = eventSpec.stability || 'Стабильная';
      break;
    default:
      break;
  }

  return defaults;
}

function buildReportDefinitions() {
  const definitions = [
    {
      reportIndex: 0,
      createdAt: new Date('2026-06-10T09:20:00.000Z'),
      user: REPORT_USERS[0],
      testLocation: 'Тестовая теплица №1',
      stageSequence: buildStageSequence([
        'Клонирование',
        INTRO_STAGE,
      ]),
      extraEvents: [
        {
          cardIndex: 1,
          type: 'contamination',
          title: 'Контаминация',
          stage: INTRO_STAGE,
          comment: 'На листьях замечены следы контаминации.',
          problemType: 'Контаминация',
          riskLevel: 'Высокий',
        },
        {
          cardIndex: 2,
          type: 'quarantine',
          title: 'Карантин',
          stage: INTRO_STAGE,
          comment: 'Партия изолирована после первичного осмотра.',
          problemType: 'Карантин',
          riskLevel: 'Критический',
        },
        {
          cardIndex: 2,
          type: 'introLoss',
          title: 'Потери',
          stage: INTRO_STAGE,
          comment: 'Часть растений выбыла после первичной проверки.',
          count: 4,
          previousQuantity: 118,
          currentQuantity: 114,
        },
        {
          cardIndex: 3,
          type: 'rooting',
          title: 'Укоренение',
          stage: 'Клонирование',
          comment: 'Зафиксировано укоренение после обработки.',
          count: 12,
        },
        {
          cardIndex: 4,
          type: 'propagation',
          title: 'Размножение',
          stage: 'Клонирование',
          comment: 'Запущено размножение на отдельных черенках.',
          count: 18,
        },
        {
          cardIndex: 5,
          type: 'stageChange',
          title: 'Переход стадии',
          stage: 'Клонирование',
          comment: 'Партия переведена в клонирование.',
          extraFields: {
            fromStage: INTRO_STAGE,
            toStage: 'Клонирование',
          },
        },
        {
          cardIndex: 6,
          type: 'comment',
          title: 'Комментарий',
          stage: INTRO_STAGE,
          comment: 'Паспорт партии проверен перед дальнейшими операциями.',
        },
        {
          cardIndex: 7,
          type: 'death',
          title: 'Гибель',
          stage: 'Клонирование',
          comment: 'Часть растений погибла после стрессового периода.',
          count: 3,
          previousQuantity: 147,
          currentQuantity: 144,
        },
        {
          cardIndex: 0,
          type: 'photo',
          title: 'Фото',
          stage: INTRO_STAGE,
          photoNote: 'Общий вид партии после контаминации.',
        },
        {
          cardIndex: 3,
          type: 'photo',
          title: 'Фото',
          stage: 'Клонирование',
          photoNote: 'Укореняющиеся растения после обработки.',
        },
        {
          cardIndex: 6,
          type: 'photo',
          title: 'Фото',
          stage: 'Клонирование',
          photoNote: 'Контрольный снимок партии перед переводом стадии.',
        },
      ],
    },
    {
      reportIndex: 1,
      createdAt: new Date('2026-06-11T09:20:00.000Z'),
      user: REPORT_USERS[1],
      testLocation: 'Лаборатория микроклонального размножения',
      stageSequence: buildStageSequence([
        'Адаптация',
        'Клонирование',
      ]),
      extraEvents: [
        {
          cardIndex: 0,
          type: 'adaptationStress',
          title: 'Наблюдение',
          stage: 'Адаптация',
          comment: 'Растения показали легкий стресс после переноса.',
        },
        {
          cardIndex: 1,
          type: 'adaptationCare',
          title: 'Уход',
          stage: 'Адаптация',
          comment: 'Полив в щадящем режиме после адаптации.',
          careType: 'Полив',
        },
        {
          cardIndex: 1,
          type: 'adaptationCare',
          title: 'Уход',
          stage: 'Адаптация',
          comment: 'Проведена подкормка по схеме адаптации.',
          careType: 'Подкормка',
        },
        {
          cardIndex: 6,
          type: 'adaptationEnvironment',
          title: 'Изменение среды',
          stage: 'Адаптация',
          comment: 'Скорректированы влажность и освещение в зоне адаптации.',
        },
        {
          cardIndex: 7,
          type: 'adaptationHumidityReduction',
          title: 'Снижение влажности',
          stage: 'Адаптация',
          comment: 'Влажность снижена по плану адаптации.',
        },
        {
          cardIndex: 2,
          type: 'problem',
          title: 'Проблема',
          stage: 'Адаптация',
          comment: 'Обнаружены симптомы болезни на нескольких экземплярах.',
          problemType: 'Болезнь',
          riskLevel: 'Высокий',
        },
        {
          cardIndex: 3,
          type: 'problem',
          title: 'Проблема',
          stage: 'Адаптация',
          comment: 'Зафиксировано поражение вредителями.',
          problemType: 'Вредители',
          riskLevel: 'Критический',
        },
        {
          cardIndex: 4,
          type: 'movement',
          title: 'Перемещение',
          stage: 'Адаптация',
          comment: 'Партия перемещена в более стабильную зону.',
        },
        {
          cardIndex: 5,
          type: 'introLoss',
          title: 'Потери',
          stage: 'Адаптация',
          comment: 'Часть растений потеряна в ходе адаптации.',
          count: 6,
          previousQuantity: 165,
          currentQuantity: 159,
        },
        {
          cardIndex: 5,
          type: 'sale',
          title: 'Продажа',
          stage: 'Адаптация',
          comment: 'Часть партии реализована после стабилизации.',
          count: 24,
          previousQuantity: 159,
          currentQuantity: 135,
        },
        {
          cardIndex: 0,
          type: 'photo',
          title: 'Фото',
          stage: 'Адаптация',
          photoNote: 'Партия после утреннего полива в адаптации.',
        },
        {
          cardIndex: 2,
          type: 'photo',
          title: 'Фото',
          stage: 'Адаптация',
          photoNote: 'Признаки заболевания на листьях.',
        },
        {
          cardIndex: 4,
          type: 'photo',
          title: 'Фото',
          stage: 'Адаптация',
          photoNote: 'Контрольный снимок партии перед перемещением.',
        },
      ],
    },
    {
      reportIndex: 2,
      createdAt: new Date('2026-06-12T09:20:00.000Z'),
      user: REPORT_USERS[2],
      testLocation: 'Теплица микроклонального цеха',
      stageSequence: buildStageSequence([
        'Теплица',
        'Адаптация',
      ]),
      extraEvents: [
        {
          cardIndex: 0,
          type: 'greenhouseObservation',
          title: 'Наблюдение',
          stage: 'Теплица',
          comment: 'Растения развиваются равномерно в тепличных условиях.',
        },
        {
          cardIndex: 1,
          type: 'greenhouseCare',
          title: 'Уход',
          stage: 'Теплица',
          comment: 'Проведен полив по тепличному графику.',
          careType: 'Полив',
          careIntervalDays: '2',
          wateringIntervalDays: '2',
          waterVolume: '250 мл',
        },
        {
          cardIndex: 1,
          type: 'greenhouseCare',
          title: 'Уход',
          stage: 'Теплица',
          comment: 'Внесено лечение по симптомам на листьях.',
          careType: 'Лечение',
          careIntervalDays: '7',
          productName: 'Фунгицид',
          dosage: '2 мл/л',
          applicationMethod: 'Опрыскивание',
          plantReaction: 'Состояние стабилизируется',
        },
        {
          cardIndex: 2,
          type: 'greenhouseEnvironment',
          title: 'Среда',
          stage: 'Теплица',
          comment: 'Изменена плотность размещения и режим вентиляции.',
        },
        {
          cardIndex: 2,
          type: 'quarantine',
          title: 'Карантин',
          stage: 'Теплица',
          comment: 'Партия переведена в карантинную секцию.',
          problemType: 'Карантин',
          riskLevel: 'Критический',
        },
        {
          cardIndex: 3,
          type: 'greenhouseDisease',
          title: 'Болезни / вредители',
          stage: 'Теплица',
          comment: 'Зафиксированы признаки грибковой болезни.',
          problemType: 'Болезнь',
          riskLevel: 'Высокий',
        },
        {
          cardIndex: 4,
          type: 'movement',
          title: 'Перемещение',
          stage: 'Теплица',
          comment: 'Партия перемещена на более светлую полку.',
        },
        {
          cardIndex: 5,
          type: 'transplant',
          title: 'Пересадка',
          stage: 'Теплица',
          comment: 'Проведена пересадка в больший контейнер.',
          count: 10,
        },
        {
          cardIndex: 6,
          type: 'introLoss',
          title: 'Потери',
          stage: 'Теплица',
          comment: 'Несколько экземпляров не выдержали тепличную нагрузку.',
          count: 3,
          previousQuantity: 183,
          currentQuantity: 180,
        },
        {
          cardIndex: 7,
          type: 'sale',
          title: 'Продажа',
          stage: 'Теплица',
          comment: 'Партия полностью реализована клиенту.',
          count: 22,
          sellAll: true,
          previousQuantity: 156,
          currentQuantity: 134,
        },
        {
          cardIndex: 0,
          type: 'photo',
          title: 'Фото',
          stage: 'Теплица',
          photoNote: 'Общий вид тепличной партии.',
        },
        {
          cardIndex: 3,
          type: 'photo',
          title: 'Фото',
          stage: 'Теплица',
          photoNote: 'Фиксация пересадки и последующего контроля.',
        },
        {
          cardIndex: 6,
          type: 'photo',
          title: 'Фото',
          stage: 'Теплица',
          photoNote: 'Снимок партии перед переводом на следующий этап.',
        },
      ],
    },
    {
      reportIndex: 3,
      createdAt: new Date('2026-06-13T09:20:00.000Z'),
      user: REPORT_USERS[3],
      testLocation: 'Закалочная площадка №2',
      stageSequence: buildStageSequence([
        'Закалка',
        'Теплица',
      ]),
      extraEvents: [
        {
          cardIndex: 0,
          type: 'hardeningObservation',
          title: 'Наблюдение',
          stage: 'Закалка',
          comment: 'Партия показывает готовность к высадке.',
        },
        {
          cardIndex: 1,
          type: 'hardeningCare',
          title: 'Уход',
          stage: 'Закалка',
          comment: 'Проведен поддерживающий уход на площадке закалки.',
        },
        {
          cardIndex: 2,
          type: 'problem',
          title: 'Проблема',
          stage: 'Закалка',
          comment: 'Обнаружены ожоги на части листьев.',
          problemType: 'Ожоги',
          riskLevel: 'Средний',
        },
        {
          cardIndex: 6,
          type: 'quarantineReleased',
          title: 'Снятие карантина',
          stage: 'Закалка',
          comment: 'После повторного осмотра карантин снят.',
          reason: 'Признаки риска не подтверждены.',
        },
        {
          cardIndex: 3,
          type: 'problem',
          title: 'Проблема',
          stage: 'Закалка',
          comment: 'Отмечено увядание в жаркий день.',
          problemType: 'Увядание',
          riskLevel: 'Высокий',
        },
        {
          cardIndex: 4,
          type: 'movement',
          title: 'Перемещение',
          stage: 'Закалка',
          comment: 'Партия перемещена в затененный сектор.',
        },
        {
          cardIndex: 5,
          type: 'discard',
          title: 'Выбраковка',
          stage: 'Закалка',
          comment: 'Непригодные экземпляры выбракованы после закалки.',
          count: 5,
          previousQuantity: 201,
          currentQuantity: 196,
        },
        {
          cardIndex: 5,
          type: 'sale',
          title: 'Продажа',
          stage: 'Закалка',
          comment: 'Часть подготовленной партии реализована.',
          count: 18,
          previousQuantity: 196,
          currentQuantity: 178,
        },
        {
          cardIndex: 0,
          type: 'photo',
          title: 'Фото',
          stage: 'Закалка',
          photoNote: 'Партия перед высадкой после закалки.',
        },
        {
          cardIndex: 2,
          type: 'photo',
          title: 'Фото',
          stage: 'Закалка',
          photoNote: 'Симптомы ожогов на листьях после закалки.',
        },
        {
          cardIndex: 4,
          type: 'photo',
          title: 'Фото',
          stage: 'Закалка',
          photoNote: 'Контрольный снимок партии перед перемещением.',
        },
      ],
    },
    {
      reportIndex: 4,
      createdAt: new Date('2026-06-14T09:20:00.000Z'),
      user: REPORT_USERS[4],
      testLocation: 'Участок высадки и смешанный журнал',
      stageSequence: buildStageSequence([
        'Высадка',
        'Закалка',
      ]),
      extraEvents: [
        {
          cardIndex: 0,
          type: 'planting',
          title: 'Высадка',
          stage: 'Высадка',
          comment: 'Выполнена высадка в постоянный субстрат.',
          count: 12,
        },
        {
          cardIndex: 1,
          type: 'plantingObservation',
          title: 'Наблюдение',
          stage: 'Высадка',
          comment: 'Отмечена хорошая приживаемость после высадки.',
        },
        {
          cardIndex: 1,
          type: 'plantingCare',
          title: 'Уход',
          stage: 'Высадка',
          comment: 'Проведен полив после высадки.',
          careType: 'Полив',
        },
        {
          cardIndex: 4,
          type: 'problem',
          title: 'Проблема',
          stage: 'Высадка',
          comment: 'Растения испытывают погодный стресс.',
          problemType: 'Погодный стресс',
          riskLevel: 'Высокий',
        },
        {
          cardIndex: 7,
          type: 'quarantine',
          title: 'Карантин',
          stage: 'Теплица',
          comment: 'Отдельная партия из смешанного журнала переведена в карантин.',
          problemType: 'Карантин',
          riskLevel: 'Критический',
        },
        {
          cardIndex: 5,
          type: 'introLoss',
          title: 'Потери',
          stage: 'Высадка',
          comment: 'Часть партии потеряна после пересадки.',
          count: 2,
          previousQuantity: 210,
          currentQuantity: 208,
        },
        {
          cardIndex: 5,
          type: 'sale',
          title: 'Продажа',
          stage: 'Высадка',
          comment: 'Часть высаженной партии реализована.',
          count: 16,
          previousQuantity: 208,
          currentQuantity: 192,
        },
        {
          cardIndex: 6,
          type: 'plantingCompletion',
          title: 'Завершение',
          stage: 'Высадка',
          comment: 'Высадка завершена без дополнительных замечаний.',
        },
        {
          cardIndex: 0,
          type: 'photo',
          title: 'Фото',
          stage: 'Высадка',
          photoNote: 'Состояние партии сразу после высадки.',
        },
        {
          cardIndex: 3,
          type: 'photo',
          title: 'Фото',
          stage: 'Высадка',
          photoNote: 'Снимок высадки на контрольном участке.',
        },
        {
          cardIndex: 7,
          type: 'photo',
          title: 'Фото',
          stage: 'Теплица',
          photoNote: 'Смешанный контрольный снимок партии из разных стадий.',
        },
      ],
    },
  ];

  const normalizedDefinitions = definitions.map((definition) => ({
    ...definition,
    extraEvents: foldLegacyPhotoEvents(definition.extraEvents),
  }));

  return [...normalizedDefinitions, ...buildExtraReportDefinitions(normalizedDefinitions)];
}

function buildExtraReportDefinitions(definitions) {
  return definitions.map((definition, index) => ({
    reportIndex: index + 5,
    createdAt: new Date(definition.createdAt.getTime() + 5 * DAY_MS),
    user: EXTRA_REPORT_USERS[index],
    testLocation: formatStorageLocation(index + 6, index + 5, 1),
    stageSequence: [...definition.stageSequence],
    extraEvents: definition.extraEvents.map((event) => ({
      ...event,
      extraFields: event.extraFields ? { ...event.extraFields } : undefined,
    })),
  }));
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
  };

  for (const card of cards) {
    summary.eventsCount += card.events.length;
    summary.problemCount += card.batchStatus === 'problem' ? 1 : 0;
    summary.activeCount += card.batchStatus === 'active' ? 1 : 0;
    summary.soldCount += card.batchStatus === 'sold' ? 1 : 0;
    summary.quarantineCount += card.batchStatus === 'quarantine' ? 1 : 0;
    summary.partialCount += card.batchStatus === 'partial' ? 1 : 0;
    summary.archivedCount += card.batchStatus === 'archived' ? 1 : 0;

    for (const event of card.events) {
      summary.photosCount += event.photoFiles.length;
      if (['problem', 'contamination', 'quarantine', 'greenhouseDisease'].includes(event.type)) {
        summary.problemsCount += 1;
      }
    }
  }

  return summary;
}

function applyEventToCardState(card, event) {
  const count = Number(event.count) || 0;
  const previousQuantity = Number(card.currentQuantity) || 0;

  if (['sale', 'death', 'discard', 'introLoss'].includes(event.type)) {
    event.previousQuantity = previousQuantity;
    event.currentQuantity = Math.max(previousQuantity - count, 0);
    card.currentQuantity = event.currentQuantity;

    if (event.type === 'sale') {
      card.batchStatus = card.currentQuantity === 0 ? 'sold' : 'partial';
    }

    return;
  }

  if (event.type === 'propagation') {
    event.previousQuantity = previousQuantity;
    event.currentQuantity = previousQuantity + count;
    card.currentQuantity = event.currentQuantity;
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
    return;
  }

  if (event.type === 'plantingCompletion') {
    card.batchStatus = 'archived';
  }
}

function buildEventFromSpec({
  reportIndex,
  card,
  createdBy,
  eventSpec,
  eventNumber,
  sourcePhotoPath,
}) {
  const eventDate = eventSpec.date || card.createdAt;
  const eventId = eventSpec.eventId || `${card.cardId}-event-${String(eventNumber).padStart(2, '0')}`;
  const photoFiles = [];
  const eventDetails = {
    ...buildDefaultEventDetails(eventSpec, card),
    ...eventSpec,
  };

  if (eventSpec.attachPhoto && sourcePhotoPath) {
    attachPhotoFiles(eventSpec.zip, eventId, sourcePhotoPath, 0, photoFiles);
  }

  const event = {
    eventId,
    type: eventSpec.type,
    title: eventSpec.title || eventSpec.type,
    stage: eventSpec.stage || card.stage,
    date: eventDate,
    createdAt: eventDate,
    createdBy,
    comment: normalizeText(eventSpec.comment),
    photoNote: normalizeText(eventSpec.photoNote),
    photoFiles,
    problemType: normalizeText(eventSpec.problemType),
    riskLevel: normalizeText(eventSpec.riskLevel),
    count: eventSpec.sellAll
      ? Number(card.currentQuantity) || 0
      : Number.isFinite(Number(eventSpec.count))
        ? Number(eventSpec.count)
        : 0,
    previousQuantity: Number.isFinite(Number(eventSpec.previousQuantity))
      ? Number(eventSpec.previousQuantity)
      : card.currentQuantity,
    currentQuantity: Number.isFinite(Number(eventSpec.currentQuantity))
      ? Number(eventSpec.currentQuantity)
      : card.currentQuantity,
    extraFields: {
      ...(eventSpec.extraFields || {}),
      reportIndex: reportIndex + 1,
    },
  };

  for (const field of EVENT_DETAIL_FIELDS) {
    if (eventDetails[field] !== undefined && eventDetails[field] !== null) {
      event[field] = typeof eventDetails[field] === 'string'
        ? normalizeText(eventDetails[field])
        : eventDetails[field];
    }
  }

  return event;
}

async function buildReportZip(definition, photoPool) {
  const zip = new JSZip();
  const reportCreatedAt = definition.createdAt;
  const createdBy = definition.user.userId;
  let photoCursor = 0;

  const cards = definition.stageSequence.map((stage, cardIndex) => {
    const card = createCardBlueprint(
      definition.reportIndex,
      cardIndex,
      definition.stageSequence,
      reportCreatedAt,
    );

    const batchCreatedEvent = createBatchCreatedEvent(definition.reportIndex, card, createdBy);
    card.events.push(batchCreatedEvent);

    const cardExtraEvents = [];
    definition.extraEvents
      .filter((event) => event.cardIndex === cardIndex)
      .forEach((eventSpec, eventIndex) => {
        const eventDate = iso(hoursAfter(new Date(card.createdAt), 6 + eventIndex * 6));
        const eventWithDate = {
          ...eventSpec,
          date: eventDate,
        };

        let nextEvent;
        if (eventSpec.attachPhoto) {
          const sourcePhotoPath = photoPool[photoCursor % photoPool.length];
          photoCursor += 1;
          eventWithDate.zip = zip;
          nextEvent = buildEventFromSpec({
            reportIndex: definition.reportIndex,
            card,
            createdBy,
            eventSpec: eventWithDate,
            eventNumber: eventIndex + 2,
            sourcePhotoPath,
          });
        } else {
          nextEvent = buildEventFromSpec({
            reportIndex: definition.reportIndex,
            card,
            createdBy,
            eventSpec: eventWithDate,
            eventNumber: eventIndex + 2,
          });
        }

        applyEventToCardState(card, nextEvent);
        cardExtraEvents.push(nextEvent);
      });

    card.events.push(...cardExtraEvents);
    card.events.sort((left, right) => left.createdAt.localeCompare(right.createdAt));

    const lastEventDate = card.events[card.events.length - 1]?.createdAt || card.updatedAt;
    card.updatedAt = iso(hoursAfter(new Date(lastEventDate), 3));
    return card;
  });

  const report = {
    reportId: `demo-report-${definition.reportIndex + 1}-${definition.createdAt.toISOString().slice(0, 10)}-${definition.user.userId}`,
    createdAt: iso(definition.createdAt),
    appVersion,
    deviceId: `demo-device-${String(definition.reportIndex + 1).padStart(2, '0')}`,
    user: {
      userId: definition.user.userId,
      firstName: definition.user.firstName,
      lastName: definition.user.lastName,
      displayName: definition.user.displayName,
      role: definition.user.role,
    },
    testLocation: formatStorageLocation(definition.reportIndex + 1, definition.reportIndex, 1),
    summary: buildSummary(cards),
    cards: cards.map((card) => ({
      ...card,
      extraFields: card.extraFields || {},
      events: card.events.map((event) => ({
        ...event,
        extraFields: event.extraFields || {},
      })),
    })),
  };

  zip.file('report.json', JSON.stringify(report, null, 2));

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 9,
    },
  });

  const datePart = report.createdAt.slice(0, 10);
  const userSlug = slugify(definition.user.userId);
  const fileName = `sadovnik-demo-report-${String(definition.reportIndex + 1).padStart(2, '0')}-${datePart}-${userSlug}.zip`;
  const filePath = path.join(reportsDir, fileName);

  fs.writeFileSync(filePath, zipBuffer);

  return {
    fileName,
    filePath,
    report,
  };
}

async function main() {
  ensureDir(reportsDir);

  const photoPool = loadPhotoPool();
  if (photoPool.length === 0) {
    throw new Error(`No source photos found in ${photoDir}`);
  }

  const definitions = buildReportDefinitions();
  const results = [];

  for (const definition of definitions) {
    results.push(await buildReportZip(definition, photoPool));
  }

  const generatedCount = results.filter((result) => !result.skipped).length;
  console.log(`Generated ${generatedCount} demo ZIP reports in ${reportsDir}`);
  for (const result of results) {
    console.log(`${result.skipped ? 'skipped' : 'created'} ${result.fileName}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

