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

export const temperatureRequirementOptions = [
  '20-22 °C',
  '22-24 °C',
  '24-26 °C',
  '25 ± 1 °C',
  '26-28 °C',
];

export const lightRequirementOptions = [
  'Низкая: 20-50 µmol/m²/s, 16 ч/сутки',
  'Средняя: 50-100 µmol/m²/s, 16 ч/сутки',
  'Высокая: 100-150 µmol/m²/s, 16 ч/сутки',
  '16 ч свет / 8 ч темнота',
];

export const humidityRequirementOptions = [
  '70-80%',
  '80-90%',
  '80-95%',
  '85-95%',
  '90-100%',
];

export const CUSTOM_REQUIREMENT_OPTION = 'Свое значение';

export const CULTURE_CARDS_STORAGE_KEY = 'sadovnikDiary:cultureCards';
export const CULTURE_CARDS_RESET_KEY = 'sadovnikDiary:cultureCardsReset:2026-05-25-clear-stage-cards';
export const EMPTY_CATALOG_VALUE = 'Отсутствует';
export const INTRO_STAGE = 'Введение в культуру';

export const BATCH_STATUS_LABELS = {
  active: 'Активная',
  draft: 'Черновик',
  quarantine: 'Карантин',
  partial: 'Частично реализована',
  problem: 'Проблемная',
  sold: 'Реализована',
  archived: 'Архивная',
};

export const STERILITY_STATUS_LABELS = {
  unchecked: 'Не проверено',
  sterile: 'Стерильно',
  contaminated: 'Контаминация',
};

export const QR_STATUS_LABELS = {
  none: 'не создан',
  pending_print: 'ожидает печати',
  printed: 'напечатан',
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
