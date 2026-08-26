import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AI_CHAT_HISTORY_STORAGE_KEY,
  AI_CHAT_HISTORY_STORAGE_SCHEMA_VERSION,
} from '../domain/constants';
import {
  ensureAiChatHistoryState,
  normalizeAiChat,
} from '../domain/aiChatHistory';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function buildAiChatHistoryStorageEnvelope(
  { activeChatId = null, chats = [] } = {},
  savedAt = new Date().toISOString(),
) {
  return {
    activeChatId,
    chats: (Array.isArray(chats) ? chats : []).map(normalizeAiChat),
    savedAt,
    schemaVersion: AI_CHAT_HISTORY_STORAGE_SCHEMA_VERSION,
  };
}

export function parseAiChatHistoryStorageValue(rawValue) {
  if (!rawValue) {
    return {
      activeChatId: null,
      chats: [],
    };
  }

  let parsedValue;

  try {
    parsedValue = JSON.parse(rawValue);
  } catch {
    return {
      activeChatId: null,
      chats: [],
    };
  }

  if (!isPlainObject(parsedValue) || !Array.isArray(parsedValue.chats)) {
    return {
      activeChatId: null,
      chats: [],
    };
  }

  return ensureAiChatHistoryState({
    activeChatId: parsedValue.activeChatId || null,
    chats: parsedValue.chats,
  });
}

export function createAiChatHistoryStorage(storage = AsyncStorage) {
  return {
    async clearAiChatHistoryForTests() {
      await storage.removeItem(AI_CHAT_HISTORY_STORAGE_KEY);
    },

    async loadAiChatHistoryFromStorage() {
      const rawValue = await storage.getItem(AI_CHAT_HISTORY_STORAGE_KEY);

      return parseAiChatHistoryStorageValue(rawValue);
    },

    async saveAiChatHistoryToStorage(historyState) {
      await storage.setItem(
        AI_CHAT_HISTORY_STORAGE_KEY,
        JSON.stringify(buildAiChatHistoryStorageEnvelope(historyState)),
      );
    },
  };
}

const defaultAiChatHistoryStorage = createAiChatHistoryStorage();

export const clearAiChatHistoryForTests = defaultAiChatHistoryStorage.clearAiChatHistoryForTests;
export const loadAiChatHistoryFromStorage = defaultAiChatHistoryStorage.loadAiChatHistoryFromStorage;
export const saveAiChatHistoryToStorage = defaultAiChatHistoryStorage.saveAiChatHistoryToStorage;
