import { createBatchCreatedOperation, normalizeCultureCard } from './batch.js';
import { currentUser, INTRO_STAGE, SOURCE_MATERIAL_OPTIONS, stages } from './constants.js';
import { isoFromDate } from './dates.js';
import { buildStageChangeOperation, buildStageTransitionCard } from './stageTransition.js';

const STAGE_ORDER = stages.slice(0, 4);

const CULTURE_PROFILES = [
  {
    cultureName: 'Монстера',
    speciesOptions: ['deliciosa', 'adansonii'],
    varietyOptions: ['Thai Constellation', 'Variegata', 'Monkey Mask'],
  },
  {
    cultureName: 'Филодендрон',
    speciesOptions: ['billietiae', 'tatei', 'verrucosum'],
    varietyOptions: ['Birkin', 'White Wizard', 'Black Cardinal', 'Selloum Gold Variegata', 'Sun Red'],
  },
  {
    cultureName: 'Антуриум',
    speciesOptions: ['crystallinum', 'clarinervium'],
    varietyOptions: ['Dark Form', 'Forgetti', 'Warocqueanum'],
  },
  {
    cultureName: 'Алоказия',
    speciesOptions: ['azlanii', 'baginda', 'odora'],
    varietyOptions: ['Dragon Scale', 'Batik', 'Regal Shields', 'Melo', 'Ninja Variegated'],
  },
  {
    cultureName: 'Спатифиллум',
    speciesOptions: ['wallisii', 'sensation'],
    varietyOptions: ['Domino', 'Sweet Pablo', 'Cupido'],
  },
  {
    cultureName: 'Орхидея',
    speciesOptions: ['phalaenopsis', 'cattleya', 'dendrobium'],
    varietyOptions: ['Phalaenopsis', 'Cattleya', 'Dendrobium'],
  },
  {
    cultureName: 'Фикус',
    speciesOptions: ['elastica', 'benghalensis'],
    varietyOptions: ['Tineke', 'Robusta', 'Abidjan', 'Siveriana'],
  },
  {
    cultureName: 'Аглаонема',
    speciesOptions: ['commutatum', 'modestum'],
    varietyOptions: ['Silver Bay', 'Maria', 'Red Emerald', 'Anyamanee'],
  },
  {
    cultureName: 'Калатея',
    speciesOptions: ['orbifolia', 'medallion'],
    varietyOptions: ['White Fusion', 'Freddie', 'Beauty Star'],
  },
  {
    cultureName: 'Сингониум',
    speciesOptions: ['podophyllum'],
    varietyOptions: ['Neon Robusta', 'Pink Allusion', 'Milk Confetti'],
  },
  {
    cultureName: 'Хойя',
    speciesOptions: ['carnosa', 'obovata'],
    varietyOptions: ['Compacta', 'Kerrii', 'Pubicalyx'],
  },
  {
    cultureName: 'Пеперомия',
    speciesOptions: ['polybotrya', 'caperata'],
    varietyOptions: ['Rosso', 'Watermelon', 'Hope'],
  },
  {
    cultureName: 'Диффенбахия',
    speciesOptions: ['seguine', 'amoena'],
    varietyOptions: ['Camille', 'Tropic Snow', 'Reflector'],
  },
  {
    cultureName: 'Драцена',
    speciesOptions: ['fragrans', 'marginata'],
    varietyOptions: ['Compacta', 'Lemon Lime', 'Janet Craig'],
  },
  {
    cultureName: 'Замиокулькас',
    speciesOptions: ['zamiifolia'],
    varietyOptions: ['Raven', 'Zenzi', 'Zamicro'],
  },
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(items) {
  return items[randomInt(0, items.length - 1)];
}

function randomDateBetween(start, end) {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const min = Math.min(startTime, endTime);
  const max = Math.max(startTime, endTime);
  return new Date(min + Math.random() * (max - min));
}

function toIsoDate(value) {
  return isoFromDate(value instanceof Date ? value : new Date(value));
}

function buildProfileForCulture(cultureName) {
  const profile = CULTURE_PROFILES.find((item) => item.cultureName === cultureName);

  if (!profile) {
    return {
      cultureName,
      speciesName: '',
      varietyName: '',
    };
  }

  return {
    cultureName: profile.cultureName,
    speciesName: randomChoice(profile.speciesOptions),
    varietyName: randomChoice(profile.varietyOptions),
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
}) {
  return buildStageChangeOperation({
    currentQuantity: quantity,
    nextStage: toStage,
    nowIso: createdAt.toISOString(),
    selectedCard: {
      stage: fromStage,
      quantity,
    },
    selectedCalendarDate: toIsoDate(createdAt),
  });
}

function buildUniqueCode({ stage, createdAt, existingCodes, index }) {
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
    const code = `${stagePrefix}-${datePart}-${String(index + 1).padStart(2, '0')}-${randomInt(1000, 9999)}`;
    if (!existingCodes.has(code)) {
      existingCodes.add(code);
      return code;
    }

    attempt += 1;
  }

  const fallbackCode = `${stagePrefix}-${datePart}-${index + 1}-${Date.now().toString(36)}`;
  existingCodes.add(fallbackCode);
  return fallbackCode;
}

function buildUniqueId({ existingIds, stage, index }) {
  let attempt = 0;
  while (attempt < 20) {
    const candidate = `test-${stage.replaceAll(/\s+/g, '-').toLowerCase()}-${index + 1}-${Date.now().toString(36)}-${randomInt(1000, 9999)}`;
    if (!existingIds.has(candidate)) {
      existingIds.add(candidate);
      return candidate;
    }

    attempt += 1;
  }

  const fallbackId = `test-${stage.replaceAll(/\s+/g, '-').toLowerCase()}-${index + 1}-${Math.random().toString(36).slice(2, 10)}`;
  existingIds.add(fallbackId);
  return fallbackId;
}

export function buildDevelopmentTestCultureCards(existingCards, { now = new Date(), user = currentUser } = {}) {
  const nextCards = [...(existingCards || [])];
  const existingIds = new Set(nextCards.map((card) => `${card.id || ''}`));
  const existingCodes = new Set(
    nextCards
      .map((card) => `${card.code || ''}`.trim())
      .filter(Boolean),
  );
  const createdCards = [];
  const stagesToSeed = STAGE_ORDER;
  const updatedWindowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const creationWindowStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  stagesToSeed.forEach((stage, stageIndex) => {
    for (let index = 0; index < 10; index += 1) {
      const createdAt = randomDateBetween(creationWindowStart, now);
      const updatedAt = randomDateBetween(
        new Date(Math.max(createdAt.getTime(), updatedWindowStart.getTime())),
        now,
      );
      const profile = buildProfileForCulture(CULTURE_PROFILES[(stageIndex * 10 + index) % CULTURE_PROFILES.length].cultureName);
      const cardId = buildUniqueId({ existingIds, stage, index: stageIndex * 10 + index });
      const code = buildUniqueCode({
        createdAt,
        existingCodes,
        index: stageIndex * 10 + index,
        stage,
      });
      const quantity = randomInt(50, 5000);
      const qrStatus = randomChoice(['pending_print', 'printed']);
      const qrPrintedAt = qrStatus === 'printed'
        ? randomDateBetween(createdAt, updatedAt).toISOString()
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
            createdAt: updatedAt,
            fromStage: INTRO_STAGE,
            toStage: stage,
            quantity,
          }),
          nextStage: stage,
          nowIso: updatedAt.toISOString(),
          selectedCalendarDate: toIsoDate(updatedAt),
          selectedStage: INTRO_STAGE,
          userId: user.id,
        });

      card.name = card.name || `${card.cultureName} ${card.speciesName} ${card.varietyName}`
        .replace(/\s+/g, ' ')
        .trim();
      createdCards.push(card);
    }
  });

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
