// Общие константы домена и справочники статусов.
export const stages = [
  'Введение в культуру',
  'Клонирование',
  'Адаптация',
  'Теплица',
  'Закалка',
  'Высадка',
];

export const stageMoveTargetLabels = {
  Клонирование: 'клонирование',
  Адаптация: 'адаптацию',
  Теплица: 'теплицу',
  Закалка: 'закалку',
  Высадка: 'высадку',
};

export const CULTURE_CARDS_STORAGE_KEY = 'sadovnikDiary:cultureCards';
export const CULTURE_CARDS_RESET_KEY = 'sadovnikDiary:cultureCardsReset:2026-05-25-clear-stage-cards';
export const EMPTY_CATALOG_VALUE = 'Отсутствует';
export const INTRO_STAGE = 'Введение в культуру';

export const BATCH_STATUS_LABELS = {
  active: 'Активная',
  draft: 'Черновик',
  quarantine: 'Карантин',
  partial: 'Частично реализована',
  problem: 'Проблема',
  sold: 'Реализована',
  archived: 'Архивная',
};

export const STERILITY_STATUS_LABELS = {
  unchecked: 'Не проверено',
  sterile: 'Стерильно',
  contaminated: 'Контаминация',
};

export const QR_STATUS_LABELS = {
  none: 'Не создан',
  pending_print: 'Ожидает печати',
  printed: 'Напечатан',
};

export const SOURCE_MATERIAL_OPTIONS = [
  'Маточное растение',
  'Собственное размножение',
  'Внешний поставщик',
  'Закупка',
  'Лаборатория',
  'Другая партия',
  'Экспериментальный материал',
  'Дикорастущий материал',
  'Другое',
];

export const currentUser = {
  id: 'local-user',
  role: 'operator',
};

export const AUTH_TEST_LOGIN = 'login';
export const AUTH_TEST_PASSWORD = 'pass';
