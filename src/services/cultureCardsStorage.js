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

export async function loadCultureCardsFromStorage() {
  const wasReset = await AsyncStorage.getItem(CULTURE_CARDS_RESET_KEY);

  if (!wasReset) {
    await AsyncStorage.setItem(CULTURE_CARDS_RESET_KEY, 'true');
  }

  const savedCards = await AsyncStorage.getItem(CULTURE_CARDS_STORAGE_KEY);
  const { cards } = parseCultureCardsStorageValue(savedCards);

  return cards.map(normalizeCultureCard);
}

export async function saveCultureCardsToStorage(nextCards) {
  const currentStorageValue = await AsyncStorage.getItem(CULTURE_CARDS_STORAGE_KEY);

  if (currentStorageValue) {
    await AsyncStorage.setItem(CULTURE_CARDS_STORAGE_BACKUP_KEY, currentStorageValue);
  }

  await AsyncStorage.setItem(
    CULTURE_CARDS_STORAGE_KEY,
    JSON.stringify(buildCultureCardsStorageEnvelope(nextCards)),
  );
}

export async function clearCultureCardsForTests() {
  await AsyncStorage.removeItem(CULTURE_CARDS_STORAGE_KEY);
  await AsyncStorage.setItem(CULTURE_CARDS_RESET_KEY, 'true');
}
