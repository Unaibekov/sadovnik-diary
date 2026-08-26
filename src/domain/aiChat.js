function fallbackUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const randomValue = Math.floor(Math.random() * 16);
    const nextValue = character === 'x'
      ? randomValue
      : (randomValue & 0x3) | 0x8;

    return nextValue.toString(16);
  });
}

export function createDialogueUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return fallbackUuid();
}

export function createChatMessage(role, text) {
  return {
    id: `${role}-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    createdAt: new Date().toISOString(),
    role,
    text: `${text || ''}`.trim(),
  };
}
