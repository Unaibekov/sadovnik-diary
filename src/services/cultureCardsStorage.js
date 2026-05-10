import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CULTURE_CARDS_RESET_KEY,
  CULTURE_CARDS_STORAGE_KEY,
} from '../domain/constants';
import { normalizeCultureCard } from '../domain/batch';

export async function loadCultureCardsFromStorage() {
  const wasReset = await AsyncStorage.getItem(CULTURE_CARDS_RESET_KEY);

  if (!wasReset) {
    await AsyncStorage.removeItem(CULTURE_CARDS_STORAGE_KEY);
    await AsyncStorage.setItem(CULTURE_CARDS_RESET_KEY, 'true');
    return [];
  }

  const savedCards = await AsyncStorage.getItem(CULTURE_CARDS_STORAGE_KEY);

  return savedCards ? JSON.parse(savedCards).map(normalizeCultureCard) : [];
}

export async function saveCultureCardsToStorage(nextCards) {
  await AsyncStorage.setItem(
    CULTURE_CARDS_STORAGE_KEY,
    JSON.stringify(nextCards),
  );
}

export async function clearCultureCardsForTests() {
  await AsyncStorage.removeItem(CULTURE_CARDS_STORAGE_KEY);
  await AsyncStorage.setItem(CULTURE_CARDS_RESET_KEY, 'true');
}
