import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CULTURE_CARDS_STORAGE_BACKUP_KEY,
  CULTURE_CARDS_RESET_KEY,
  CULTURE_CARDS_STORAGE_KEY,
} from '../domain/constants';
import { normalizeCultureCard } from '../domain/batch';
import {
  buildCultureCardsStorageEnvelope,
  CultureCardsStorageError,
  parseCultureCardsStorageValue,
} from './cultureCardsStorageEnvelope';

function normalizeStorageCards(cards) {
  return cards.map(normalizeCultureCard);
}

export function createCultureCardsStorage(storage = AsyncStorage) {
  return {
    async loadCultureCardsFromStorage() {
      const wasReset = await storage.getItem(CULTURE_CARDS_RESET_KEY);

      if (!wasReset) {
        await storage.setItem(CULTURE_CARDS_RESET_KEY, 'true');
      }

      const savedCards = await storage.getItem(CULTURE_CARDS_STORAGE_KEY);
      const parsedStorage = parseCultureCardsStorageValue(savedCards);
      const cards = normalizeStorageCards(parsedStorage.cards);

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

    async restoreCultureCardsBackupFromStorage() {
      const backupStorageValue = await storage.getItem(CULTURE_CARDS_STORAGE_BACKUP_KEY);

      if (!backupStorageValue) {
        throw new CultureCardsStorageError(
          'backup_not_found',
          'Culture cards storage backup is missing',
        );
      }

      let cards;
      try {
        cards = normalizeStorageCards(parseCultureCardsStorageValue(backupStorageValue).cards);
      } catch {
        throw new CultureCardsStorageError(
          'invalid_backup',
          'Culture cards storage backup cannot be restored',
        );
      }

      await storage.setItem(
        CULTURE_CARDS_STORAGE_KEY,
        JSON.stringify(buildCultureCardsStorageEnvelope(cards)),
      );

      return cards;
    },

    async getCultureCardsBackupStatusFromStorage() {
      const backupStorageValue = await storage.getItem(CULTURE_CARDS_STORAGE_BACKUP_KEY);

      if (!backupStorageValue) {
        return { status: 'missing' };
      }

      try {
        normalizeStorageCards(parseCultureCardsStorageValue(backupStorageValue).cards);
        return { status: 'valid' };
      } catch {
        return { status: 'invalid' };
      }
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
export const restoreCultureCardsBackupFromStorage = defaultCultureCardsStorage.restoreCultureCardsBackupFromStorage;
export const getCultureCardsBackupStatusFromStorage = defaultCultureCardsStorage.getCultureCardsBackupStatusFromStorage;
export const clearCultureCardsForTests = defaultCultureCardsStorage.clearCultureCardsForTests;
