const assert = require('node:assert/strict');
const test = require('node:test');

const {
  getLatestOperation,
  getLatestOperationValue,
  sortOperationsByLatest,
} = require('../../src/domain/operationTimeline');
const {
  getProblemStateFromOperations,
} = require('../../src/domain/problemState');
const {
  calculateCurrentQuantity,
  formatActionCardQuantityDisplay,
  formatMixedBatchProblemBreakdown,
  getCardActiveProblemQuantity,
  getCardUnisolatedProblemQuantity,
} = require('../../src/domain/batch');
const {
  CULTURE_CARDS_STORAGE_BACKUP_KEY,
  CULTURE_CARDS_RESET_KEY,
  CULTURE_CARDS_STORAGE_KEY,
  CULTURE_CARDS_STORAGE_SCHEMA_VERSION,
  INTRO_STAGE,
} = require('../../src/domain/constants');
const {
  createCultureCardsStorage,
} = require('../../src/services/cultureCardsStorage');
const {
  createCultureCardRepository,
} = require('../../src/repositories/cultureCardRepository');
const {
  buildUniquePlantingCode,
  normalizeCode,
} = require('../../src/domain/codeGeneration');

function createMemoryAsyncStorage(initialValues = {}) {
  const store = new Map(Object.entries(initialValues));
  const setCalls = [];

  return {
    setCalls,
    async getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async setItem(key, value) {
      setCalls.push([key, value]);
      store.set(key, value);
    },
    async removeItem(key) {
      store.delete(key);
    },
  };
}

test('operation timeline prefers updatedAt over createdAt and date', () => {
  const operations = [
    { type: 'problem', riskLevel: 'old', date: '2026-07-20', createdAt: '2026-07-20T10:00:00.000Z' },
    { type: 'problem', riskLevel: 'latest', date: '2026-07-19', createdAt: '2026-07-19T10:00:00.000Z', updatedAt: '2026-07-21T10:00:00.000Z' },
    { type: 'problemRecovery', riskLevel: 'recovered', createdAt: '2026-07-22T10:00:00.000Z' },
  ];

  assert.equal(getLatestOperation(operations, 'problem').riskLevel, 'latest');
  assert.equal(getLatestOperationValue(operations, ['problem', 'problemRecovery'], 'riskLevel'), 'recovered');
  assert.deepEqual(sortOperationsByLatest(operations).map((operation) => operation.riskLevel), [
    'recovered',
    'latest',
    'old',
  ]);
});

test('problem state removes isolated problem quantity from a parent batch', () => {
  const parentCard = {
    quantity: 1234,
    stage: INTRO_STAGE,
    operations: [
      { type: 'problem', affectedQuantity: 1000, createdAt: '2026-07-27T16:16:00.000Z' },
      { type: 'problemIsolation', count: 1000, childCode: 'VK-20260727-192105', createdAt: '2026-07-27T16:21:00.000Z' },
    ],
  };

  assert.equal(calculateCurrentQuantity(parentCard), 234);
  assert.equal(getCardActiveProblemQuantity(parentCard), 0);
  assert.equal(getCardUnisolatedProblemQuantity(parentCard), 0);
});

test('full-batch contamination keeps remaining plants active after partial isolation', () => {
  const parentCard = {
    quantity: 100,
    stage: INTRO_STAGE,
    operations: [
      { type: 'contamination', createdAt: '2026-07-27T16:16:00.000Z' },
      { type: 'problemIsolation', count: 40, childCode: 'VK-20260727-192105', createdAt: '2026-07-27T16:21:00.000Z' },
    ],
  };

  assert.equal(calculateCurrentQuantity(parentCard), 60);
  assert.equal(getCardActiveProblemQuantity(parentCard), 60);
  assert.equal(getCardUnisolatedProblemQuantity(parentCard), 60);
});

test('problem journal overrides stale stored active quantity after full recovery', () => {
  const state = getProblemStateFromOperations([
    { type: 'problem', affectedQuantity: 40, createdAt: '2026-07-27T16:00:00.000Z' },
    { type: 'problemRecovery', recoveredQuantity: 40, createdAt: '2026-07-27T17:00:00.000Z' },
  ], {
    activeProblemQuantity: 40,
    currentQuantity: 100,
    stage: INTRO_STAGE,
  });

  assert.equal(state.activeProblemQuantity, 0);
  assert.equal(state.isActive, false);
});

test('problem journal calculates partial recovery without stale stored maximum', () => {
  const state = getProblemStateFromOperations([
    { type: 'problem', affectedQuantity: 50, createdAt: '2026-07-27T16:00:00.000Z' },
    { type: 'problemRecovery', recoveredQuantity: 20, createdAt: '2026-07-27T17:00:00.000Z' },
  ], {
    activeProblemQuantity: 80,
    currentQuantity: 100,
    stage: INTRO_STAGE,
  });

  assert.equal(state.activeProblemQuantity, 30);
});

test('problem journal clamps several consecutive recoveries to zero', () => {
  const state = getProblemStateFromOperations([
    { type: 'problem', affectedQuantity: 50, createdAt: '2026-07-27T16:00:00.000Z' },
    { type: 'problemRecovery', recoveredQuantity: 20, createdAt: '2026-07-27T17:00:00.000Z' },
    { type: 'problemRecovery', recoveredQuantity: 50, createdAt: '2026-07-27T18:00:00.000Z' },
  ], {
    activeProblemQuantity: 50,
    currentQuantity: 100,
    stage: INTRO_STAGE,
  });

  assert.equal(state.activeProblemQuantity, 0);
  assert.equal(state.isActive, false);
});

test('problem journal handles new problem after recovery', () => {
  const state = getProblemStateFromOperations([
    { type: 'problem', affectedQuantity: 50, createdAt: '2026-07-27T16:00:00.000Z' },
    { type: 'problemRecovery', recoveredQuantity: 50, createdAt: '2026-07-27T17:00:00.000Z' },
    { type: 'problem', affectedQuantity: 15, createdAt: '2026-07-27T18:00:00.000Z' },
  ], {
    activeProblemQuantity: 50,
    currentQuantity: 100,
    stage: INTRO_STAGE,
  });

  assert.equal(state.activeProblemQuantity, 15);
});

test('problem journal sums two consecutive problem events', () => {
  const state = getProblemStateFromOperations([
    { type: 'problem', affectedQuantity: 20, createdAt: '2026-07-27T16:00:00.000Z' },
    { type: 'problem', affectedQuantity: 15, createdAt: '2026-07-27T17:00:00.000Z' },
  ], {
    currentQuantity: 100,
    stage: INTRO_STAGE,
  });

  assert.equal(state.activeProblemQuantity, 35);
});

test('legacy stored active quantity is used only without problem journal events', () => {
  const legacyCard = {
    quantity: 100,
    activeProblemQuantity: 12,
    stage: INTRO_STAGE,
    operations: [
      { type: 'batchCreated', quantity: 100, createdAt: '2026-07-27T16:00:00.000Z' },
    ],
  };

  assert.equal(getCardActiveProblemQuantity(legacyCard), 12);
});

test('problem state keeps isolated child marked as problem but without parent isolation notice', () => {
  const childOperations = [
    { type: 'contamination', createdAt: '2026-07-27T16:16:00.000Z' },
    { type: 'isolatedFromParent', parentCode: 'VK-20260727-191538', quantity: 1000, createdAt: '2026-07-27T16:21:00.000Z' },
  ];
  const childState = getProblemStateFromOperations(childOperations, {
    currentQuantity: 1000,
    originType: 'problemIsolation',
    stage: INTRO_STAGE,
  });

  assert.equal(childState.activeProblemQuantity, 1000);
  assert.equal(childState.unisolatedProblemQuantity, 0);
  assert.equal(childState.batchStatus, 'problem');
  assert.equal(childState.isActive, true);
});

test('mixed problem breakdown is not used for isolated child batches', () => {
  const isolatedChildCard = {
    quantity: 1000,
    originType: 'problemIsolation',
    stage: INTRO_STAGE,
    operations: [
      { type: 'contamination', createdAt: '2026-07-27T16:16:00.000Z' },
      { type: 'isolatedFromParent', parentCode: 'VK-20260727-191538', quantity: 1000, createdAt: '2026-07-27T16:21:00.000Z' },
    ],
  };

  assert.equal(formatMixedBatchProblemBreakdown(isolatedChildCard), '');
  assert.equal(formatActionCardQuantityDisplay(isolatedChildCard), '1000 шт.');
});

test('mixed problem breakdown is shown only when healthy and problem quantities coexist', () => {
  const mixedCard = {
    quantity: 100,
    stage: INTRO_STAGE,
    operations: [
      { type: 'problem', affectedQuantity: 40, createdAt: '2026-07-27T16:16:00.000Z' },
    ],
  };

  assert.equal(formatMixedBatchProblemBreakdown(mixedCard), '60 здоровых · 40 с проблемой');
});

test('planting codes are case-insensitive and get a suffix on collision', () => {
  const OriginalDate = global.Date;
  const fixedDate = '2026-07-27T19:21:05.000';

  class FixedDate extends OriginalDate {
    constructor(...args) {
      super(...(args.length ? args : [fixedDate]));
    }

    static now() {
      return new OriginalDate(fixedDate).getTime();
    }
  }

  global.Date = FixedDate;

  try {
    assert.equal(normalizeCode(' VK-20260727-192105 '), 'vk-20260727-192105');

    const code = buildUniquePlantingCode({
      cultureCards: [{ id: 'existing', code: 'vk-20260727-192105' }],
      createdAt: '2026-07-27',
      selectedStage: INTRO_STAGE,
    });

    assert.equal(code, 'VK-20260727-192105-01');
  } finally {
    global.Date = OriginalDate;
  }
});

test('legacy array storage is migrated to the current envelope after normalization', async () => {
  const legacyCards = [{
    id: 'legacy-card-1',
    code: 'VK-20260727-000001',
    cultureName: 'Аглонема',
    quantity: 12,
    stage: INTRO_STAGE,
    createdAt: '2026-07-27',
  }];
  const storage = createMemoryAsyncStorage({
    [CULTURE_CARDS_RESET_KEY]: 'true',
    [CULTURE_CARDS_STORAGE_KEY]: JSON.stringify(legacyCards),
  });
  const service = createCultureCardsStorage(storage);

  const loadedCards = await service.loadCultureCardsFromStorage();
  const migratedValue = JSON.parse(await storage.getItem(CULTURE_CARDS_STORAGE_KEY));

  assert.equal(loadedCards.length, 1);
  assert.equal(migratedValue.schemaVersion, CULTURE_CARDS_STORAGE_SCHEMA_VERSION);
  assert.equal(Array.isArray(migratedValue.cards), true);
  assert.equal(migratedValue.cards[0].id, 'legacy-card-1');
  assert.equal(await storage.getItem(CULTURE_CARDS_STORAGE_BACKUP_KEY), JSON.stringify(legacyCards));

  const setCallCountAfterMigration = storage.setCalls.length;
  await service.loadCultureCardsFromStorage();

  assert.equal(storage.setCalls.length, setCallCountAfterMigration);
});

test('current envelope storage is loaded without rewriting it', async () => {
  const envelope = {
    schemaVersion: CULTURE_CARDS_STORAGE_SCHEMA_VERSION,
    savedAt: '2026-07-27T00:00:00.000Z',
    cards: [{
      id: 'envelope-card-1',
      code: 'VK-20260727-000002',
      quantity: 7,
      stage: INTRO_STAGE,
      createdAt: '2026-07-27',
    }],
  };
  const storage = createMemoryAsyncStorage({
    [CULTURE_CARDS_RESET_KEY]: 'true',
    [CULTURE_CARDS_STORAGE_KEY]: JSON.stringify(envelope),
  });
  const service = createCultureCardsStorage(storage);

  const loadedCards = await service.loadCultureCardsFromStorage();

  assert.equal(loadedCards.length, 1);
  assert.equal(storage.setCalls.length, 0);
});

test('invalid storage json is not overwritten during migration', async () => {
  const invalidJson = '{not json';
  const storage = createMemoryAsyncStorage({
    [CULTURE_CARDS_RESET_KEY]: 'true',
    [CULTURE_CARDS_STORAGE_KEY]: invalidJson,
  });
  const service = createCultureCardsStorage(storage);

  await assert.rejects(() => service.loadCultureCardsFromStorage(), /invalid JSON/i);

  assert.equal(await storage.getItem(CULTURE_CARDS_STORAGE_KEY), invalidJson);
  assert.equal(await storage.getItem(CULTURE_CARDS_STORAGE_BACKUP_KEY), null);
  assert.equal(storage.setCalls.length, 0);
});

test('unsupported storage schema is not overwritten during migration', async () => {
  const unsupportedEnvelope = JSON.stringify({
    schemaVersion: CULTURE_CARDS_STORAGE_SCHEMA_VERSION + 1,
    savedAt: '2026-07-27T00:00:00.000Z',
    cards: [],
  });
  const storage = createMemoryAsyncStorage({
    [CULTURE_CARDS_RESET_KEY]: 'true',
    [CULTURE_CARDS_STORAGE_KEY]: unsupportedEnvelope,
  });
  const service = createCultureCardsStorage(storage);

  await assert.rejects(() => service.loadCultureCardsFromStorage(), /newer than this app supports/i);

  assert.equal(await storage.getItem(CULTURE_CARDS_STORAGE_KEY), unsupportedEnvelope);
  assert.equal(await storage.getItem(CULTURE_CARDS_STORAGE_BACKUP_KEY), null);
  assert.equal(storage.setCalls.length, 0);
});

test('normalization errors do not overwrite legacy storage', async () => {
  const invalidLegacyCards = JSON.stringify([null]);
  const storage = createMemoryAsyncStorage({
    [CULTURE_CARDS_RESET_KEY]: 'true',
    [CULTURE_CARDS_STORAGE_KEY]: invalidLegacyCards,
  });
  const service = createCultureCardsStorage(storage);

  await assert.rejects(() => service.loadCultureCardsFromStorage());

  assert.equal(await storage.getItem(CULTURE_CARDS_STORAGE_KEY), invalidLegacyCards);
  assert.equal(await storage.getItem(CULTURE_CARDS_STORAGE_BACKUP_KEY), null);
  assert.equal(storage.setCalls.length, 0);
});

test('valid backup can be restored to the current storage envelope', async () => {
  const backupCards = [{
    id: 'backup-card-1',
    code: 'VK-20260727-000003',
    cultureName: 'Каладиум',
    quantity: 15,
    stage: INTRO_STAGE,
    createdAt: '2026-07-27',
  }];
  const storage = createMemoryAsyncStorage({
    [CULTURE_CARDS_STORAGE_KEY]: '{broken main',
    [CULTURE_CARDS_STORAGE_BACKUP_KEY]: JSON.stringify(backupCards),
  });
  const service = createCultureCardsStorage(storage);

  const restoredCards = await service.restoreCultureCardsBackupFromStorage();
  const restoredValue = JSON.parse(await storage.getItem(CULTURE_CARDS_STORAGE_KEY));

  assert.equal(restoredCards.length, 1);
  assert.equal(restoredCards[0].id, 'backup-card-1');
  assert.equal(restoredValue.schemaVersion, CULTURE_CARDS_STORAGE_SCHEMA_VERSION);
  assert.equal(restoredValue.cards[0].id, 'backup-card-1');
  assert.equal(await storage.getItem(CULTURE_CARDS_STORAGE_BACKUP_KEY), JSON.stringify(backupCards));
});

test('missing backup cannot be restored and leaves current storage unchanged', async () => {
  const currentValue = '{broken main';
  const storage = createMemoryAsyncStorage({
    [CULTURE_CARDS_STORAGE_KEY]: currentValue,
  });
  const service = createCultureCardsStorage(storage);

  await assert.rejects(
    () => service.restoreCultureCardsBackupFromStorage(),
    (error) => error.code === 'backup_not_found',
  );

  assert.equal(await storage.getItem(CULTURE_CARDS_STORAGE_KEY), currentValue);
  assert.equal(storage.setCalls.length, 0);
});

test('invalid backup cannot be restored and leaves current storage unchanged', async () => {
  const currentValue = '{broken main';
  const storage = createMemoryAsyncStorage({
    [CULTURE_CARDS_STORAGE_KEY]: currentValue,
    [CULTURE_CARDS_STORAGE_BACKUP_KEY]: '{broken backup',
  });
  const service = createCultureCardsStorage(storage);

  await assert.rejects(
    () => service.restoreCultureCardsBackupFromStorage(),
    (error) => error.code === 'invalid_backup',
  );

  assert.equal(await storage.getItem(CULTURE_CARDS_STORAGE_KEY), currentValue);
  assert.equal(await storage.getItem(CULTURE_CARDS_STORAGE_BACKUP_KEY), '{broken backup');
  assert.equal(storage.setCalls.length, 0);
});

test('repository exposes explicit backup restore', async () => {
  let restoreCallCount = 0;
  const repository = createCultureCardRepository({
    clearStoredCardsForTests: async () => {},
    loadStoredCards: async () => [],
    restoreStoredCardsBackup: async () => {
      restoreCallCount += 1;
      return [{ id: 'restored-card-1' }];
    },
    saveStoredCards: async () => {},
  });

  const restoredCards = await repository.restoreBackup();

  assert.equal(restoreCallCount, 1);
  assert.deepEqual(restoredCards, [{ id: 'restored-card-1' }]);
});
