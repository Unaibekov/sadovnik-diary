const assert = require('node:assert/strict');
const test = require('node:test');

const {
  AI_CHAT_HISTORY_STORAGE_KEY,
} = require('../../src/domain/constants');
const {
  addMessageToAiChat,
  buildAiChatTitle,
  createAiChat,
  deleteAiChat,
  ensureAiChatHistoryState,
  getActiveAiChat,
  updateAiChat,
} = require('../../src/domain/aiChatHistory');
const {
  createAiChatHistoryStorage,
} = require('../../src/services/aiChatHistoryStorage');

function createMemoryAsyncStorage(initialValues = {}) {
  const store = new Map(Object.entries(initialValues));

  return {
    async getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async removeItem(key) {
      store.delete(key);
    },
    async setItem(key, value) {
      store.set(key, value);
    },
  };
}

test('createAiChat creates a unique dialogue uuid', () => {
  const firstChat = createAiChat();
  const secondChat = createAiChat();

  assert.equal(typeof firstChat.dialogueUuid, 'string');
  assert.equal(typeof secondChat.dialogueUuid, 'string');
  assert.notEqual(firstChat.dialogueUuid, secondChat.dialogueUuid);
});

test('two chats receive different uuids', () => {
  const firstChat = createAiChat();
  const secondChat = createAiChat();

  assert.notEqual(firstChat.id, secondChat.id);
  assert.notEqual(firstChat.dialogueUuid, secondChat.dialogueUuid);
});

test('createAiChat preserves scoped card metadata', () => {
  const chat = createAiChat({
    dialogueUuid: 'dialog-card',
    scope: {
      type: 'card',
      cardId: 'card-42',
      cardCode: 'VK-042',
      cardTitle: 'Hydrangea batch',
    },
  });

  assert.equal(chat.scope.type, 'card');
  assert.equal(chat.scope.cardId, 'card-42');
  assert.equal(chat.scope.cardCode, 'VK-042');
  assert.equal(chat.scope.cardTitle, 'Hydrangea batch');
});

test('addMessageToAiChat stores user and assistant messages', () => {
  const baseChat = createAiChat({ createdAt: '2026-08-24T10:00:00.000Z' });
  const withUser = addMessageToAiChat(baseChat, {
    id: 'message-1',
    createdAt: '2026-08-24T10:01:00.000Z',
    role: 'user',
    text: 'Меня зовут Алексей.',
  });
  const withAssistant = addMessageToAiChat(withUser, {
    id: 'message-2',
    createdAt: '2026-08-24T10:02:00.000Z',
    role: 'assistant',
    text: 'Здравствуйте, Алексей!',
  });

  assert.equal(withAssistant.messages.length, 2);
  assert.equal(withAssistant.messages[0].role, 'user');
  assert.equal(withAssistant.messages[1].role, 'assistant');
});

test('title is derived from the first user message', () => {
  const chat = addMessageToAiChat(createAiChat(), {
    id: 'message-1',
    createdAt: '2026-08-24T10:01:00.000Z',
    role: 'user',
    text: 'Какие проблемы сейчас есть с гортензиями в теплице номер два?',
  });

  assert.equal(
    chat.title,
    buildAiChatTitle('Какие проблемы сейчас есть с гортензиями в теплице номер два?'),
  );
});

test('updateAiChat keeps updatedAt when chat is modified', () => {
  const chat = createAiChat({ createdAt: '2026-08-24T10:00:00.000Z' });
  const updatedChats = updateAiChat([chat], chat.id, {
    updatedAt: '2026-08-24T11:00:00.000Z',
  });

  assert.equal(updatedChats[0].updatedAt, '2026-08-24T11:00:00.000Z');
});

test('ensureAiChatHistoryState restores an active chat from history', () => {
  const firstChat = createAiChat({ dialogueUuid: 'dialog-a', createdAt: '2026-08-24T10:00:00.000Z' });
  const secondChat = createAiChat({ dialogueUuid: 'dialog-b', createdAt: '2026-08-24T11:00:00.000Z' });
  const historyState = ensureAiChatHistoryState({
    activeChatId: firstChat.id,
    chats: [firstChat, secondChat],
  });

  assert.equal(getActiveAiChat(historyState.chats, historyState.activeChatId).dialogueUuid, 'dialog-a');
});

test('messages from one chat do not leak into another', () => {
  const firstChat = addMessageToAiChat(
    createAiChat({ dialogueUuid: 'dialog-a' }),
    {
      id: 'message-a',
      createdAt: '2026-08-24T10:01:00.000Z',
      role: 'user',
      text: 'Меня зовут Алексей.',
    },
  );
  const secondChat = addMessageToAiChat(
    createAiChat({ dialogueUuid: 'dialog-b' }),
    {
      id: 'message-b',
      createdAt: '2026-08-24T10:02:00.000Z',
      role: 'user',
      text: 'Как ухаживать за гортензией?',
    },
  );

  assert.equal(firstChat.messages.length, 1);
  assert.equal(secondChat.messages.length, 1);
  assert.equal(firstChat.messages[0].text.includes('Алексей'), true);
  assert.equal(secondChat.messages[0].text.includes('гортензией'), true);
});

test('old chat remains after creating a new one', () => {
  const firstChat = createAiChat({ dialogueUuid: 'dialog-a' });
  const nextHistoryState = ensureAiChatHistoryState({
    activeChatId: 'dialog-b',
    chats: [createAiChat({ dialogueUuid: 'dialog-b' }), firstChat],
  });

  assert.equal(nextHistoryState.chats.some((chat) => chat.dialogueUuid === 'dialog-a'), true);
  assert.equal(nextHistoryState.chats.some((chat) => chat.dialogueUuid === 'dialog-b'), true);
});

test('history survives save and load', async () => {
  const storage = createMemoryAsyncStorage();
  const aiChatHistoryStorage = createAiChatHistoryStorage(storage);
  const chat = addMessageToAiChat(
    createAiChat({ dialogueUuid: 'dialog-a', createdAt: '2026-08-24T10:00:00.000Z' }),
    {
      id: 'message-1',
      createdAt: '2026-08-24T10:01:00.000Z',
      role: 'user',
      text: 'Меня зовут Алексей.',
    },
  );

  await aiChatHistoryStorage.saveAiChatHistoryToStorage({
    activeChatId: chat.id,
    chats: [chat],
  });

  const loadedState = await aiChatHistoryStorage.loadAiChatHistoryFromStorage();

  assert.equal(typeof await storage.getItem(AI_CHAT_HISTORY_STORAGE_KEY), 'string');
  assert.equal(loadedState.activeChatId, chat.id);
  assert.equal(loadedState.chats[0].messages[0].text, 'Меня зовут Алексей.');
});

test('deleteAiChat removes only the selected chat', () => {
  const firstChat = createAiChat({ dialogueUuid: 'dialog-a' });
  const secondChat = createAiChat({ dialogueUuid: 'dialog-b' });
  const remainingChats = deleteAiChat([firstChat, secondChat], firstChat.id);

  assert.equal(remainingChats.length, 1);
  assert.equal(remainingChats[0].dialogueUuid, 'dialog-b');
});
