import {
  AI_BACKEND_BASE_URL,
  GURU_API_TIMEOUT_MS,
  GURU_DEFAULT_MODEL,
  SADOVNIK_AI_CHAT_ENDPOINT,
} from '../config/guru';

const GENERIC_GURU_ERROR_MESSAGE = 'Не удалось получить ответ. Проверьте подключение к интернету.';

function createGuruApiError(code, userMessage = GENERIC_GURU_ERROR_MESSAGE, details = {}) {
  const error = new Error(userMessage);

  error.code = code;
  error.userMessage = userMessage;
  Object.assign(error, details);

  return error;
}

function normalizeOutgoingText(text) {
  return `${text || ''}`.trim();
}

function resolveModel(model, defaultModel) {
  const normalizedExplicitModel = `${model || ''}`.trim();

  if (normalizedExplicitModel) {
    return normalizedExplicitModel;
  }

  return `${defaultModel || ''}`.trim();
}

function resolveClientEndpoint(baseUrl, endpointPath) {
  const normalizedBaseUrl = `${baseUrl || ''}`.trim().replace(/\/+$/u, '');

  if (normalizedBaseUrl) {
    return `${normalizedBaseUrl}${endpointPath}`;
  }

  return endpointPath;
}

export function buildGuruRequestBody({
  context,
  defaultModel = GURU_DEFAULT_MODEL,
  dialogueUuid,
  model,
  text,
}) {
  const normalizedText = normalizeOutgoingText(text);

  if (!normalizedText) {
    throw createGuruApiError('empty_text', 'Введите сообщение перед отправкой.');
  }

  const normalizedDialogueUuid = `${dialogueUuid || ''}`.trim();

  if (!normalizedDialogueUuid) {
    throw createGuruApiError('missing_dialogue_uuid');
  }

  const requestBody = {
    dialogue_uuid: normalizedDialogueUuid,
    text: normalizedText,
  };

  if (context && typeof context === 'object') {
    requestBody.context = context;
  }

  const resolvedModel = resolveModel(model, defaultModel);

  if (resolvedModel) {
    requestBody.model = resolvedModel;
  }

  return requestBody;
}

function createLogger(logger) {
  if (!logger) {
    return {
      info() {},
      warn() {},
    };
  }

  return {
    info: typeof logger.info === 'function' ? logger.info.bind(logger) : () => {},
    warn: typeof logger.warn === 'function' ? logger.warn.bind(logger) : () => {},
  };
}

function isAbortError(error) {
  return error?.name === 'AbortError' || error?.code === 'ABORT_ERR';
}

export function createGuruApi({
  baseUrl = AI_BACKEND_BASE_URL,
  defaultModel = GURU_DEFAULT_MODEL,
  endpointPath = SADOVNIK_AI_CHAT_ENDPOINT,
  fetchImpl = globalThis.fetch,
  logger = null,
  timeoutMs = GURU_API_TIMEOUT_MS,
} = {}) {
  const safeLogger = createLogger(logger);
  const endpoint = resolveClientEndpoint(baseUrl, endpointPath);

  return {
    async sendMessage({ context, dialogueUuid, model, text }) {
      if (typeof fetchImpl !== 'function') {
        throw createGuruApiError('fetch_unavailable');
      }

      const requestBody = buildGuruRequestBody({
        context,
        defaultModel,
        dialogueUuid,
        model,
        text,
      });
      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      const startedAt = Date.now();
      let timeoutId = null;

      if (controller && Number.isFinite(timeoutMs) && timeoutMs > 0) {
        timeoutId = setTimeout(() => {
          controller.abort();
        }, timeoutMs);
      }

      safeLogger.info('AI backend request started', {
        hasContext: Boolean(requestBody.context),
        dialogueUuid: requestBody.dialogue_uuid,
        hasModel: Boolean(requestBody.model),
        textLength: requestBody.text.length,
      });

      let response;

      try {
        response = await fetchImpl(endpoint, {
          body: JSON.stringify(requestBody),
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          method: 'POST',
          signal: controller?.signal,
        });
      } catch (error) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (isAbortError(error)) {
          throw createGuruApiError('timeout');
        }

        throw createGuruApiError('network_error');
      }

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const elapsedMs = Date.now() - startedAt;
      safeLogger.info('AI backend request finished', {
        elapsedMs,
        hasResponse: true,
        status: response.status,
      });

      const rawResponseText = await response.text();

      if (!response.ok) {
        safeLogger.warn('AI backend request failed', {
          elapsedMs,
          status: response.status,
        });
        throw createGuruApiError(
          response.status >= 500 ? 'http_5xx' : 'http_4xx',
          GENERIC_GURU_ERROR_MESSAGE,
          { status: response.status },
        );
      }

      if (!rawResponseText.trim()) {
        throw createGuruApiError('empty_response');
      }

      let parsedResponse;

      try {
        parsedResponse = JSON.parse(rawResponseText);
      } catch {
        throw createGuruApiError('malformed_response');
      }

      const answerText = `${parsedResponse?.answer || ''}`.trim();

      if (!answerText) {
        throw createGuruApiError('empty_response');
      }

      return {
        data: parsedResponse,
        status: response.status,
        text: answerText,
      };
    },
  };
}

export const guruApi = createGuruApi({
  logger: typeof __DEV__ !== 'undefined' && __DEV__ ? console : null,
});
