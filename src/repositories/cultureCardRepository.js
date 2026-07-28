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
  let writeQueue = Promise.resolve();

  function enqueueWrite(task) {
    const nextTask = writeQueue.then(task, task);
    writeQueue = nextTask.catch(() => {});
    return nextTask;
  }

  return {
    async getAll() {
      return loadStoredCards();
    },

    async getById(cardId) {
      const cards = await loadStoredCards();

      return cards.find((card) => card.id === cardId) || null;
    },

    async saveAll(cards) {
      return enqueueWrite(async () => {
        await saveStoredCards(cards);
        return cards;
      });
    },

    async replaceAll(cards) {
      return enqueueWrite(async () => {
        await saveStoredCards(cards);
        return cards;
      });
    },

    async create(card) {
      return enqueueWrite(async () => {
        const cards = await loadStoredCards();
        const nextCards = [card, ...cards];

        await saveStoredCards(nextCards);
        return {
          card,
          cards: nextCards,
        };
      });
    },

    async update(cardId, updater) {
      return enqueueWrite(async () => {
        const cards = await loadStoredCards();
        if (!cards.some((card) => card.id === cardId)) {
          return {
            card: null,
            cards,
          };
        }

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
      });
    },

    async exportSnapshot() {
      return loadStoredCards();
    },

    async importSnapshot(cards) {
      return enqueueWrite(async () => {
        await saveStoredCards(cards);
        return cards;
      });
    },

    async restoreBackup() {
      return enqueueWrite(() => restoreStoredCardsBackup());
    },

    async clearForTests() {
      return enqueueWrite(() => clearStoredCardsForTests());
    },
  };
}

export const cultureCardRepository = createCultureCardRepository({
  clearStoredCardsForTests: clearCultureCardsForTests,
  loadStoredCards: loadCultureCardsFromStorage,
  restoreStoredCardsBackup: restoreCultureCardsBackupFromStorage,
  saveStoredCards: saveCultureCardsToStorage,
});
