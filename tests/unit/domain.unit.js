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
const {
  attachChildToOperation,
  buildDerivedChildBatch,
  buildPropagationChildCard,
} = require('../../src/domain/propagationChildCard');
const {
  PARENT_CHILD_INTEGRITY_MESSAGE,
  validateParentChildIntegrity,
} = require('../../src/domain/parentChildIntegrity');
const {
  buildIntroActionSaveResult,
} = require('../../src/domain/introActionSave');
const {
  getIntroActionConfig,
} = require('../../src/domain/statusOperations');
const {
  createAsyncActionGuard,
} = require('../../src/domain/asyncActionGuard');

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

function cloneCards(cards) {
  return cards.map((card) => ({ ...card }));
}

function createRepositoryTestStore(initialCards = [], options = {}) {
  let cards = cloneCards(initialCards);
  let failNextSaveError = null;
  const events = [];
  const repository = createCultureCardRepository({
    clearStoredCardsForTests: async () => {
      events.push('clear');
      cards = [];
    },
    loadStoredCards: async () => {
      events.push('load');
      return cloneCards(cards);
    },
    restoreStoredCardsBackup: async () => {
      events.push('restore');
      cards = cloneCards(options.restoredCards || []);
      return cloneCards(cards);
    },
    saveStoredCards: async (nextCards) => {
      events.push(`save:${nextCards.map((card) => card.id).join(',')}`);
      if (failNextSaveError) {
        const error = failNextSaveError;
        failNextSaveError = null;
        throw error;
      }

      cards = cloneCards(nextCards);
    },
  });

  return {
    events,
    repository,
    failNextSave(error = new Error('save failed')) {
      failNextSaveError = error;
    },
    getCards() {
      return cloneCards(cards);
    },
  };
}

function createParentChildTestParent(overrides = {}) {
  return {
    id: 'parent-card-1',
    code: 'VK-20260727-010101',
    cultureName: 'Аглонема',
    quantity: 100,
    currentQuantity: 100,
    generation: 1,
    stage: INTRO_STAGE,
    createdAt: '2026-07-27',
    locationDescription: 'Бокс',
    operations: [],
    ...overrides,
  };
}

function buildValidatedPropagationPair() {
  const parentCard = createParentChildTestParent();
  const propagationOperation = {
    id: 'propagation-event-1',
    type: 'propagation',
    count: 12,
    date: '2026-07-27',
    createdAt: '2026-07-27T12:00:00.000Z',
    propagationMethod: 'Деление',
  };
  const childCard = buildPropagationChildCard({
    cultureCards: [parentCard],
    parentCard,
    propagationOperation,
    quantity: 12,
    userId: 'tester',
  });
  const parentOperation = attachChildToOperation(propagationOperation, childCard);
  const updatedParentCard = {
    ...parentCard,
    operations: [parentOperation],
  };

  return {
    childCard,
    cultureCards: [updatedParentCard, childCard],
    parentCard,
    parentOperation,
  };
}

function assertParentChildValidationCode(input, code) {
  assert.throws(
    () => validateParentChildIntegrity(input),
    (error) => error.code === code,
  );
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return {
    promise,
    reject,
    resolve,
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

test('problem journal recalculates quantity after a recovery operation is removed', () => {
  const state = getProblemStateFromOperations([
    {
      type: 'problem',
      problemType: 'Контаминация',
      riskLevel: 'Высокий',
      affectedQuantity: 40,
      createdAt: '2026-07-27T16:00:00.000Z',
    },
  ], {
    activeProblemQuantity: 0,
    currentQuantity: 100,
    stage: INTRO_STAGE,
  });

  assert.equal(state.activeProblemQuantity, 40);
  assert.equal(state.isActive, true);
});

test('problem journal reflects an edited affected quantity', () => {
  const state = getProblemStateFromOperations([
    { type: 'problem', affectedQuantity: 25, createdAt: '2026-07-27T16:00:00.000Z', updatedAt: '2026-07-27T16:30:00.000Z' },
    { type: 'problemRecovery', recoveredQuantity: 5, createdAt: '2026-07-27T17:00:00.000Z' },
  ], {
    activeProblemQuantity: 80,
    currentQuantity: 100,
    stage: INTRO_STAGE,
  });

  assert.equal(state.activeProblemQuantity, 20);
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

test('mixed problem breakdown is cleared after full problem isolation', () => {
  const parentCard = {
    quantity: 100,
    stage: INTRO_STAGE,
    operations: [
      { type: 'problem', affectedQuantity: 40, createdAt: '2026-07-27T16:16:00.000Z' },
      { type: 'problemIsolation', count: 40, childCode: 'VK-20260727-192105', createdAt: '2026-07-27T16:21:00.000Z' },
    ],
  };

  assert.equal(calculateCurrentQuantity(parentCard), 60);
  assert.equal(getCardActiveProblemQuantity(parentCard), 0);
  assert.equal(formatMixedBatchProblemBreakdown(parentCard), '');
});

test('parent-child integrity accepts valid propagation child links', () => {
  const pair = buildValidatedPropagationPair();

  assert.equal(validateParentChildIntegrity({
    ...pair,
    originType: 'cloned',
    quantity: 12,
  }), true);
});

test('parent-child integrity accepts valid problem isolation child links', () => {
  const parentCard = createParentChildTestParent({
    operations: [
      { id: 'problem-event-1', type: 'problem', affectedQuantity: 20, createdAt: '2026-07-27T11:00:00.000Z' },
    ],
  });
  const isolationOperation = {
    id: 'isolation-event-1',
    type: 'problemIsolation',
    count: 20,
    quantity: 20,
    date: '2026-07-27',
    createdAt: '2026-07-27T12:00:00.000Z',
  };
  const childCard = buildDerivedChildBatch({
    cultureCards: [parentCard],
    parentCard,
    sourceOperation: isolationOperation,
    quantity: 20,
    userId: 'tester',
    originType: 'problemIsolation',
    stage: INTRO_STAGE,
    locationDescription: 'Изолятор',
    batchStatus: 'problem',
    healthStatus: 'problem',
    isolationStatus: 'isolated',
    sourceProblemOperation: parentCard.operations[0],
  });
  const parentOperation = attachChildToOperation(isolationOperation, childCard);

  assert.equal(validateParentChildIntegrity({
    cultureCards: [{ ...parentCard, operations: [parentOperation] }, childCard],
    parentCard,
    childCard,
    parentOperation,
    originType: 'problemIsolation',
    quantity: 20,
  }), true);
});

test('parent-child integrity rejects duplicate child card ids and codes', () => {
  const pair = buildValidatedPropagationPair();

  assertParentChildValidationCode({
    ...pair,
    cultureCards: [
      ...pair.cultureCards,
      { id: pair.childCard.id, code: 'UNIQUE-CODE' },
    ],
    originType: 'cloned',
    quantity: 12,
  }, 'child_id_not_unique');

  assertParentChildValidationCode({
    ...pair,
    cultureCards: [
      ...pair.cultureCards,
      { id: 'other-card', code: ` ${pair.childCard.code.toLowerCase()} ` },
    ],
    originType: 'cloned',
    quantity: 12,
  }, 'child_code_not_unique');
});

test('parent-child integrity rejects broken parent and source links', () => {
  const pair = buildValidatedPropagationPair();

  assertParentChildValidationCode({
    ...pair,
    childCard: { ...pair.childCard, parentCardId: 'wrong-parent' },
    originType: 'cloned',
    quantity: 12,
  }, 'child_parent_id_mismatch');

  assertParentChildValidationCode({
    ...pair,
    childCard: { ...pair.childCard, sourceEventId: 'wrong-event' },
    originType: 'cloned',
    quantity: 12,
  }, 'child_source_event_mismatch');

  assertParentChildValidationCode({
    ...pair,
    parentOperation: { ...pair.parentOperation, childCardId: 'wrong-child' },
    originType: 'cloned',
    quantity: 12,
  }, 'parent_operation_child_id_mismatch');
});

test('parent-child integrity rejects generation and quantity mismatches', () => {
  const pair = buildValidatedPropagationPair();

  assertParentChildValidationCode({
    ...pair,
    childCard: { ...pair.childCard, generation: 99 },
    originType: 'cloned',
    quantity: 12,
  }, 'child_generation_mismatch');

  assertParentChildValidationCode({
    ...pair,
    childCard: { ...pair.childCard, quantity: 11 },
    originType: 'cloned',
    quantity: 12,
  }, 'child_quantity_mismatch');

  assertParentChildValidationCode({
    ...pair,
    parentOperation: { ...pair.parentOperation, count: 11 },
    originType: 'cloned',
    quantity: 12,
  }, 'parent_operation_quantity_mismatch');
});

test('intro action save returns original cards when parent-child integrity fails', () => {
  const selectedCard = createParentChildTestParent({
    operations: [
      { id: 'problem-event-1', type: 'problem', affectedQuantity: 10, createdAt: '2026-07-27T11:00:00.000Z' },
    ],
  });
  const result = buildIntroActionSaveResult({
    actionConfig: getIntroActionConfig('problemIsolation'),
    cultureCards: [],
    editingOperationId: '',
    introActionType: 'problemIsolation',
    introActionForm: {
      isolationQuantity: '10',
      isolationLocation: 'Изолятор',
      isolationComment: '',
      sourceProblemEventId: 'problem-event-1',
    },
    movementDetails: {},
    nowIso: '2026-07-27T12:00:00.000Z',
    selectedCard,
    selectedCalendarDate: '2026-07-27',
    selectedCardOperations: selectedCard.operations,
    userId: 'tester',
  });

  assert.equal(result.error, PARENT_CHILD_INTEGRITY_MESSAGE);
  assert.deepEqual(result.nextCards, []);
  assert.equal(result.nextOperation, null);
});

test('async action guard ignores duplicate calls for the same key', async () => {
  const guard = createAsyncActionGuard();
  const deferred = createDeferred();
  let saveCallCount = 0;
  const firstRun = guard.run('save', async () => {
    saveCallCount += 1;
    await deferred.promise;
    return 'saved';
  });
  const secondRun = guard.run('save', async () => {
    saveCallCount += 1;
    return 'duplicate';
  }, 'ignored');

  assert.equal(await secondRun, 'ignored');
  assert.equal(saveCallCount, 1);
  deferred.resolve();
  assert.equal(await firstRun, 'saved');
});

test('async action guard allows retry after an error', async () => {
  const guard = createAsyncActionGuard();
  let saveCallCount = 0;

  await assert.rejects(
    () => guard.run('save', async () => {
      saveCallCount += 1;
      throw new Error('save failed');
    }),
    /save failed/,
  );

  const result = await guard.run('save', async () => {
    saveCallCount += 1;
    return 'saved';
  });

  assert.equal(result, 'saved');
  assert.equal(saveCallCount, 2);
});

test('async action guard clears running state after success', async () => {
  const guard = createAsyncActionGuard();
  const deferred = createDeferred();
  const runPromise = guard.run('save', async () => {
    await deferred.promise;
    return 'saved';
  });

  assert.equal(guard.isRunning('save'), true);
  deferred.resolve();
  assert.equal(await runPromise, 'saved');
  assert.equal(guard.isRunning('save'), false);
});

test('async action guard does not block different keys', async () => {
  const guard = createAsyncActionGuard();
  const firstDeferred = createDeferred();
  const startedKeys = [];
  const firstRun = guard.run('save:first', async () => {
    startedKeys.push('first');
    await firstDeferred.promise;
    return 'first';
  });
  const secondRun = guard.run('save:second', async () => {
    startedKeys.push('second');
    return 'second';
  });

  assert.equal(await secondRun, 'second');
  assert.deepEqual(startedKeys, ['first', 'second']);
  firstDeferred.resolve();
  assert.equal(await firstRun, 'first');
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

test('saving culture cards stores a backup of the previous value first', async () => {
  const currentEnvelope = JSON.stringify({
    schemaVersion: CULTURE_CARDS_STORAGE_SCHEMA_VERSION,
    savedAt: '2026-07-27T00:00:00.000Z',
    cards: [{
      id: 'current-card',
      code: 'VK-20260727-000004',
      quantity: 8,
      stage: INTRO_STAGE,
      createdAt: '2026-07-27',
    }],
  });
  const storage = createMemoryAsyncStorage({
    [CULTURE_CARDS_STORAGE_KEY]: currentEnvelope,
  });
  const service = createCultureCardsStorage(storage);

  await service.saveCultureCardsToStorage([{
    id: 'next-card',
    code: 'VK-20260727-000005',
    quantity: 9,
    stage: INTRO_STAGE,
    createdAt: '2026-07-27',
  }]);

  const savedValue = JSON.parse(await storage.getItem(CULTURE_CARDS_STORAGE_KEY));
  assert.equal(await storage.getItem(CULTURE_CARDS_STORAGE_BACKUP_KEY), currentEnvelope);
  assert.equal(savedValue.schemaVersion, CULTURE_CARDS_STORAGE_SCHEMA_VERSION);
  assert.equal(savedValue.cards[0].id, 'next-card');
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

test('repository sequential create operations keep all cards', async () => {
  const store = createRepositoryTestStore();

  await store.repository.create({ id: 'card-a' });
  await store.repository.create({ id: 'card-b' });

  assert.deepEqual(store.getCards().map((card) => card.id), ['card-b', 'card-a']);
});

test('repository parallel create operations do not lose cards', async () => {
  const store = createRepositoryTestStore();

  await Promise.all([
    store.repository.create({ id: 'card-a' }),
    store.repository.create({ id: 'card-b' }),
  ]);

  assert.deepEqual(
    store.getCards().map((card) => card.id).sort(),
    ['card-a', 'card-b'],
  );
});

test('repository parallel updates for different cards do not overwrite each other', async () => {
  const store = createRepositoryTestStore([
    { id: 'card-a', count: 1 },
    { id: 'card-b', count: 1 },
  ]);

  await Promise.all([
    store.repository.update('card-a', { count: 2 }),
    store.repository.update('card-b', { count: 3 }),
  ]);

  assert.deepEqual(store.getCards(), [
    { id: 'card-a', count: 2 },
    { id: 'card-b', count: 3 },
  ]);
});

test('repository update with an unknown card id leaves cards unchanged', async () => {
  const store = createRepositoryTestStore([{ id: 'card-a', count: 1 }]);

  const result = await store.repository.update('missing-card', { count: 2 });

  assert.equal(result.card, null);
  assert.deepEqual(result.cards, [{ id: 'card-a', count: 1 }]);
  assert.deepEqual(store.getCards(), [{ id: 'card-a', count: 1 }]);
});

test('repository write queue continues after a failed save', async () => {
  const store = createRepositoryTestStore();
  store.failNextSave();

  await assert.rejects(() => store.repository.create({ id: 'failed-card' }), /save failed/);
  await store.repository.create({ id: 'saved-card' });

  assert.deepEqual(store.getCards(), [{ id: 'saved-card' }]);
});

test('repository saveAll participates in the write queue', async () => {
  const store = createRepositoryTestStore();

  const saveAllPromise = store.repository.saveAll([{ id: 'base-card' }]);
  const createPromise = store.repository.create({ id: 'created-card' });

  await Promise.all([saveAllPromise, createPromise]);

  assert.deepEqual(store.getCards().map((card) => card.id), ['created-card', 'base-card']);
});

test('repository restoreBackup participates in the write queue', async () => {
  const store = createRepositoryTestStore([], {
    restoredCards: [{ id: 'restored-card' }],
  });

  const restorePromise = store.repository.restoreBackup();
  const createPromise = store.repository.create({ id: 'created-card' });

  await Promise.all([restorePromise, createPromise]);

  assert.deepEqual(store.getCards().map((card) => card.id), ['created-card', 'restored-card']);
});
