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
  getCardActiveProblemQuantity,
  getCardRemainingProblemQuantity,
} = require('../../src/domain/batch');
const {
  buildUniquePlantingCode,
  normalizeCode,
} = require('../../src/domain/codeGeneration');
const { INTRO_STAGE } = require('../../src/domain/constants');

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
  assert.equal(getCardRemainingProblemQuantity(parentCard), 0);
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
  assert.equal(getCardRemainingProblemQuantity(parentCard), 60);
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
  const childState = getProblemStateFromOperations([
    { type: 'contamination', createdAt: '2026-07-27T16:16:00.000Z' },
    { type: 'isolatedFromParent', parentCode: 'VK-20260727-191538', quantity: 1000, createdAt: '2026-07-27T16:21:00.000Z' },
  ], {
    currentQuantity: 1000,
    originType: 'problemIsolation',
    stage: INTRO_STAGE,
  });

  assert.equal(childState.activeProblemQuantity, 1000);
  assert.equal(childState.remainingProblemQuantity, 0);
  assert.equal(childState.batchStatus, 'problem');
  assert.equal(childState.isActive, true);
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
