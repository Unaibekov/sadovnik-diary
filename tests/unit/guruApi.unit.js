const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildGuruRequestBody,
  createGuruApi,
} = require('../../src/services/guruApi');

test('guru api builds backend request body with dialogue_uuid default model and optional context', () => {
  const body = buildGuruRequestBody({
    context: { summary: { cardsCount: 1 } },
    defaultModel: 'qwen2.5-72b',
    dialogueUuid: 'dialog-1',
    text: '  Привет  ',
  });

  assert.deepEqual(body, {
    context: { summary: { cardsCount: 1 } },
    dialogue_uuid: 'dialog-1',
    model: 'qwen2.5-72b',
    text: 'Привет',
  });
});

test('guru api omits context for generic message when it is not provided', () => {
  const body = buildGuruRequestBody({
    defaultModel: 'qwen2.5-72b',
    dialogueUuid: 'dialog-1',
    text: 'Привет',
  });

  assert.deepEqual(body, {
    dialogue_uuid: 'dialog-1',
    model: 'qwen2.5-72b',
    text: 'Привет',
  });
});

test('guru api allows explicit model override', () => {
  const body = buildGuruRequestBody({
    defaultModel: 'qwen2.5-72b',
    dialogueUuid: 'dialog-1',
    model: 'guru-pro',
    text: 'Тест',
  });

  assert.equal(body.model, 'guru-pro');
});

test('guru api rejects empty text before request', async () => {
  const api = createGuruApi({
    fetchImpl: async () => {
      throw new Error('fetch should not be called');
    },
  });

  await assert.rejects(
    () => api.sendMessage({ dialogueUuid: 'dialog-1', text: '   ' }),
    (error) => error.code === 'empty_text',
  );
});

test('guru api sends request to Sadovnik backend endpoint', async () => {
  const calls = [];
  const api = createGuruApi({
    baseUrl: 'http://localhost:8787',
    defaultModel: '',
    fetchImpl: async (url, options) => {
      calls.push({ options, url });

      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({ answer: 'Ответ от backend' });
        },
      };
    },
  });

  const result = await api.sendMessage({
    context: {
      summary: {
        cardsCount: 1,
      },
    },
    dialogueUuid: 'dialog-1',
    text: 'Привет',
  });

  assert.equal(result.text, 'Ответ от backend');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'http://localhost:8787/api/ai/chat');
  assert.equal(calls[0].options.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    context: {
      summary: {
        cardsCount: 1,
      },
    },
    dialogue_uuid: 'dialog-1',
    text: 'Привет',
  });
});

test('guru api reads normalized backend answer', async () => {
  const api = createGuruApi({
    baseUrl: '',
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({ answer: 'Здравствуйте!' });
      },
    }),
  });

  const result = await api.sendMessage({
    dialogueUuid: 'dialog-1',
    text: 'Привет',
  });

  assert.equal(result.text, 'Здравствуйте!');
});

test('guru api returns http error for backend non-2xx response', async () => {
  const api = createGuruApi({
    fetchImpl: async () => ({
      ok: false,
      status: 503,
      async text() {
        return '{"error":"AI service temporarily unavailable"}';
      },
    }),
  });

  await assert.rejects(
    () => api.sendMessage({ dialogueUuid: 'dialog-1', text: 'Привет' }),
    (error) => error.code === 'http_5xx' && error.status === 503,
  );
});

test('guru api converts abort to timeout error', async () => {
  const api = createGuruApi({
    fetchImpl: async () => {
      const abortError = new Error('aborted');
      abortError.name = 'AbortError';
      throw abortError;
    },
  });

  await assert.rejects(
    () => api.sendMessage({ dialogueUuid: 'dialog-1', text: 'Привет' }),
    (error) => error.code === 'timeout',
  );
});

test('guru api rejects malformed backend response payload', async () => {
  const api = createGuruApi({
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      async text() {
        return 'not-json';
      },
    }),
  });

  await assert.rejects(
    () => api.sendMessage({ dialogueUuid: 'dialog-1', text: 'Привет' }),
    (error) => error.code === 'malformed_response',
  );
});

test('guru api rejects empty backend answer', async () => {
  const api = createGuruApi({
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({ answer: '   ' });
      },
    }),
  });

  await assert.rejects(
    () => api.sendMessage({ dialogueUuid: 'dialog-1', text: 'Привет' }),
    (error) => error.code === 'empty_response',
  );
});
