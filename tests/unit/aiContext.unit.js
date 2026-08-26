const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildAiContext,
  buildGuruContextPrompt,
  detectQuestionFocus,
  estimateAiContextSize,
  shouldAttachAiContext,
} = require('../../src/domain/aiContext');

test('ai context uses attention mode for problem-focused question', () => {
  const cultureCards = [
    {
      id: 'card-1',
      code: 'VK-001',
      quantity: 20,
      stage: 'Greenhouse',
      batchStatus: 'active',
      sterilityStatus: 'sterile',
      createdAt: '2026-08-20T10:00:00.000Z',
      updatedAt: '2026-08-24T09:00:00.000Z',
      operations: [
        {
          id: 'batch-created-1',
          type: 'batchCreated',
          title: 'Create batch',
          createdAt: '2026-08-20T10:00:00.000Z',
          date: '2026-08-20',
        },
      ],
    },
    {
      id: 'card-2',
      code: 'VK-002',
      quantity: 15,
      stage: 'Adaptation',
      batchStatus: 'problem',
      sterilityStatus: 'contaminated',
      createdAt: '2026-08-21T10:00:00.000Z',
      updatedAt: '2026-08-24T08:00:00.000Z',
      operations: [
        {
          id: 'batch-created-2',
          type: 'batchCreated',
          title: 'Create batch',
          createdAt: '2026-08-21T10:00:00.000Z',
          date: '2026-08-21',
        },
        {
          id: 'problem-1',
          type: 'problem',
          title: 'Problem',
          problemType: 'Contamination',
          riskLevel: 'High',
          affectedQuantity: 5,
          createdAt: '2026-08-24T08:00:00.000Z',
          date: '2026-08-24',
        },
      ],
    },
  ];

  const context = buildAiContext({
    cultureCards,
    currentEmployee: {
      displayName: 'Alexey Petrov',
      localUserId: 'alexey-petrov',
    },
    question: 'Какие партии сейчас имеют проблемы или карантин?',
  });

  assert.equal(context.summary.focus, 'attention');
  assert.equal(context.attentionBatches.length, 1);
  assert.equal(context.attentionBatches[0].code, 'VK-002');
  assert.equal(context.activeProblems[0].riskLevel, 'High');
});

test('ai context uses overview mode for app data question', () => {
  const cultureCards = Array.from({ length: 5 }, (_, index) => ({
    id: `card-${index + 1}`,
    code: `VK-${index + 1}`,
    quantity: 100 + index,
    stage: 'Introduction',
    batchStatus: index === 4 ? 'problem' : 'active',
    sterilityStatus: index === 4 ? 'contaminated' : 'sterile',
    updatedAt: `2026-08-${String(index + 1).padStart(2, '0')}T10:00:00.000Z`,
    operations: [
      {
        id: `batch-created-${index + 1}`,
        type: 'batchCreated',
        title: 'Create batch',
        createdAt: `2026-08-${String(index + 1).padStart(2, '0')}T09:00:00.000Z`,
        date: `2026-08-${String(index + 1).padStart(2, '0')}`,
      },
      ...(index === 4
        ? [{
          id: 'problem-5',
          type: 'problem',
          title: 'Problem',
          problemType: 'Contamination',
          riskLevel: 'High',
          affectedQuantity: 15,
          createdAt: '2026-08-05T11:00:00.000Z',
          date: '2026-08-05',
        }]
        : []),
    ],
  }));

  const context = buildAiContext({
    cultureCards,
    question: 'Сколько всего партий сейчас в работе?',
  });

  assert.equal(context.summary.focus, 'overview');
  assert.equal(context.overviewBatches.length, 3);
  assert.equal(context.overviewBatches[0].code, 'VK-5');
});

test('ai context uses none mode for generic conversational question', () => {
  const context = buildAiContext({
    cultureCards: [{ id: 'card-1', code: 'VK-001', stage: 'Greenhouse', batchStatus: 'active', operations: [] }],
    currentEmployee: {
      displayName: 'Alexey Petrov',
      localUserId: 'alexey-petrov',
    },
    question: 'Hello! How are you?',
  });

  assert.equal(context.summary.focus, 'none');
  assert.deepEqual(context.activeProblems, []);
  assert.equal('overviewBatches' in context, false);
  assert.equal('attentionBatches' in context, false);
});

test('ai context uses explicit focus override for scoped card chat and exposes latest observation with scoped history', () => {
  const context = buildAiContext({
    plantsCatalog: [
      {
        cultureName: 'Hydrangea',
        speciesName: 'macrophylla',
        varietyName: 'Bodensee',
        originalName: 'Hydrangea Bodensee',
        adaptationTemperatureRequirement: '20-22°C',
        adaptationLightRequirement: 'Яркий рассеянный свет',
      },
    ],
    cultureCards: [
      {
        id: 'card-1',
        code: 'VK-777',
        cultureName: 'Hydrangea',
        speciesName: 'macrophylla',
        varietyName: 'Bodensee',
        originType: 'clone',
        generation: 3,
        parentCode: 'VK-700',
        sourceMaterial: 'Маточное растение',
        locationDescription: 'Теплица 2',
        quantity: 40,
        stage: 'Адаптация',
        batchStatus: 'problem',
        sterilityStatus: 'contaminated',
        updatedAt: '2026-08-24T10:00:00.000Z',
        stageHistory: [
          {
            fromStage: 'Введение в культуру',
            toStage: 'Адаптация',
            changedAt: '2026-08-23T08:00:00.000Z',
          },
        ],
        operations: [
          {
            id: 'problem-1',
            type: 'problem',
            title: 'Problem',
            problemType: 'Contamination',
            riskLevel: 'High',
            affectedQuantity: 12,
            createdAt: '2026-08-24T09:00:00.000Z',
            date: '2026-08-24',
          },
          {
            id: 'stress-1',
            type: 'adaptationStress',
            title: 'Наблюдение',
            stressLevel: 'Высокий',
            stability: 'Средняя',
            turgor: 'Снижен',
            comment: 'Карточка находится под наблюдением.',
            environmentTemperature: '24',
            environmentAirHumidity: '72',
            substrateHumidity: 'Умеренная',
            environmentLight: 'Яркий рассеянный',
            ventilation: 'Нормальная',
            createdAt: '2026-08-24T10:00:00.000Z',
            date: '2026-08-24',
          },
        ],
      },
    ],
    focusOverride: 'attention',
    question: 'Что с партией и почему риск высокий?',
  });

  assert.equal(context.summary.focus, 'attention');
  assert.equal(context.attentionBatches.length, 1);
  assert.equal(context.attentionBatches[0].code, 'VK-777');
  assert.equal(context.scopedCard.code, 'VK-777');
  assert.equal(context.scopedCard.cultureName, 'Hydrangea');
  assert.equal(context.scopedCard.speciesName, 'macrophylla');
  assert.equal(context.scopedCard.varietyName, 'Bodensee');
  assert.equal(context.scopedCard.originType, 'clone');
  assert.equal(context.scopedCard.generation, 3);
  assert.equal(context.scopedCard.parentCode, 'VK-700');
  assert.equal(context.scopedCard.sourceMaterial, 'Маточное растение');
  assert.equal(context.scopedCard.location, 'Теплица 2');
  assert.equal(context.scopedCard.locationDescription, 'Теплица 2');
  assert.equal(context.scopedCard.currentQuantity, 40);
  assert.equal(context.scopedCard.quantities.current, 40);
  assert.equal(context.scopedCard.quantities.activeProblem, 12);
  assert.equal(context.scopedCard.plantRecommendations.originalName, 'Hydrangea Bodensee');
  assert.equal(context.scopedCard.plantRecommendations.items.some((item) => item.value === '20-22°C'), true);
  assert.equal(context.scopedCard.plantRecommendations.items.some((item) => item.value === 'Яркий рассеянный свет'), true);
  assert.equal(context.scopedCard.riskSnapshot.stressLevel, 'Высокий');
  assert.equal(context.scopedCard.latestObservation.type, 'adaptationStress');
  assert.equal(context.scopedCard.latestObservation.stressLevel, 'Высокий');
  assert.equal(context.scopedCard.latestObservation.stability, 'Средняя');
  assert.equal(context.scopedCard.latestObservation.turgor, 'Снижен');
  assert.equal(context.scopedCard.latestObservation.comment, 'Карточка находится под наблюдением.');
  assert.equal(context.scopedCard.latestObservation.environmentTemperature, '24');
  assert.equal(context.scopedCard.latestObservation.environmentHumidity, '72');
  assert.equal(context.scopedCard.latestProblem.riskLevel, 'High');
  assert.equal(context.scopedCard.recentEvents.length >= 2, true);
  assert.equal(context.scopedCard.history.operations.totalCount, 2);
  assert.equal(context.scopedCard.history.operations.includedCount, 2);
  assert.equal(context.scopedCard.history.operations.truncated, false);
  assert.equal(context.scopedCard.history.problems.totalCount, 1);
  assert.equal(context.scopedCard.history.problems.includedCount, 1);
  assert.equal(context.scopedCard.history.problems.truncated, false);
  assert.equal(context.scopedCard.history.stageChanges.totalCount, 1);
  assert.equal(context.scopedCard.history.stageChanges.includedCount, 1);
  assert.equal(context.summary.eventsCount, 2);
});

test.skip('ai context uses explicit focus override for scoped card chat and exposes latest observation', () => {
  const context = buildAiContext({
    plantsCatalog: [
      {
        cultureName: 'Hydrangea',
        plantRecommendations: {
          items: [{ label: 'Температура', value: '20-22°C' }],
        },
        speciesName: 'macrophylla',
        varietyName: 'Bodensee',
        originalName: 'Hydrangea Bodensee',
        adaptationTemperatureRequirement: '20-22°C',
        adaptationLightRequirement: 'Яркий рассеянный свет',
        adaptationHumidityRequirement: '65-75%',
        adaptationPreventionItems: [
          { name: 'Фитоспорин', frequency: '1 раз в 7 дней' },
        ],
      },
    ],
    cultureCards: [
      {
        id: 'card-1',
        code: 'VK-777',
        cultureName: 'Hydrangea',
        speciesName: 'macrophylla',
        varietyName: 'Bodensee',
        originType: 'clone',
        generation: 3,
        parentCode: 'VK-700',
        sourceMaterial: 'Маточное растение',
        locationDescription: 'Теплица 2',
        quantity: 40,
        stage: 'Адаптация',
        batchStatus: 'problem',
        sterilityStatus: 'contaminated',
        updatedAt: '2026-08-24T10:00:00.000Z',
        stageHistory: [
          {
            fromStage: 'Р’РІРµРґРµРЅРёРµ РІ РєСѓР»СЊС‚СѓСЂСѓ',
            toStage: 'РђРґР°РїС‚Р°С†РёСЏ',
            changedAt: '2026-08-23T08:00:00.000Z',
          },
        ],
        operations: [
          {
            id: 'problem-1',
            type: 'problem',
            title: 'Problem',
            problemType: 'Contamination',
            riskLevel: 'High',
            affectedQuantity: 12,
            createdAt: '2026-08-24T09:00:00.000Z',
            date: '2026-08-24',
          },
          {
            id: 'stress-1',
            type: 'adaptationStress',
            title: 'Наблюдение',
            stressLevel: 'Высокий',
            stability: 'Средняя',
            turgor: 'Снижен',
            comment: 'Карточка находится под наблюдением.',
            environmentTemperature: '24',
            environmentAirHumidity: '72',
            substrateHumidity: 'Умеренная',
            environmentLight: 'Яркий рассеянный',
            ventilation: 'Нормальная',
            createdAt: '2026-08-24T10:00:00.000Z',
            date: '2026-08-24',
          },
        ],
      },
    ],
    focusOverride: 'attention',
    question: 'Что с партией и почему риск высокий?',
  });

  assert.equal(context.summary.focus, 'attention');
  assert.equal(context.attentionBatches.length, 1);
  assert.equal(context.attentionBatches[0].code, 'VK-777');
  assert.equal(context.scopedCard.code, 'VK-777');
  assert.equal(context.scopedCard.cultureName, 'Hydrangea');
  assert.equal(context.scopedCard.speciesName, 'macrophylla');
  assert.equal(context.scopedCard.varietyName, 'Bodensee');
  assert.equal(context.scopedCard.originType, 'clone');
  assert.equal(context.scopedCard.generation, 3);
  assert.equal(context.scopedCard.parentCode, 'VK-700');
  assert.equal(context.scopedCard.sourceMaterial, 'Маточное растение');
  assert.equal(context.scopedCard.location, 'Теплица 2');
  assert.equal(context.scopedCard.locationDescription, 'РўРµРїР»РёС†Р° 2');
  assert.equal(context.scopedCard.currentQuantity, 40);
  assert.equal(context.scopedCard.quantities.current, 40);
  assert.equal(context.scopedCard.quantities.activeProblem, 12);
  assert.equal(context.scopedCard.plantRecommendations.originalName, 'Hydrangea Bodensee');
  assert.equal(context.scopedCard.plantRecommendations.items.some((item) => item.value === '20-22°C'), true);
  assert.equal(context.scopedCard.plantRecommendations.items.some((item) => item.value === 'Яркий рассеянный свет'), true);
  assert.equal(context.scopedCard.riskSnapshot.stressLevel, 'Высокий');
  assert.equal(context.scopedCard.latestObservation.type, 'adaptationStress');
  assert.equal(context.scopedCard.latestObservation.stressLevel, 'Высокий');
  assert.equal(context.scopedCard.latestObservation.stability, 'Средняя');
  assert.equal(context.scopedCard.latestObservation.turgor, 'Снижен');
  assert.equal(context.scopedCard.latestObservation.comment, 'Карточка находится под наблюдением.');
  assert.equal(context.scopedCard.latestObservation.environmentTemperature, '24');
  assert.equal(context.scopedCard.latestObservation.environmentHumidity, '72');
  assert.equal(context.scopedCard.latestProblem.riskLevel, 'High');
  assert.equal(context.scopedCard.recentEvents.length >= 2, true);
  assert.equal(context.scopedCard.history.operations.totalCount, 2);
  assert.equal(context.scopedCard.history.operations.includedCount, 2);
  assert.equal(context.scopedCard.history.operations.truncated, false);
  assert.equal(context.scopedCard.history.problems.totalCount, 1);
  assert.equal(context.scopedCard.history.problems.includedCount, 1);
  assert.equal(context.scopedCard.history.problems.truncated, false);
  assert.equal(context.scopedCard.history.stageChanges.totalCount, 1);
  assert.equal(context.scopedCard.history.stageChanges.includedCount, 1);
  assert.equal(context.summary.eventsCount, 2);
});

test('scoped card context keeps only selected card data and marks truncated history', () => {
  const scopedCard = {
    id: 'card-scoped',
    code: 'AD-900',
    cultureName: 'Ficus',
    speciesName: 'elastica',
    varietyName: 'Robusta',
    originType: 'cutting',
    generation: 2,
    parentCode: 'AD-500',
    quantity: 120,
    stage: 'Adaptation',
    batchStatus: 'problem',
    sterilityStatus: 'contaminated',
    locationDescription: 'Greenhouse 5',
    operations: [
      ...Array.from({ length: 7 }, (_, index) => ({
        id: `problem-${index + 1}`,
        type: 'problem',
        title: 'Problem',
        problemType: 'Stress',
        riskLevel: index < 2 ? 'High' : 'Medium',
        affectedQuantity: 5 + index,
        currentQuantity: 120 - index,
        createdAt: `2026-08-${String(24 - index).padStart(2, '0')}T10:00:00.000Z`,
        date: `2026-08-${String(24 - index).padStart(2, '0')}`,
      })),
      ...Array.from({ length: 5 }, (_, index) => ({
        id: `qty-${index + 1}`,
        type: 'rooting',
        title: 'Rooting',
        currentQuantity: 110 - index,
        createdAt: `2026-08-${String(17 - index).padStart(2, '0')}T09:00:00.000Z`,
        date: `2026-08-${String(17 - index).padStart(2, '0')}`,
      })),
    ],
    stageHistory: Array.from({ length: 5 }, (_, index) => ({
      fromStage: index === 0 ? 'Introduction' : `Stage-${index}`,
      toStage: `Stage-${index + 1}`,
      changedAt: `2026-07-${String(20 - index).padStart(2, '0')}T08:00:00.000Z`,
    })),
  };

  const context = buildAiContext({
    cultureCards: [scopedCard],
    focusOverride: 'attention',
    question: 'Что сейчас происходит с этой партией?',
  });
  const serializedContext = JSON.stringify(context);

  assert.equal(serializedContext.includes('AD-900'), true);
  assert.equal(serializedContext.includes('OTHER-001'), false);
  assert.equal(context.summary.cardsCount, 1);
  assert.equal(context.scopedCard.code, 'AD-900');
  assert.equal(context.scopedCard.history.operations.totalCount, 12);
  assert.equal(context.scopedCard.history.operations.includedCount, 10);
  assert.equal(context.scopedCard.history.operations.truncated, true);
  assert.equal(context.scopedCard.history.problems.totalCount, 7);
  assert.equal(context.scopedCard.history.problems.includedCount, 6);
  assert.equal(context.scopedCard.history.problems.truncated, true);
  assert.equal(context.scopedCard.history.quantityChanges.totalCount, 12);
  assert.equal(context.scopedCard.history.quantityChanges.includedCount, 6);
  assert.equal(context.scopedCard.history.quantityChanges.truncated, true);
  assert.equal(context.scopedCard.history.stageChanges.totalCount, 5);
  assert.equal(context.scopedCard.history.stageChanges.includedCount, 4);
  assert.equal(context.scopedCard.history.stageChanges.truncated, true);
  assert.equal(context.scopedCard.history.operations.items.every((item) => item && typeof item === 'object'), true);
});

test('question focus and context attachment detect app-related vs generic questions', () => {
  assert.equal(detectQuestionFocus('Какие партии сейчас имеют проблемы?'), 'attention');
  assert.equal(detectQuestionFocus('Сколько партий сейчас в работе?'), 'overview');
  assert.equal(detectQuestionFocus('Привет! Как дела?'), 'none');
  assert.equal(shouldAttachAiContext('Что по партиям в теплице?'), true);
  assert.equal(shouldAttachAiContext('Что ты знаешь об агрономии?'), false);
});

test('guru context prompt embeds compact context and user question using current labels', () => {
  const context = {
    summary: { cardsCount: 1, focus: 'attention' },
    attentionBatches: [{ code: 'VK-001' }],
  };
  const prompt = buildGuruContextPrompt({
    context,
    text: 'What do we know about batch VK-001?',
  });

  assert.equal(prompt.includes('Контекст Sadovnik:'), true);
  assert.equal(prompt.includes('"focus": "attention"'), true);
  assert.equal(prompt.includes('"code": "VK-001"'), true);
  assert.equal(prompt.includes('What do we know about batch VK-001?'), true);
  assert.equal(estimateAiContextSize(context) > 0, true);
});

test('scoped card prompt instructs model to use history boundaries for party chat', () => {
  const prompt = buildGuruContextPrompt({
    context: {
      summary: { cardsCount: 1, focus: 'attention' },
      scopedCard: {
        code: 'VK-777',
        cultureName: 'Hydrangea',
        latestObservation: {
          type: 'adaptationStress',
          stressLevel: 'High',
          stability: 'Medium',
        },
        latestRiskLevel: 'High',
        latestProblem: { problemType: 'Contamination' },
        riskSnapshot: { stressLevel: 'High' },
        recentEvents: [{ type: 'adaptationStress', stressLevel: 'High' }],
        history: {
          operations: {
            totalCount: 12,
            includedCount: 10,
            truncated: true,
          },
        },
      },
    },
    text: 'Почему риск высокий?',
  });

  assert.equal(prompt.includes('Это чат конкретной партии Sadovnik Diary.'), true);
  assert.equal(prompt.includes('Сначала анализируй объект scopedCard.'), true);
  assert.equal(prompt.includes('scopedCard.latestObservation'), true);
  assert.equal(prompt.includes('scopedCard.latestRiskLevel'), true);
  assert.equal(prompt.includes('scopedCard.recentEvents'), true);
  assert.equal(prompt.includes('scopedCard.history'), true);
  assert.equal(prompt.includes('truncated === true'), true);
  assert.equal(prompt.includes('Почему риск высокий?'), true);
});

test.skip('guru context prompt embeds compact context and user question', () => {
  const context = {
    summary: { cardsCount: 1, focus: 'attention' },
    attentionBatches: [{ code: 'VK-001' }],
  };
  const prompt = buildGuruContextPrompt({
    context,
    text: 'What do we know about batch VK-001?',
  });

  assert.equal(prompt.includes('Контекст Sadovnik:'), true);
  assert.equal(prompt.includes('"focus": "attention"'), true);
  assert.equal(prompt.includes('"code": "VK-001"'), true);
  assert.equal(prompt.includes('What do we know about batch VK-001?'), true);
  assert.equal(estimateAiContextSize(context) > 0, true);
});

test.skip('scoped card prompt instructs model to prioritize observation data for risk explanation', () => {
  const prompt = buildGuruContextPrompt({
    context: {
      summary: { cardsCount: 1, focus: 'attention' },
      scopedCard: {
        code: 'VK-777',
        cultureName: 'Hydrangea',
        latestObservation: {
          type: 'adaptationStress',
          stressLevel: 'Высокий',
          stability: 'Средняя',
        },
        latestRiskLevel: 'High',
        latestProblem: { problemType: 'Contamination' },
        riskSnapshot: { stressLevel: 'Высокий' },
        recentEvents: [{ type: 'adaptationStress', stressLevel: 'Высокий' }],
      },
    },
    text: 'Почему риск высокий?',
  });

  assert.equal(prompt.includes('Это чат конкретной партии.'), true);
  assert.equal(prompt.includes('Сначала анализируй объект scopedCard.'), true);
  assert.equal(prompt.includes('scopedCard.latestObservation'), true);
  assert.equal(prompt.includes('scopedCard.latestRiskLevel'), true);
  assert.equal(prompt.includes('scopedCard.recentEvents'), true);
  assert.equal(prompt.includes('Почему риск высокий?'), true);
});
