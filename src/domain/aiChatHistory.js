import { createDialogueUuid } from './aiChat';

export const AI_CHAT_DEFAULT_TITLE = 'Новый чат';

const AI_CHAT_TITLE_MAX_LENGTH = 72;

function normalizeText(value) {
  return `${value || ''}`.replace(/\s+/g, ' ').trim();
}

function normalizeTimestamp(value, fallbackValue) {
  const normalizedValue = `${value || ''}`.trim();

  if (!normalizedValue) {
    return fallbackValue;
  }

  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return fallbackValue;
  }

  return parsedDate.toISOString();
}

function normalizeAiChatScope(scope) {
  if (!scope || typeof scope !== 'object' || Array.isArray(scope)) {
    return null;
  }

  const type = normalizeText(scope.type);
  const cardId = normalizeText(scope.cardId);

  if (type !== 'card' || !cardId) {
    return null;
  }

  const cardCode = normalizeText(scope.cardCode);
  const cardTitle = normalizeText(scope.cardTitle);

  return {
    type: 'card',
    cardId,
    cardCode: cardCode || undefined,
    cardTitle: cardTitle || undefined,
  };
}

export function buildAiChatTitle(text, maxLength = AI_CHAT_TITLE_MAX_LENGTH) {
  const normalizedText = normalizeText(text);

  if (!normalizedText) {
    return AI_CHAT_DEFAULT_TITLE;
  }

  if (normalizedText.length <= maxLength) {
    return normalizedText;
  }

  return `${normalizedText.slice(0, Math.max(maxLength - 1, 1)).trimEnd()}…`;
}

export function normalizeAiChatMessage(message, fallbackCreatedAt = new Date().toISOString()) {
  const normalizedText = normalizeText(message?.text);
  const role = message?.role === 'assistant' ? 'assistant' : 'user';
  const createdAt = normalizeTimestamp(message?.createdAt, fallbackCreatedAt);

  return {
    id: normalizeText(message?.id) || `${role}-${createdAt}`,
    createdAt,
    role,
    text: normalizedText,
  };
}

export function deriveAiChatTitle(messages) {
  const firstUserMessage = (Array.isArray(messages) ? messages : []).find(
    (message) => message?.role === 'user' && normalizeText(message?.text),
  );

  return buildAiChatTitle(firstUserMessage?.text || '');
}

export function createAiChat({
  createdAt = new Date().toISOString(),
  dialogueUuid,
  id,
  scope = null,
  title = AI_CHAT_DEFAULT_TITLE,
} = {}) {
  const normalizedCreatedAt = normalizeTimestamp(createdAt, new Date().toISOString());
  const nextDialogueUuid = normalizeText(dialogueUuid) || createDialogueUuid();
  const nextId = normalizeText(id) || nextDialogueUuid;

  return {
    id: nextId,
    dialogueUuid: nextDialogueUuid,
    scope: normalizeAiChatScope(scope),
    title: normalizeText(title) || AI_CHAT_DEFAULT_TITLE,
    createdAt: normalizedCreatedAt,
    updatedAt: normalizedCreatedAt,
    messages: [],
  };
}

export function normalizeAiChat(chat) {
  const fallbackCreatedAt = new Date().toISOString();
  const createdAt = normalizeTimestamp(chat?.createdAt, fallbackCreatedAt);
  const dialogueUuid = normalizeText(chat?.dialogueUuid) || createDialogueUuid();
  const messages = (Array.isArray(chat?.messages) ? chat.messages : [])
    .map((message) => normalizeAiChatMessage(message, createdAt))
    .filter((message) => message.text);
  const updatedAt = normalizeTimestamp(
    chat?.updatedAt,
    messages[messages.length - 1]?.createdAt || createdAt,
  );

  return {
    id: normalizeText(chat?.id) || dialogueUuid,
    dialogueUuid,
    scope: normalizeAiChatScope(chat?.scope),
    title: normalizeText(chat?.title) || deriveAiChatTitle(messages) || AI_CHAT_DEFAULT_TITLE,
    createdAt,
    updatedAt,
    messages,
  };
}

export function sortAiChats(chats) {
  return [...(Array.isArray(chats) ? chats : [])].sort((left, right) => {
    const rightTime = Date.parse(right?.updatedAt || '') || 0;
    const leftTime = Date.parse(left?.updatedAt || '') || 0;

    return rightTime - leftTime;
  });
}

export function addMessageToAiChat(chat, message) {
  const normalizedChat = normalizeAiChat(chat);
  const normalizedMessage = normalizeAiChatMessage(
    message,
    normalizedChat.updatedAt || normalizedChat.createdAt,
  );
  const messages = [...normalizedChat.messages, normalizedMessage];

  return normalizeAiChat({
    ...normalizedChat,
    messages,
    title: deriveAiChatTitle(messages),
    updatedAt: normalizedMessage.createdAt,
  });
}

export function updateAiChat(chats, chatId, updater) {
  return sortAiChats(
    (Array.isArray(chats) ? chats : []).map((chat) => {
      if (chat.id !== chatId) {
        return normalizeAiChat(chat);
      }

      const currentChat = normalizeAiChat(chat);
      const updatedChat = typeof updater === 'function'
        ? updater(currentChat)
        : { ...currentChat, ...updater };

      return normalizeAiChat(updatedChat);
    }),
  );
}

export function deleteAiChat(chats, chatId) {
  return sortAiChats(
    (Array.isArray(chats) ? chats : [])
      .map(normalizeAiChat)
      .filter((chat) => chat.id !== chatId),
  );
}

export function getAiChatById(chats, chatId) {
  return (Array.isArray(chats) ? chats : []).find((chat) => chat.id === chatId) || null;
}

export function getActiveAiChat(chats, activeChatId) {
  const normalizedChats = sortAiChats((Array.isArray(chats) ? chats : []).map(normalizeAiChat));

  if (normalizedChats.length === 0) {
    return null;
  }

  return getAiChatById(normalizedChats, activeChatId) || normalizedChats[0];
}

export function ensureAiChatHistoryState({ activeChatId = null, chats = [] } = {}) {
  const normalizedChats = sortAiChats((Array.isArray(chats) ? chats : []).map(normalizeAiChat));

  if (normalizedChats.length === 0) {
    const chat = createAiChat();

    return {
      activeChatId: chat.id,
      chats: [chat],
    };
  }

  const nextActiveChatId = normalizedChats.some((chat) => chat.id === activeChatId)
    ? activeChatId
    : normalizedChats[0].id;

  return {
    activeChatId: nextActiveChatId,
    chats: normalizedChats,
  };
}
