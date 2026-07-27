import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CULTURE_CARDS_STORAGE_BACKUP_KEY,
  CULTURE_CARDS_RESET_KEY,
  CULTURE_CARDS_STORAGE_KEY,
} from '../domain/constants';
import { normalizeCultureCard } from '../domain/batch';
import {
  buildCultureCardsStorageEnvelope,
  parseCultureCardsStorageValue,
} from './cultureCardsStorageEnvelope';

export function createCultureCardsStorage(storage = AsyncStorage) {
  return {
    async loadCultureCardsFromStorage() {
      const wasReset = await storage.getItem(CULTURE_CARDS_RESET_KEY);

      if (!wasReset) {
        await storage.setItem(CULTURE_CARDS_RESET_KEY, 'true');
      }

      const savedCards = await storage.getItem(CULTURE_CARDS_STORAGE_KEY);
      const parsedStorage = parseCultureCardsStorageValue(savedCards);
      const cards = parsedStorage.cards.map(normalizeCultureCard);

      if (savedCards && parsedStorage.format !== 'envelope') {
        await storage.setItem(CULTURE_CARDS_STORAGE_BACKUP_KEY, savedCards);
        await storage.setItem(
          CULTURE_CARDS_STORAGE_KEY,
          JSON.stringify(buildCultureCardsStorageEnvelope(cards)),
        );
      }

      return cards;
    },

    async saveCultureCardsToStorage(nextCards) {
      const currentStorageValue = await storage.getItem(CULTURE_CARDS_STORAGE_KEY);

      if (currentStorageValue) {
        await storage.setItem(CULTURE_CARDS_STORAGE_BACKUP_KEY, currentStorageValue);
      }

      await storage.setItem(
        CULTURE_CARDS_STORAGE_KEY,
        JSON.stringify(buildCultureCardsStorageEnvelope(nextCards)),
      );
    },

    async clearCultureCardsForTests() {
      await storage.removeItem(CULTURE_CARDS_STORAGE_KEY);
      await storage.setItem(CULTURE_CARDS_RESET_KEY, 'true');
    },
  };
}

const defaultCultureCardsStorage = createCultureCardsStorage();

export const loadCultureCardsFromStorage = defaultCultureCardsStorage.loadCultureCardsFromStorage;
export const saveCultureCardsToStorage = defaultCultureCardsStorage.saveCultureCardsToStorage;
export const clearCultureCardsForTests = defaultCultureCardsStorage.clearCultureCardsForTests;
