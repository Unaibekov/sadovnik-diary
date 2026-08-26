/* global fetch, FormData */

const assert = require('node:assert/strict');
const test = require('node:test');

const { readServerConfig } = require('../../server/config.cjs');
const { buildCorsHeaders, createAiProxyServer } = require('../../server/create-server.cjs');
const {
  buildGuruContextPrompt,
  createGuruClient,
  extractGuruResponseText,
  summarizeGuruContext,
} = require('../../server/guru-client.cjs');

async function listen(server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();

  return `http://127.0.0.1:${address.port}`;
}

async function close(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

test('server config exposes default localhost CORS origins', () => {
  const config = readServerConfig({});

  assert.equal(config.allowedOrigins.includes('http://localhost:8081'), true);
  assert.equal(config.allowedOrigins.includes('http://localhost:8082'), true);
  assert.equal(config.guruEndpoint, 'https://tatneft.guru/api/http');
  assert.equal(config.port, 8787);
});

test('backend guru client sends Guru multipart payload and normalizes response', async () => {
  const loggerEvents = [];
  const client = createGuruClient({
    allowedModels: ['qwen2.5-72b'],
    defaultModel: 'qwen2.5-72b',
    endpoint: 'https://tatneft.guru/api/http',
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://tatneft.guru/api/http');
      assert.equal(options.body instanceof FormData, true);
      assert.equal(options.body.get('accesstoken'), 'secret-token');
      assert.equal(options.body.get('text').includes('Сводка: партий 1, проблемных 0'), true);
      assert.equal(options.body.get('text').includes('Вопрос пользователя:\nhello'), true);
      assert.equal(options.body.get('lm_model_type'), 'qwen2.5-72b');
      assert.equal(options.body.get('dialogue_uuid'), 'dialog-1');

      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({
            result: {
              message: 'Hello from Guru',
            },
          });
        },
      };
    },
    logger: {
      info(event, details) {
        loggerEvents.push([event, details]);
      },
      warn(event, details) {
        loggerEvents.push([event, details]);
      },
    },
    token: 'secret-token',
  });

  const result = await client.sendMessage({
    context: {
      summary: {
        cardsCount: 1,
      },
    },
    dialogueUuid: 'dialog-1',
    text: 'hello',
  });

  assert.deepEqual(result, { answer: 'Hello from Guru' });
  assert.equal(JSON.stringify(loggerEvents).includes('secret-token'), false);
});

test('summarizeGuruContext formats a compact operational summary', () => {
  const summary = summarizeGuruContext({
    employee: {
      displayName: 'Ильдар Унайбеков',
      localUserId: 'ильдар-унайбеков',
    },
    summary: {
      cardsCount: 46,
      activeProblemsCount: 6,
      focus: 'attention',
      statusCounts: {
        problem: 5,
        quarantine: 1,
        active: 40,
      },
      stageCounts: {
        'Введение в культуру': 11,
        Теплица: 7,
      },
    },
    attentionBatches: [
      {
        code: 'VK-1',
        stage: 'Теплица',
        batchStatus: 'problem',
        problemType: 'Контаминация',
        riskLevel: 'Высокий',
        activeProblemQuantity: 12,
        currentQuantity: 120,
      },
    ],
  });

  assert.equal(summary.includes('Сотрудник: Ильдар Унайбеков (ильдар-унайбеков)'), true);
  assert.equal(summary.includes('Сводка: партий 46, проблемных 6, режим attention.'), true);
  assert.equal(summary.includes('Партии внимания:'), true);
  assert.equal(summary.includes('1. VK-1, стадия: Теплица, статус: problem'), true);
});

test('buildGuruContextPrompt preserves plain question without context and injects compact context when present', () => {
  assert.equal(buildGuruContextPrompt({ text: 'hello' }), 'hello');

  const prompt = buildGuruContextPrompt({
    context: {
      summary: {
        cardsCount: 2,
        activeProblemsCount: 0,
      },
    },
    text: 'Какие проблемы есть?',
  });

  assert.equal(prompt.includes('Сводка: партий 2, проблемных 0'), true);
  assert.equal(prompt.includes('Какие проблемы есть?'), true);
});

test('backend guru client maps Guru 401 and 500 to safe proxy errors', async () => {
  const unauthorizedClient = createGuruClient({
    allowedModels: ['qwen2.5-72b'],
    defaultModel: 'qwen2.5-72b',
    endpoint: 'https://tatneft.guru/api/http',
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      async text() {
        return '{"error":"Unauthorized"}';
      },
    }),
    token: 'secret-token',
  });

  const failedClient = createGuruClient({
    allowedModels: ['qwen2.5-72b'],
    defaultModel: 'qwen2.5-72b',
    endpoint: 'https://tatneft.guru/api/http',
    fetchImpl: async () => ({
      ok: false,
      status: 500,
      async text() {
        return '{"error":"Upstream failed"}';
      },
    }),
    token: 'secret-token',
  });

  await assert.rejects(
    () => unauthorizedClient.sendMessage({ dialogueUuid: 'dialog-1', text: 'hello' }),
    (error) => error.statusCode === 502 && error.error === 'AI service temporarily unavailable',
  );

  await assert.rejects(
    () => failedClient.sendMessage({ dialogueUuid: 'dialog-1', text: 'hello' }),
    (error) => error.statusCode === 503 && error.error === 'AI service temporarily unavailable',
  );
});

test('backend guru client handles timeout, malformed response, and missing fields', async () => {
  const timeoutClient = createGuruClient({
    allowedModels: ['qwen2.5-72b'],
    defaultModel: 'qwen2.5-72b',
    endpoint: 'https://tatneft.guru/api/http',
    fetchImpl: async () => {
      const abortError = new Error('aborted');
      abortError.name = 'AbortError';
      throw abortError;
    },
    token: 'secret-token',
  });

  const malformedClient = createGuruClient({
    allowedModels: ['qwen2.5-72b'],
    defaultModel: 'qwen2.5-72b',
    endpoint: 'https://tatneft.guru/api/http',
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      async text() {
        return '{"response":""}';
      },
    }),
    token: 'secret-token',
  });

  await assert.rejects(
    () => timeoutClient.sendMessage({ dialogueUuid: 'dialog-1', text: 'hello' }),
    (error) => error.statusCode === 504,
  );

  await assert.rejects(
    () => malformedClient.sendMessage({ dialogueUuid: 'dialog-1', text: 'hello' }),
    (error) => error.statusCode === 502,
  );

  await assert.rejects(
    () => malformedClient.sendMessage({ dialogueUuid: '', text: 'hello' }),
    (error) => error.statusCode === 400,
  );

  await assert.rejects(
    () => malformedClient.sendMessage({ dialogueUuid: 'dialog-1', text: '   ' }),
    (error) => error.statusCode === 400,
  );

  await assert.rejects(
    () => malformedClient.sendMessage({ dialogueUuid: 'dialog-1', model: 'bad-model', text: 'hello' }),
    (error) => error.statusCode === 400,
  );
});

test('extractGuruResponseText supports Guru payloads', () => {
  assert.equal(
    extractGuruResponseText({
      result: {
        message: 'Hello from Guru',
      },
    }),
    'Hello from Guru',
  );
});

test('extractGuruResponseText uses live Guru result.message structure', () => {
  const rawGuruResponse = {
    result: {
      message: 'Здравствуйте! Я рад приветствовать Вас.',
      error_info: null,
      description: null,
      docs: null,
      tokens: null,
      is_eos: true,
      query_uuid: 'd43a5287-27f1-47f0-a4c1-02347dc8b9de',
      event_source: 'agent_controller\r\ndd352a83-669e-48a9-9c6b-6b4d37c9e358',
      status_info: 'Выполняю Генерацию... (24.08.2026 13:07:43)',
      queries: null,
      dialogue_uuid: '65e89787-d22d-47ac-91d7-920a8c51c671',
      eventPayload: null,
      artefact: null,
      srt: null,
      reasoning: null,
    },
  };

  assert.equal(
    extractGuruResponseText(rawGuruResponse),
    'Здравствуйте! Я рад приветствовать Вас.',
  );
});

test('extractGuruResponseText never returns object stringification for Guru result object', () => {
  const rawGuruResponse = {
    result: {
      message: {
        text: 'Здравствуйте! Я рад приветствовать Вас.',
      },
    },
  };

  assert.equal(extractGuruResponseText(rawGuruResponse), '');
  assert.notEqual(extractGuruResponseText(rawGuruResponse), '[object Object]');
});

test('buildCorsHeaders returns exact allowed origin and never wildcard', () => {
  const headers = buildCorsHeaders('http://localhost:8081', ['http://localhost:8081']);

  assert.equal(headers['Access-Control-Allow-Origin'], 'http://localhost:8081');
  assert.equal(Object.values(headers).includes('*'), false);
  assert.equal(buildCorsHeaders('http://evil.test', ['http://localhost:8081']), null);
});

test('POST /api/ai/chat returns normalized answer, hides token, and supports CORS', async () => {
  const loggerEvents = [];
  const server = createAiProxyServer({
    allowedOrigins: ['http://localhost:8081'],
    guruClient: {
      async sendMessage(payload) {
        assert.deepEqual(payload, {
          context: {
            summary: {
              cardsCount: 1,
            },
          },
          dialogueUuid: 'dialog-1',
          model: 'qwen2.5-72b',
          text: 'hello',
        });

        return {
          answer: 'Hello AI',
        };
      },
    },
    logger: {
      warn(event, details) {
        loggerEvents.push([event, details]);
      },
    },
  });
  const baseUrl = await listen(server);

  try {
    const response = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:8081',
      },
      body: JSON.stringify({
        context: {
          summary: {
            cardsCount: 1,
          },
        },
        dialogue_uuid: 'dialog-1',
        model: 'qwen2.5-72b',
        text: 'hello',
      }),
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:8081');
    assert.deepEqual(body, { answer: 'Hello AI' });
    assert.equal(JSON.stringify(body).includes('secret-token'), false);
    assert.equal(JSON.stringify(loggerEvents).includes('secret-token'), false);
  } finally {
    await close(server);
  }
});

test('OPTIONS /api/ai/chat answers with allowed CORS headers', async () => {
  const server = createAiProxyServer({
    allowedOrigins: ['http://localhost:8081'],
    guruClient: {
      async sendMessage() {
        throw new Error('not needed');
      },
    },
  });
  const baseUrl = await listen(server);

  try {
    const response = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:8081',
      },
    });

    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:8081');
  } finally {
    await close(server);
  }
});

test('POST /api/ai/chat returns safe errors for invalid JSON and upstream failures', async () => {
  const server = createAiProxyServer({
    allowedOrigins: ['http://localhost:8081'],
    guruClient: {
      async sendMessage() {
        const error = new Error('upstream');
        error.statusCode = 503;
        error.error = 'AI service temporarily unavailable';
        error.upstreamStatus = 500;
        throw error;
      },
    },
  });
  const baseUrl = await listen(server);

  try {
    const invalidJsonResponse = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:8081',
      },
      body: '{bad json',
    });
    const invalidJsonBody = await invalidJsonResponse.json();

    assert.equal(invalidJsonResponse.status, 400);
    assert.deepEqual(invalidJsonBody, { error: 'Invalid JSON' });

    const upstreamFailureResponse = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:8081',
      },
      body: JSON.stringify({
        dialogue_uuid: 'dialog-1',
        text: 'hello',
      }),
    });
    const upstreamFailureBody = await upstreamFailureResponse.json();

    assert.equal(upstreamFailureResponse.status, 503);
    assert.deepEqual(upstreamFailureBody, { error: 'AI service temporarily unavailable' });
  } finally {
    await close(server);
  }
});
