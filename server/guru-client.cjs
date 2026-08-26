/* global AbortController, FormData, clearTimeout, setTimeout */

const GENERIC_CLIENT_ERROR = 'AI service temporarily unavailable';

function createHttpError(statusCode, error, details = {}) {
  const instance = new Error(error);

  instance.statusCode = statusCode;
  instance.error = error;
  Object.assign(instance, details);

  return instance;
}

function normalizeText(text) {
  return `${text || ''}`.trim();
}

function normalizeContext(context) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    return null;
  }

  return context;
}

function normalizeModel(model, defaultModel) {
  const explicitModel = `${model || ''}`.trim();

  if (explicitModel) {
    return explicitModel;
  }

  return `${defaultModel || ''}`.trim();
}

function extractGuruResponseText(payload) {
  if (typeof payload === 'string') {
    return payload.trim();
  }

  if (!payload || typeof payload !== 'object') {
    return '';
  }

  if (typeof payload.result?.message === 'string') {
    return payload.result.message.trim();
  }

  const candidates = [
    payload.answer,
    payload.response,
    payload.text,
    payload.message,
  ];

  const match = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim());

  return match ? match.trim() : '';
}

function sanitizeGuruLogBody(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const rest = { ...body };

  delete rest.accesstoken;
  if (rest.text) {
    rest.text = `[text length: ${rest.text.length}]`;
  }

  return rest;
}

function formatCounts(counts, preferredKeys = []) {
  if (!counts || typeof counts !== 'object') {
    return '';
  }

  const orderedEntries = [];
  const seenKeys = new Set();

  preferredKeys.forEach((key) => {
    if (counts[key] !== undefined) {
      orderedEntries.push([key, counts[key]]);
      seenKeys.add(key);
    }
  });

  Object.entries(counts).forEach(([key, value]) => {
    if (!seenKeys.has(key)) {
      orderedEntries.push([key, value]);
    }
  });

  return orderedEntries
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
}

function formatBatchLine(batch, index) {
  if (!batch || typeof batch !== 'object') {
    return '';
  }

  const parts = [
    `${index + 1}. ${normalizeText(batch.code) || 'без кода'}`,
    `стадия: ${normalizeText(batch.stage) || 'не указана'}`,
    `статус: ${normalizeText(batch.batchStatus) || 'не указан'}`,
  ];

  if (batch.problemType) {
    parts.push(`проблема: ${normalizeText(batch.problemType)}`);
  }

  if (batch.riskLevel) {
    parts.push(`риск: ${normalizeText(batch.riskLevel)}`);
  }

  if (Number.isFinite(Number(batch.activeProblemQuantity))) {
    parts.push(`проблемных: ${Number(batch.activeProblemQuantity)}`);
  }

  if (Number.isFinite(Number(batch.currentQuantity))) {
    parts.push(`остаток: ${Number(batch.currentQuantity)}`);
  }

  return parts.join(', ');
}

function summarizeGuruContext(context) {
  const normalizedContext = normalizeContext(context);

  if (!normalizedContext) {
    return '';
  }

  const lines = [];
  const employeeName = normalizeText(normalizedContext.employee?.displayName);
  const employeeId = normalizeText(normalizedContext.employee?.localUserId);
  const summary = normalizedContext.summary || {};
  const statusCounts = formatCounts(summary.statusCounts, ['problem', 'quarantine', 'active']);
  const stageCounts = formatCounts(summary.stageCounts);
  const attentionBatches = Array.isArray(normalizedContext.attentionBatches)
    ? normalizedContext.attentionBatches
    : [];
  const overviewBatches = Array.isArray(normalizedContext.overviewBatches)
    ? normalizedContext.overviewBatches
    : [];
  const focusBatches = attentionBatches.length > 0 ? attentionBatches : overviewBatches;

  if (employeeName || employeeId) {
    lines.push(`Сотрудник: ${employeeName || employeeId}${employeeName && employeeId ? ` (${employeeId})` : ''}`);
  }

  lines.push(
    `Сводка: партий ${Number(summary.cardsCount) || 0}, проблемных ${Number(summary.activeProblemsCount) || 0}, режим ${normalizeText(summary.focus) || 'overview'}.`,
  );

  if (statusCounts) {
    lines.push(`Статусы: ${statusCounts}.`);
  }

  if (stageCounts) {
    lines.push(`Стадии: ${stageCounts}.`);
  }

  if (focusBatches.length > 0) {
    lines.push('Партии внимания:');
    focusBatches.forEach((batch, index) => {
      lines.push(formatBatchLine(batch, index));
    });
  }

  return lines.join('\n');
}

function buildGuruContextPrompt({ context, text }) {
  const normalizedText = normalizeText(text);
  const normalizedContext = normalizeContext(context);

  if (!normalizedText) {
    return '';
  }

  if (!normalizedContext) {
    return normalizedText;
  }

  const contextSummary = summarizeGuruContext(normalizedContext);

  return [
    'Ты AI-ассистент Sadovnik Diary.',
    'Отвечай только по данным из контекста. Если данных недостаточно, скажи об этом прямо.',
    '',
    'Контекст Sadovnik:',
    contextSummary,
    '',
    'Вопрос пользователя:',
    normalizedText,
  ].join('\n');
}

function isAbortError(error) {
  return error?.name === 'AbortError' || error?.code === 'ABORT_ERR';
}

function createLogger(logger) {
  if (!logger) {
    return {
      error() {},
      info() {},
      warn() {},
    };
  }

  return {
    error: typeof logger.error === 'function' ? logger.error.bind(logger) : () => {},
    info: typeof logger.info === 'function' ? logger.info.bind(logger) : () => {},
    warn: typeof logger.warn === 'function' ? logger.warn.bind(logger) : () => {},
  };
}

function validateRequestPayload({ allowedModels, defaultModel, dialogueUuid, text, model }) {
  const normalizedText = normalizeText(text);

  if (!normalizedText) {
    throw createHttpError(400, 'Text is required');
  }

  const normalizedDialogueUuid = `${dialogueUuid || ''}`.trim();

  if (!normalizedDialogueUuid) {
    throw createHttpError(400, 'dialogue_uuid is required');
  }

  const normalizedModel = normalizeModel(model, defaultModel);

  if (!normalizedModel) {
    throw createHttpError(400, 'model is required');
  }

  if (allowedModels.length > 0 && !allowedModels.includes(normalizedModel)) {
    throw createHttpError(400, 'Unsupported model');
  }

  return {
    dialogue_uuid: normalizedDialogueUuid,
    lm_model_type: normalizedModel,
    text: normalizedText,
  };
}

function mapGuruFailureStatus(status) {
  if (status >= 500) {
    return 503;
  }

  return 502;
}

function createGuruClient({
  allowedModels = [],
  defaultModel,
  endpoint,
  fetchImpl = globalThis.fetch,
  logger = null,
  timeoutMs = 15000,
  token,
} = {}) {
  const safeLogger = createLogger(logger);

  if (!`${token || ''}`.trim()) {
    throw new Error('Missing Guru access token');
  }

  return {
    async sendMessage({ context, dialogueUuid, model, text }) {
      if (typeof fetchImpl !== 'function') {
        throw new Error('fetch is unavailable');
      }

      const validatedPayload = validateRequestPayload({
        allowedModels,
        defaultModel,
        dialogueUuid,
        model,
        text: buildGuruContextPrompt({ context, text }),
      });
      const requestBody = {
        ...validatedPayload,
        accesstoken: token,
      };
      const formData = new FormData();

      formData.set('accesstoken', requestBody.accesstoken);
      formData.set('text', requestBody.text);
      formData.set('lm_model_type', requestBody.lm_model_type);
      formData.set('dialogue_uuid', requestBody.dialogue_uuid);

      safeLogger.info('AI upstream request started', {
        body: sanitizeGuruLogBody(requestBody),
        hasContext: Boolean(normalizeContext(context)),
      });

      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      const startedAt = Date.now();
      let timeoutId = null;

      if (controller && Number.isFinite(timeoutMs) && timeoutMs > 0) {
        timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      }

      let response;

      try {
        response = await fetchImpl(endpoint, {
          body: formData,
          headers: {
            Accept: 'application/json',
          },
          method: 'POST',
          signal: controller?.signal,
        });
      } catch (error) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (isAbortError(error)) {
          safeLogger.warn('AI upstream request timed out', {
            elapsedMs: Date.now() - startedAt,
          });
          throw createHttpError(504, GENERIC_CLIENT_ERROR);
        }

        safeLogger.warn('AI upstream network error', {
          elapsedMs: Date.now() - startedAt,
          message: error?.message || 'network_error',
        });
        throw createHttpError(503, GENERIC_CLIENT_ERROR);
      }

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const elapsedMs = Date.now() - startedAt;
      const rawResponse = await response.text();

      safeLogger.info('AI upstream request finished', {
        elapsedMs,
        hasBody: Boolean(rawResponse.trim()),
        status: response.status,
      });

      if (!response.ok) {
        safeLogger.warn('AI upstream error', {
          elapsedMs,
          status: response.status,
        });
        throw createHttpError(mapGuruFailureStatus(response.status), GENERIC_CLIENT_ERROR, {
          upstreamStatus: response.status,
        });
      }

      if (!rawResponse.trim()) {
        throw createHttpError(502, GENERIC_CLIENT_ERROR);
      }

      let parsedResponse;

      try {
        parsedResponse = JSON.parse(rawResponse);
      } catch {
        throw createHttpError(502, GENERIC_CLIENT_ERROR);
      }

      const answer = extractGuruResponseText(parsedResponse);

      if (!answer) {
        throw createHttpError(502, GENERIC_CLIENT_ERROR);
      }

      return {
        answer,
      };
    },
  };
}

module.exports = {
  GENERIC_CLIENT_ERROR,
  buildGuruContextPrompt,
  createGuruClient,
  createHttpError,
  extractGuruResponseText,
  sanitizeGuruLogBody,
  summarizeGuruContext,
};
