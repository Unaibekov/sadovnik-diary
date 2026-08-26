const assert = require('node:assert/strict');
const test = require('node:test');

const {
  AI_VOICE_STATUS,
  buildAiVoiceContextualStrings,
  createAiVoiceInputState,
  extractSpeechResultText,
  getAiVoiceErrorMessage,
  getAiVoiceStatusText,
  mergeRecognizedTextIntoInput,
  reduceAiVoiceInputState,
} = require('../../src/domain/aiVoiceInput');
const {
  buildAiContext,
} = require('../../src/domain/aiContext');

test('voice state transitions from idle to listening', () => {
  const initialState = createAiVoiceInputState();
  const startedState = reduceAiVoiceInputState(initialState, {
    type: 'start-succeeded',
  });

  assert.equal(startedState.status, AI_VOICE_STATUS.listening);
  assert.equal(startedState.error, '');
});

test('voice state transitions from listening to processing on stop request', () => {
  const listeningState = createAiVoiceInputState({
    status: AI_VOICE_STATUS.listening,
  });
  const processingState = reduceAiVoiceInputState(listeningState, {
    type: 'stop-requested',
  });

  assert.equal(processingState.status, AI_VOICE_STATUS.processing);
});

test('voice result moves state to processing and keeps recognized text', () => {
  const listeningState = createAiVoiceInputState({
    status: AI_VOICE_STATUS.listening,
  });
  const processingState = reduceAiVoiceInputState(listeningState, {
    text: 'Привет',
    type: 'result-received',
  });

  assert.equal(processingState.status, AI_VOICE_STATUS.processing);
  assert.equal(processingState.lastRecognizedText, 'Привет');
});

test('recognized text is merged into existing input without auto send', () => {
  assert.equal(mergeRecognizedTextIntoInput('', 'Привет'), 'Привет');
  assert.equal(
    mergeRecognizedTextIntoInput('Какие партии', 'сейчас проблемные'),
    'Какие партии сейчас проблемные',
  );
});

test('empty recognition result becomes an explicit error and does not produce input text', () => {
  const state = reduceAiVoiceInputState(createAiVoiceInputState(), {
    type: 'result-empty',
  });

  assert.equal(state.status, AI_VOICE_STATUS.error);
  assert.equal(state.lastRecognizedText, '');
  assert.equal(state.error.length > 0, true);
});

test('permission denied is handled with error state', () => {
  const deniedState = reduceAiVoiceInputState(createAiVoiceInputState(), {
    message: 'Нет доступа к микрофону.',
    type: 'permission-denied',
  });

  assert.equal(deniedState.status, AI_VOICE_STATUS.error);
  assert.equal(deniedState.error, 'Нет доступа к микрофону.');
});

test('recognition error resets flow to error state with safe message', () => {
  const failedState = reduceAiVoiceInputState(createAiVoiceInputState({
    status: AI_VOICE_STATUS.processing,
  }), {
    message: 'Сервис недоступен.',
    type: 'recognition-error',
  });

  assert.equal(failedState.status, AI_VOICE_STATUS.error);
  assert.equal(failedState.error, 'Сервис недоступен.');
});

test('speech result text is extracted from confirmed final alternatives', () => {
  const resultText = extractSpeechResultText({
    isFinal: true,
    results: [
      { transcript: 'Привет', confidence: 0.9 },
      { transcript: 'как дела', confidence: 0.7 },
    ],
  });

  assert.equal(resultText, 'Привет как дела');
});

test('dialogue uuid and ai context flow stay independent from voice helpers', () => {
  const dialogueUuid = 'dialog-voice-1';
  const context = buildAiContext({
    cultureCards: [
      {
        id: 'card-1',
        code: 'VK-001',
        quantity: 42,
        stage: 'Адаптация',
        batchStatus: 'problem',
        sterilityStatus: 'contaminated',
        operations: [
          {
            id: 'problem-1',
            type: 'problem',
            title: 'Проблема',
            problemType: 'Контаминация',
            riskLevel: 'Высокий',
            affectedQuantity: 5,
            date: '2026-08-24',
          },
        ],
      },
    ],
    currentEmployee: {
      displayName: 'Ильдар Унайбеков',
      localUserId: 'ильдар-унайбеков',
    },
    question: mergeRecognizedTextIntoInput('', 'Какие партии проблемные'),
  });

  assert.equal(dialogueUuid, 'dialog-voice-1');
  assert.equal(context.summary.focus, 'attention');
});

test('contextual strings are built from real app entities and respect scoped chat priority', () => {
  const contextualStrings = buildAiVoiceContextualStrings({
    cultureCards: [
      {
        id: 'card-1',
        code: 'VK-001',
        displayName: 'Hydrangea batch',
        cultureName: 'Hydrangea',
        speciesName: 'macrophylla',
        varietyName: 'Bodensee',
        stage: 'Адаптация',
        batchStatus: 'problem',
        sterilityStatus: 'contaminated',
        operations: [
          {
            id: 'problem-1',
            title: 'Проблема',
            problemType: 'Контаминация',
            riskLevel: 'Высокий',
          },
        ],
      },
    ],
    currentEmployee: {
      displayName: 'Ильдар Унайбеков',
      firstName: 'Ильдар',
      lastName: 'Унайбеков',
      localUserId: 'ильдар-унайбеков',
    },
    scopedCard: {
      id: 'card-2',
      code: 'VK-777',
      cultureName: 'Rose',
      varietyName: 'Avalanche',
      stage: 'Введение в культуру',
      batchStatus: 'active',
      operations: [],
    },
  });

  assert.equal(contextualStrings.includes('Ильдар Унайбеков'), true);
  assert.equal(contextualStrings.includes('VK-777'), true);
  assert.equal(contextualStrings.includes('Rose'), true);
  assert.equal(contextualStrings.includes('Sadovnik'), true);
  assert.equal(contextualStrings.includes('Guru'), true);
  assert.equal(contextualStrings.length <= 48, true);
});

test('general agronomy chat voice hints stay generic without app batch data', () => {
  const contextualStrings = buildAiVoiceContextualStrings({
    cultureCards: [],
    currentEmployee: {
      displayName: 'Ильдар Унайбеков',
      localUserId: 'ильдар-унайбеков',
    },
    scopedCard: null,
  });

  assert.equal(contextualStrings.includes('Sadovnik'), true);
  assert.equal(contextualStrings.includes('Guru'), true);
  assert.equal(contextualStrings.includes('партия'), true);
  assert.equal(contextualStrings.includes('VK-001'), false);
});

test('voice helper exposes stable status and error labels', () => {
  assert.equal(getAiVoiceStatusText(AI_VOICE_STATUS.listening), 'Слушаю...');
  assert.equal(getAiVoiceStatusText(AI_VOICE_STATUS.processing), 'Обрабатываю речь...');
  assert.equal(
    getAiVoiceErrorMessage({ error: 'service-not-allowed', message: '' }),
    'Распознавание речи недоступно на этом устройстве или в браузере.',
  );
});
