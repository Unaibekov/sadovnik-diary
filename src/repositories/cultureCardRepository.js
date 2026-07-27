import {
  clearCultureCardsForTests,
  loadCultureCardsFromStorage,
  restoreCultureCardsBackupFromStorage,
  saveCultureCardsToStorage,
} from '../services/cultureCardsStorage';

export function createCultureCardRepository({
  clearStoredCardsForTests,
  loadStoredCards,
  restoreStoredCardsBackup,
  saveStoredCards,
}) {
  return {
    async getAll() {
      return loadStoredCards();
    },

    async getById(cardId) {
      const cards = await loadStoredCards();

      return cards.find((card) => card.id === cardId) || null;
    },

    async saveAll(cards) {
      await saveStoredCards(cards);
      return cards;
    },

    async replaceAll(cards) {
      await saveStoredCards(cards);
      return cards;
    },

    async create(card) {
      const cards = await loadStoredCards();
      const nextCards = [card, ...cards];

      await saveStoredCards(nextCards);
      return {
        card,
        cards: nextCards,
      };
    },

    async update(cardId, updater) {
      const cards = await loadStoredCards();
      let updatedCard = null;
      const nextCards = cards.map((card) => {
        if (card.id !== cardId) {
          return card;
        }

        updatedCard = typeof updater === 'function'
          ? updater(card)
          : { ...card, ...updater };
        return updatedCard;
      });

      await saveStoredCards(nextCards);
      return {
        card: updatedCard,
        cards: nextCards,
      };
    },

    async exportSnapshot() {
      return loadStoredCards();
    },

    async importSnapshot(cards) {
      await saveStoredCards(cards);
      return cards;
    },

    async restoreBackup() {
      return restoreStoredCardsBackup();
    },

    async clearForTests() {
      await clearStoredCardsForTests();
    },
  };
}

export const cultureCardRepository = createCultureCardRepository({
  clearStoredCardsForTests: clearCultureCardsForTests,
  loadStoredCards: loadCultureCardsFromStorage,
  restoreStoredCardsBackup: restoreCultureCardsBackupFromStorage,
  saveStoredCards: saveCultureCardsToStorage,
});
