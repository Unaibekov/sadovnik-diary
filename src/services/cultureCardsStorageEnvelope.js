import { CULTURE_CARDS_STORAGE_SCHEMA_VERSION } from '../domain/constants';

export class CultureCardsStorageError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CultureCardsStorageError';
    this.code = code;
  }
}

function parseStorageJson(rawValue) {
  try {
    return JSON.parse(rawValue);
  } catch {
    throw new CultureCardsStorageError(
      'invalid_json',
      'Culture cards storage contains invalid JSON',
    );
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function buildCultureCardsStorageEnvelope(cards, savedAt = new Date().toISOString()) {
  return {
    schemaVersion: CULTURE_CARDS_STORAGE_SCHEMA_VERSION,
    savedAt,
    cards: Array.isArray(cards) ? cards : [],
  };
}

export function parseCultureCardsStorageValue(rawValue) {
  if (!rawValue) {
    return {
      cards: [],
      format: 'empty',
      migratedFromSchemaVersion: null,
    };
  }

  const parsedValue = parseStorageJson(rawValue);

  if (Array.isArray(parsedValue)) {
    return {
      cards: parsedValue,
      format: 'legacy-array',
      migratedFromSchemaVersion: 0,
    };
  }

  if (!isPlainObject(parsedValue) || !Array.isArray(parsedValue.cards)) {
    throw new CultureCardsStorageError(
      'invalid_shape',
      'Culture cards storage has an unsupported shape',
    );
  }

  const schemaVersion = Number(parsedValue.schemaVersion) || 0;

  if (schemaVersion > CULTURE_CARDS_STORAGE_SCHEMA_VERSION) {
    throw new CultureCardsStorageError(
      'unsupported_schema_version',
      'Culture cards storage schema version is newer than this app supports',
    );
  }

  return {
    cards: parsedValue.cards,
    format: schemaVersion === CULTURE_CARDS_STORAGE_SCHEMA_VERSION
      ? 'envelope'
      : 'legacy-envelope',
    migratedFromSchemaVersion: schemaVersion === CULTURE_CARDS_STORAGE_SCHEMA_VERSION
      ? null
      : schemaVersion,
  };
}
