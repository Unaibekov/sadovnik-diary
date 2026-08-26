export const AI_VOICE_STATUS = {
  error: 'error',
  idle: 'idle',
  listening: 'listening',
  processing: 'processing',
};

const MAX_CONTEXTUAL_STRINGS = 48;
const MAX_SCOPED_CARD_TERMS = 20;
const MAX_GLOBAL_CARD_TERMS = 28;

function normalizeText(value) {
  return `${value || ''}`.trim();
}

function normalizeTextList(values) {
  return values
    .map((value) => normalizeText(value))
    .filter(Boolean);
}

function limitUniqueStrings(values, limit = MAX_CONTEXTUAL_STRINGS) {
  const uniqueValues = [];
  const seen = new Set();

  for (const value of values) {
    const normalizedValue = normalizeText(value);

    if (!normalizedValue) {
      continue;
    }

    const key = normalizedValue.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueValues.push(normalizedValue);

    if (uniqueValues.length >= limit) {
      break;
    }
  }

  return uniqueValues;
}

function appendCardTerms(target, card) {
  if (!card || typeof card !== 'object') {
    return;
  }

  target.push(
    card.code,
    card.displayName,
    card.cultureName,
    card.speciesName,
    card.varietyName,
    card.stage,
    card.batchStatus,
    card.sterilityStatus,
  );

  const operations = Array.isArray(card.operations) ? card.operations : [];

  operations.forEach((operation) => {
    target.push(
      operation.problemType,
      operation.riskLevel,
      operation.title,
      operation.reason,
      operation.comment,
    );
  });
}

function buildScopedCardTerms(scopedCard) {
  const values = [];

  appendCardTerms(values, scopedCard);

  return limitUniqueStrings(values, MAX_SCOPED_CARD_TERMS);
}

function buildGlobalCardTerms(cultureCards) {
  const values = [];

  (Array.isArray(cultureCards) ? cultureCards : []).forEach((card) => {
    appendCardTerms(values, card);
  });

  return limitUniqueStrings(values, MAX_GLOBAL_CARD_TERMS);
}

export function createAiVoiceInputState(overrides = {}) {
  return {
    error: '',
    lastRecognizedText: '',
    status: AI_VOICE_STATUS.idle,
    ...overrides,
  };
}

export function reduceAiVoiceInputState(state, action) {
  const currentState = state || createAiVoiceInputState();
  const nextAction = action || {};

  switch (nextAction.type) {
    case 'reset':
      return createAiVoiceInputState();
    case 'start-requested':
      return {
        ...currentState,
        error: '',
        lastRecognizedText: '',
      };
    case 'start-succeeded':
      return {
        ...currentState,
        error: '',
        status: AI_VOICE_STATUS.listening,
      };
    case 'stop-requested':
      return {
        ...currentState,
        status: AI_VOICE_STATUS.processing,
      };
    case 'result-received':
      return {
        ...currentState,
        error: '',
        lastRecognizedText: normalizeText(nextAction.text),
        status: AI_VOICE_STATUS.processing,
      };
    case 'result-empty':
      return {
        ...currentState,
        error: 'Речь не распознана. Попробуйте ещё раз.',
        lastRecognizedText: '',
        status: AI_VOICE_STATUS.error,
      };
    case 'permission-denied':
      return {
        ...currentState,
        error: normalizeText(nextAction.message) || 'Нет доступа к микрофону или распознаванию речи.',
        lastRecognizedText: '',
        status: AI_VOICE_STATUS.error,
      };
    case 'recognition-error':
      return {
        ...currentState,
        error: normalizeText(nextAction.message) || 'Не удалось распознать речь.',
        lastRecognizedText: '',
        status: AI_VOICE_STATUS.error,
      };
    case 'session-ended':
      return createAiVoiceInputState({
        lastRecognizedText: currentState.lastRecognizedText,
      });
    default:
      return currentState;
  }
}

export function mergeRecognizedTextIntoInput(currentInput, recognizedText) {
  const normalizedInput = normalizeText(currentInput);
  const normalizedRecognizedText = normalizeText(recognizedText);

  if (!normalizedRecognizedText) {
    return normalizedInput;
  }

  if (!normalizedInput) {
    return normalizedRecognizedText;
  }

  return `${normalizedInput} ${normalizedRecognizedText}`.trim();
}

export function extractSpeechResultText(event) {
  const results = Array.isArray(event?.results) ? event.results : [];
  const transcripts = results
    .map((result) => normalizeText(result?.transcript))
    .filter(Boolean);

  return transcripts.join(' ').trim();
}

export function getAiVoiceErrorMessage(error) {
  if (!error || typeof error !== 'object') {
    return 'Не удалось распознать речь.';
  }

  switch (error.error) {
    case 'aborted':
      return '';
    case 'audio-capture':
      return 'Не удалось получить звук с микрофона.';
    case 'busy':
      return 'Распознавание уже запущено. Остановите текущую запись и попробуйте снова.';
    case 'language-not-supported':
      return 'Распознавание речи для этого языка недоступно на устройстве.';
    case 'network':
      return 'Распознавание речи недоступно из-за проблемы с сетью.';
    case 'no-speech':
      return 'Речь не обнаружена. Попробуйте сказать ещё раз.';
    case 'not-allowed':
      return 'Нет доступа к микрофону или распознаванию речи.';
    case 'service-not-allowed':
      return 'Распознавание речи недоступно на этом устройстве или в браузере.';
    default:
      return normalizeText(error.message) || 'Не удалось распознать речь.';
  }
}

export function getAiVoiceStatusText(status) {
  if (status === AI_VOICE_STATUS.listening) {
    return 'Слушаю...';
  }

  if (status === AI_VOICE_STATUS.processing) {
    return 'Обрабатываю речь...';
  }

  return '';
}

export function buildAiVoiceContextualStrings({
  cultureCards = [],
  currentEmployee = null,
  scopedCard = null,
} = {}) {
  const employeeTerms = normalizeTextList([
    currentEmployee?.displayName,
    currentEmployee?.firstName,
    currentEmployee?.lastName,
    currentEmployee?.localUserId,
    'Sadovnik',
    'Guru',
    'партия',
    'культура',
    'стадия',
    'проблема',
    'карантин',
    'контаминация',
  ]);
  const scopedCardTerms = buildScopedCardTerms(scopedCard);
  const globalCardTerms = scopedCard
    ? []
    : buildGlobalCardTerms(cultureCards);

  return limitUniqueStrings([
    ...employeeTerms,
    ...scopedCardTerms,
    ...globalCardTerms,
  ]);
}
