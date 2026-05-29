import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import plantsCatalog from './data/plantsCatalog';
import styles from './styles';
import {
  BATCH_STATUS_LABELS,
  EMPTY_CATALOG_VALUE,
  INTRO_STAGE,
  SOURCE_MATERIAL_OPTIONS,
  currentUser,
  stageMoveTargetLabels,
  stages,
} from './src/domain/constants';
import {
  dateFromIso,
  formatDisplayDate,
  formatDisplayDateTime,
  getMonthDays,
  getMonthTitle,
  getTodayIsoDate,
  isoFromDate,
  parseDisplayDate,
} from './src/domain/dates';
import {
  createEmptyCultureForm,
  createEmptyIntroActionForm,
  createEmptyStatusForm,
} from './src/domain/forms';
import {
  canEditIdentityFields,
  createBatchCreatedOperation,
  generatePlantingCode,
  getAdaptationStats,
  getAdaptationCareSchedules,
  getCardCurrentQuantity,
  getCardDisplayName,
  getCloneStats,
  getDaysInCurrentStage,
  getGreenhouseCareSchedules,
  getGreenhouseStats,
  getNextStage,
  getOperationSummaryItems,
  getQrStatus,
  getStageMoveButtonLabel,
  isPositiveInteger,
} from './src/domain/batch';
import {
  clearCultureCardsForTests,
  loadCultureCardsFromStorage,
  saveCultureCardsToStorage,
} from './src/services/cultureCardsStorage';
import {
  getReminderDateFromIsoDate,
  initializeLocalNotifications,
  scheduleWateringReminder,
} from './src/services/localNotifications';
import AuthScreen from './src/screens/AuthScreen';
import CultureCalendarScreen from './src/screens/CultureCalendarScreen';
import CultureListScreen from './src/screens/CultureListScreen';
import GlobalJournalScreen from './src/screens/GlobalJournalScreen';
import IntroActionFormScreen from './src/screens/IntroActionFormScreen';
import MenuScreen from './src/screens/MenuScreen';
import RecommendationsScreen from './src/screens/RecommendationsScreen';
import StatusChangeFormScreen from './src/screens/StatusChangeFormScreen';
import TasksScreen from './src/screens/TasksScreen';
import BottomTabBar from './src/components/BottomTabBar';
import StageHeader from './src/components/StageHeader';
import CultureCalendarTab from './src/components/CultureCalendarTab';
import CultureJournalTab from './src/components/CultureJournalTab';
import CulturePassportTab from './src/components/CulturePassportTab';
import { ChevronDownIcon, StageItemIcon } from './src/components/icons';

const NativeDateTimePicker = Platform.OS === 'web'
  ? null
  : require('@react-native-community/datetimepicker/src/datetimepicker').default;

const statusEventCountFields = {
  rooting: 'rootedCount',
  death: 'deathCount',
  discard: 'discardCount',
  sale: 'saleCount',
  propagation: 'propagationCount',
  transplant: 'transplantCount',
};

const introOperationFields = {
  comment: 'comment',
  photo: 'photoNote',
  contamination: 'contaminationNote',
  quarantine: 'quarantineReason',
};

const editableStatusOperationTypes = [
  'rooting',
  'death',
  'discard',
  'sale',
  'propagation',
  'quarantine',
  'quarantineReleased',
  'adaptationStress',
  'adaptationEnvironment',
  'adaptationHumidityReduction',
  'adaptationCare',
  'greenhouseObservation',
  'greenhouseCare',
  'greenhouseEnvironment',
  'greenhouseDisease',
  'transplant',
];

const protectedOperationTypes = [
  'contamination',
  'quarantine',
  'quarantineReleased',
];

const cultureCreateBatchStatuses = [
  ['active', BATCH_STATUS_LABELS.active],
  ['draft', BATCH_STATUS_LABELS.draft],
];

function getOperationTimestamp(operation) {
  return operation?.createdAt || operation?.date || '';
}

function getChangeTimestamp(change) {
  return change?.changedAt || change?.date || '';
}

function getScheduleNextDate(schedule, card) {
  if (schedule.nextDate) {
    return schedule.nextDate;
  }

  const stageStartDate = card.stageChangedAt || card.createdAt;

  if (!stageStartDate) {
    return '';
  }

  return isoFromDate(new Date(
    dateFromIso(stageStartDate).getTime() + schedule.intervalDays * 24 * 60 * 60 * 1000,
  ));
}

function buildCareTasks(cards) {
  const todayIso = getTodayIsoDate();
  const todayDate = dateFromIso(todayIso);

  return cards.flatMap((card) => {
    if (
      card.status === 'cancelled' ||
      card.status === 'archived' ||
      getResolvedBatchStatus(card) === 'sold'
    ) {
      return [];
    }

    const stage = card.stage || INTRO_STAGE;
    const schedules = stage === 'Адаптация'
      ? getAdaptationCareSchedules(card)
      : stage === 'Теплица'
        ? getGreenhouseCareSchedules(card)
        : [];

    return schedules.map((schedule) => {
      const nextDate = getScheduleNextDate(schedule, card);

      if (!nextDate) {
        return null;
      }

      const nextDateValue = dateFromIso(nextDate);
      const daysOverdue = Math.max(Math.floor(
        (todayDate - nextDateValue) / (24 * 60 * 60 * 1000),
      ), 0);
      const isOverdue = daysOverdue > 0;
      const isDueToday = nextDate === todayIso;

      return {
        id: `${card.id}-${stage}-${schedule.careType}`,
        cardId: card.id,
        cardName: getCardDisplayName(card),
        code: card.code || '',
        careType: schedule.careType,
        currentQuantity: getCardCurrentQuantity(card),
        daysOverdue,
        isOverdue,
        isDueToday,
        nextDate,
        stage,
        status: isOverdue ? 'Просрочено' : isDueToday ? 'Сегодня' : 'Запланировано',
        title: schedule.careType,
      };
    }).filter(Boolean);
  }).sort((first, second) => (
    Number(second.isOverdue) - Number(first.isOverdue) ||
    Number(second.isDueToday) - Number(first.isDueToday) ||
    second.daysOverdue - first.daysOverdue ||
    new Date(first.nextDate) - new Date(second.nextDate) ||
    first.cardName.localeCompare(second.cardName, 'ru')
  ));
}

function getTimelineStageForOperation(operation, card) {
  const operationTimestamp = getOperationTimestamp(operation);
  const history = [...(card?.stageHistory || [])]
    .filter((change) => change.fromStage && change.toStage)
    .sort((first, second) => getChangeTimestamp(first).localeCompare(getChangeTimestamp(second)));

  if (history.length > 0) {
    let stage = history[0].fromStage;

    history.forEach((change) => {
      if (!operationTimestamp || getChangeTimestamp(change).localeCompare(operationTimestamp) <= 0) {
        stage = change.toStage;
      }
    });

    return stage;
  }

  if (card?.stageChangedAt && operation?.date) {
    if (operation.date < card.stageChangedAt) {
      const currentStageIndex = stages.indexOf(card.stage);
      return stages[currentStageIndex - 1] || INTRO_STAGE;
    }
  }

  return card?.stage || INTRO_STAGE;
}

function getOperationEffectiveStage(operation, card) {
  if (!operation || !card) {
    return INTRO_STAGE;
  }

  if (operation.stage) {
    return operation.stage;
  }

  if (operation.type === 'stageChange') {
    return operation.toStage || card.stage || INTRO_STAGE;
  }

  if (['batchCreated', 'qrGenerated', 'comment', 'photo', 'contamination'].includes(operation.type)) {
    return INTRO_STAGE;
  }

  if (['rooting', 'propagation'].includes(operation.type)) {
    return 'Клонирование';
  }

  if ([
    'adaptationStress',
    'adaptationEnvironment',
    'adaptationHumidityReduction',
    'adaptationCare',
  ].includes(operation.type)) {
    return 'Адаптация';
  }

  if ([
    'greenhouseObservation',
    'greenhouseCare',
    'greenhouseEnvironment',
    'greenhouseDisease',
    'transplant',
  ].includes(operation.type)) {
    return 'Теплица';
  }

  if (operation.type === 'statusChange') {
    if (operation.rootedCount || operation.propagationCount) {
      return 'Клонирование';
    }
  }

  return getTimelineStageForOperation(operation, card);
}

function isOperationVisibleInCurrentStage(operation, card) {
  if (!operation || !card) {
    return false;
  }

  if (['batchCreated', 'qrGenerated'].includes(operation.type)) {
    return (card.stage || INTRO_STAGE) === INTRO_STAGE;
  }

  if (operation.type === 'stageChange') {
    return operation.toStage === card.stage;
  }

  if ((card.stage || INTRO_STAGE) === INTRO_STAGE) {
    return getOperationEffectiveStage(operation, card) === INTRO_STAGE;
  }

  return getOperationEffectiveStage(operation, card) === card.stage;
}

function getLatestFilledCalendarDate(card) {
  const operationDates = (card?.operations || [])
    .filter((operation) => isOperationVisibleInCurrentStage(operation, card))
    .map((operation) => operation.date)
    .filter(Boolean)
    .sort();

  return operationDates.at(-1) || card?.createdAt || getTodayIsoDate();
}

const stageHomeItems = [
  {
    iconName: 'intro',
    iconBoxStyle: 'stageIconBoxGreen',
    label: 'Введение\nв культуру',
    title: stages[0],
  },
  {
    iconName: 'clone',
    iconBoxStyle: 'stageIconBoxMint',
    label: 'Клонирование',
    title: stages[1],
  },
  {
    iconName: 'adaptation',
    iconBoxStyle: 'stageIconBoxAqua',
    label: 'Адаптация',
    title: stages[2],
  },
  {
    iconName: 'greenhouse',
    iconBoxStyle: 'stageIconBoxLime',
    label: 'Теплица',
    title: stages[3],
  },
  {
    iconName: 'hardening',
    iconBoxStyle: 'stageIconBoxSky',
    label: 'Закалка',
    title: stages[4],
  },
  {
    iconName: 'planting',
    iconBoxStyle: 'stageIconBoxOrange',
    label: 'Высадка',
    title: stages[5],
  },
];

function getGlobalJournalEvents(cards) {
  return cards
    .flatMap((card) => (card.operations || [])
      .filter((operation) => operation.type !== 'stageSettingsUpdated')
      .map((operation) => ({
        ...operation,
        cardId: card.id,
        cardName: getCardDisplayName(card),
        cardCode: card.code,
        cardQuantity: card.quantity,
        cardStage: card.stage || INTRO_STAGE,
        cultureName: card.cultureName,
        speciesName: card.speciesName,
        varietyName: card.varietyName,
      })))
    .sort((first, second) => (
      new Date(second.createdAt || second.date || 0) - new Date(first.createdAt || first.date || 0)
    ));
}

function removeRecommendationFields(card) {
  const {
    temperatureRequirement,
    lightRequirement,
    humidityRequirement,
    preventionItems,
    ...cardWithoutRecommendations
  } = card || {};

  return {
    ...cardWithoutRecommendations,
    operations: (cardWithoutRecommendations.operations || [])
      .filter((operation) => operation.type !== 'stageSettingsUpdated'),
  };
}

function findCatalogPlant(card) {
  return plantsCatalog.find((plant) => (
    (plant.cultureName || EMPTY_CATALOG_VALUE) === card.cultureName &&
    (plant.speciesName || EMPTY_CATALOG_VALUE) === card.speciesName &&
    (plant.varietyName || EMPTY_CATALOG_VALUE) === card.varietyName
  ));
}

function normalizeRecommendationText(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => [item.name, item.applicationRate, item.frequency].filter(Boolean).join(' · '))
      .filter(Boolean)
      .join('\n');
  }

  return value || '';
}

function getPlantRecommendationItems(plant, stage) {
  if (!plant) {
    return [];
  }

  const isCloneStageRecommendation = stage === stages[1];
  const temperature = isCloneStageRecommendation
    ? plant.cloneTemperatureRequirement
    : plant.adaptationTemperatureRequirement || plant.cloneTemperatureRequirement;
  const light = isCloneStageRecommendation
    ? plant.cloneLightRequirement
    : plant.adaptationLightRequirement || plant.cloneLightRequirement;
  const humidity = isCloneStageRecommendation
    ? plant.cloneHumidityRange && `${plant.cloneHumidityRange}%`
    : plant.adaptationHumidityRequirement || (plant.cloneHumidityRange && `${plant.cloneHumidityRange}%`);
  const preventionItems = isCloneStageRecommendation
    ? ''
    : normalizeRecommendationText(plant.adaptationPreventionItems);

  return [
    { label: 'Температура', value: temperature },
    { label: 'Освещение', value: light },
    { label: 'Влажность', value: humidity },
    { label: 'Подкормки', value: plant.preventionFertilizers },
    { label: 'Препараты', value: plant.preventionChemicals },
    { label: 'Стимуляторы', value: plant.preventionStimulators },
    { label: 'Схема', value: plant.preventionApplicationRate },
    { label: 'Период', value: plant.preventionFrequency },
    { label: 'Профилактика', value: preventionItems },
  ].filter((item) => Boolean(item.value));
}

function getStagePlantRecommendationItems(plant, stage) {
  if (!plant || stage === stages[0]) {
    return [];
  }

  if (stage === stages[1]) {
    return [
      { label: 'Температура', value: plant.cloneTemperatureRequirement },
      { label: 'Освещение', value: plant.cloneLightRequirement },
      { label: 'Влажность', value: plant.cloneHumidityRange && `${plant.cloneHumidityRange}%` },
      { label: 'Подкормки', value: plant.preventionFertilizers },
      { label: 'Стимуляторы', value: plant.preventionStimulators },
      { label: 'Период', value: plant.preventionFrequency },
    ].filter((item) => Boolean(item.value));
  }

  if (stage === stages[2]) {
    return [
      { label: 'Температура', value: plant.adaptationTemperatureRequirement || plant.cloneTemperatureRequirement },
      { label: 'Освещение', value: plant.adaptationLightRequirement || plant.cloneLightRequirement },
      { label: 'Влажность', value: plant.adaptationHumidityRequirement || (plant.cloneHumidityRange && `${plant.cloneHumidityRange}%`) },
      { label: 'Профилактика', value: normalizeRecommendationText(plant.adaptationPreventionItems) },
    ].filter((item) => Boolean(item.value));
  }

  return [
    { label: 'Подкормки', value: plant.preventionFertilizers },
    { label: 'Препараты', value: plant.preventionChemicals },
    { label: 'Стимуляторы', value: plant.preventionStimulators },
    { label: 'Схема', value: plant.preventionApplicationRate },
    { label: 'Период', value: plant.preventionFrequency },
  ].filter((item) => Boolean(item.value));
}

function isImportantJournalEvent(event) {
  return [
    'contamination',
    'quarantine',
    'death',
    'discard',
    'stageChange',
  ].includes(event.type) || (
    event.type === 'adaptationStress' &&
    ['Высокий', 'Критический'].includes(event.stressLevel)
  );
}

function doesJournalEventMatchFilter(event, filter) {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'important') {
    return isImportantJournalEvent(event);
  }

  if (filter === 'losses') {
    return ['death', 'discard'].includes(event.type);
  }

  if (filter === 'sales') {
    return event.type === 'sale';
  }

  return event.type === filter;
}

function getJournalFilterLabel(filter) {
  return {
    important: 'Важные',
    all: 'Все',
    contamination: 'Контаминация',
    quarantine: 'Карантин',
    losses: 'Потери',
    sales: 'Продажи',
    stageChange: 'Переходы',
  }[filter] || filter;
}

function getUniqueOptions(items, field) {
  return [...new Set(items.map((item) => item[field] || EMPTY_CATALOG_VALUE))]
    .sort((first, second) => first.localeCompare(second, 'ru'));
}

function getPlantCardStatusDotStyle(batchStatus, sterilityStatus) {
  if (batchStatus === 'draft') {
    return styles.plantCardStatusDotDraft;
  }

  if (sterilityStatus === 'contaminated' || ['quarantine', 'problem'].includes(batchStatus)) {
    return styles.plantCardStatusDotProblem;
  }

  if (batchStatus === 'partial') {
    return styles.plantCardStatusDotPartial;
  }

  return styles.plantCardStatusDotActive;
}

function hasSaleOperation(card) {
  return (card?.operations || []).some((operation) => (
    (operation.type === 'sale' && Number(operation.count) > 0) ||
    (operation.type === 'statusChange' && Number(operation.saleCount) > 0)
  ));
}

function getResolvedBatchStatus(card) {
  const batchStatus = card?.batchStatus || 'active';
  const currentQuantity = getCardCurrentQuantity(card);
  const hasSale = hasSaleOperation(card);

  if (hasSale && currentQuantity === 0) {
    return 'sold';
  }

  if (['sold', 'partial'].includes(batchStatus)) {
    return hasSale ? 'partial' : 'active';
  }

  return batchStatus;
}

function normalizeReportCell(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).replace(/\r?\n/g, ' ').trim();
}

function setSheetColumnWidths(sheet, widths) {
  sheet['!cols'] = widths.map((wch) => ({ wch }));
}

function buildCultureCardsReportWorkbook(cards) {
  const partyRows = [
    [
      'Код',
      'Культура',
      'Вид',
      'Сорт',
      'Стадия',
      'Статус',
      'Количество',
      'Дата создания',
      'Событий в журнале',
    ],
    ...cards.map((card) => {
      const status = getResolvedBatchStatus(card);

      return [
        card.code,
        card.cultureName,
        card.speciesName,
        card.varietyName,
        card.stage || INTRO_STAGE,
        BATCH_STATUS_LABELS[status] || status,
        getCardCurrentQuantity(card),
        card.createdAt ? formatDisplayDate(card.createdAt) : '',
        (card.operations || []).length,
      ];
    }),
  ];

  const journalRows = [
    [
      'Код',
      'Культура',
      'Вид',
      'Сорт',
      'Стадия партии',
      'Статус партии',
      'Дата события',
      'Тип события',
      'Стадия события',
      'Текущее количество',
      'Остаток',
      'Детали',
      'Комментарий',
      'Фото / заметка',
      'Создано',
    ],
    ...cards
      .flatMap((card) => {
        const status = getResolvedBatchStatus(card);

        return (card.operations || [])
          .filter((operation) => operation.type !== 'stageSettingsUpdated')
          .map((operation) => {
            const summary = getOperationSummaryItems(operation, card)
              .map(([label, value]) => `${label}: ${value}`)
              .join('; ');

            return {
              sortDate: operation.createdAt || operation.date || '',
              row: [
                card.code,
                card.cultureName,
                card.speciesName,
                card.varietyName,
                card.stage || INTRO_STAGE,
                BATCH_STATUS_LABELS[status] || status,
                operation.date ? formatDisplayDate(operation.date) : '',
                operation.title || operation.type || '',
                operation.stage || operation.toStage || operation.fromStage || '',
                getCardCurrentQuantity(card),
                operation.currentQuantity ?? '',
                summary,
                operation.comment || operation.reason || operation.quarantineReason || '',
                operation.photoNote || operation.contaminationNote || '',
                operation.createdAt ? formatDisplayDateTime(operation.createdAt) : '',
              ].map(normalizeReportCell),
            };
          });
      })
      .sort((first, second) => new Date(second.sortDate || 0) - new Date(first.sortDate || 0))
      .map(({ row }) => row),
  ];

  const workbook = XLSX.utils.book_new();
  const partiesSheet = XLSX.utils.aoa_to_sheet(partyRows);
  const journalSheet = XLSX.utils.aoa_to_sheet(journalRows);

  setSheetColumnWidths(partiesSheet, [20, 18, 18, 18, 22, 14, 12, 16, 18]);
  setSheetColumnWidths(journalSheet, [20, 18, 18, 18, 22, 14, 16, 24, 22, 14, 12, 60, 36, 36, 18]);
  XLSX.utils.book_append_sheet(workbook, partiesSheet, 'Партии');
  XLSX.utils.book_append_sheet(workbook, journalSheet, 'Журнал');

  return workbook;
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();
  const bottomInset = Math.max(safeAreaInsets.bottom || 0, 0);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [focusedField, setFocusedField] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedStage, setSelectedStage] = useState('');
  const [cardSearch, setCardSearch] = useState('');
  const [cultureCards, setCultureCards] = useState([]);
  const [isCardsLoading, setIsCardsLoading] = useState(true);
  const [storageError, setStorageError] = useState('');
  const [currentScreen, setCurrentScreen] = useState('stages');
  const [cultureForm, setCultureForm] = useState(createEmptyCultureForm);
  const [statusForm, setStatusForm] = useState(createEmptyStatusForm);
  const [introActionForm, setIntroActionForm] = useState(createEmptyIntroActionForm);
  const [introActionType, setIntroActionType] = useState('');
  const [stageActionError, setStageActionError] = useState('');
  const [batchStatusFilter, setBatchStatusFilter] = useState('all');
  const [journalFilter, setJournalFilter] = useState('important');
  const [expandedJournalCardIds, setExpandedJournalCardIds] = useState([]);
  const [formError, setFormError] = useState('');
  const [statusFormError, setStatusFormError] = useState('');
  const [statusFormNotice, setStatusFormNotice] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [openDropdown, setOpenDropdown] = useState('');
  const [touchedSubmit, setTouchedSubmit] = useState(false);
  const [editingCardId, setEditingCardId] = useState(null);
  const [editingOperationId, setEditingOperationId] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('');
  const [cultureCalendarTab, setCultureCalendarTab] = useState('calendar');
  const [isDateEntryExpanded, setIsDateEntryExpanded] = useState(false);
  const [isStageMoveConfirmVisible, setIsStageMoveConfirmVisible] = useState(false);
  const [operationDeleteCandidateId, setOperationDeleteCandidateId] = useState(null);
  const [recommendationsContext, setRecommendationsContext] = useState(null);
  const [recommendationsMode, setRecommendationsMode] = useState('current');

  const editingCard = cultureCards.find((card) => card.id === editingCardId);
  const selectedCard = cultureCards.find((card) => card.id === selectedCardId);
  const isEditingCard = Boolean(editingCardId);
  const canEditCurrentIdentity = canEditIdentityFields(currentUser, editingCard);
  const calendarDays = getMonthDays(calendarMonth);
  const selectedCardOperations = (selectedCard?.operations || [])
    .filter((operation) => operation.type !== 'stageSettingsUpdated');
  const selectedCardCalendarOperations = selectedCardOperations.filter((operation) => (
    isOperationVisibleInCurrentStage(operation, selectedCard)
  ));
  const operationDates = new Set(selectedCardCalendarOperations.map((operation) => operation.date));
  const selectedCardCurrentQuantity = getCardCurrentQuantity(selectedCard);
  const selectedCardCloneStats = getCloneStats(selectedCard);
  const selectedCardAdaptationStats = getAdaptationStats(selectedCard);
  const selectedCardDaysInStage = getDaysInCurrentStage(selectedCard);
  const selectedDateOperations = selectedCardCalendarOperations.filter((operation) => (
    operation.date === selectedCalendarDate
  ));
  const isCultureIntroStage = selectedStage === 'Введение в культуру';
  const isCloneStage = selectedStage === 'Клонирование';
  const isAdaptationStage = selectedStage === 'Адаптация';
  const isGreenhouseStage = selectedStage === 'Теплица';
  const selectedCardNextStage = getNextStage(selectedCard?.stage || selectedStage);
  const stageMoveButtonLabel = selectedCardNextStage
    ? `В ${stageMoveTargetLabels[selectedCardNextStage] || selectedCardNextStage.toLocaleLowerCase('ru-RU')}`
    : getStageMoveButtonLabel(selectedCardNextStage);
  const stageMoveBlockedMessage = selectedCard?.stage === INTRO_STAGE && selectedCard.sterilityStatus === 'contaminated'
    ? 'Партия с контаминацией. Перевод в клонирование заблокирован.'
    : selectedCard?.stage === INTRO_STAGE && (selectedCard.batchStatus || 'active') === 'quarantine'
      ? 'Партия на карантине. Перевод в клонирование заблокирован.'
      : '';
  const showIdentityAsText = isEditingCard;
  const canSaveCultureForm = true;
  const isSupportedPlantingStage = stages.includes(selectedStage);
  const isSelectedCloneCard = selectedCard?.stage === 'Клонирование';
  const canReleaseQuarantine = ['agronomist', 'admin', 'superadmin'].includes(currentUser.role);
  const globalJournalEvents = getGlobalJournalEvents(cultureCards);
  const careTasks = buildCareTasks(cultureCards);
  const taskCount = careTasks.length;
  const activeCardsCount = cultureCards.filter((card) => (
    card.status !== 'cancelled' &&
    card.status !== 'archived' &&
    getResolvedBatchStatus(card) !== 'sold'
  )).length;
  const groupedGlobalJournalCards = cultureCards
    .map((card) => {
      const cardEvents = globalJournalEvents.filter((event) => (
        event.cardId === card.id && doesJournalEventMatchFilter(event, journalFilter)
      ));

      return {
        card,
        events: cardEvents,
        latestEventAt: cardEvents[0]?.createdAt || cardEvents[0]?.date || '',
      };
    })
    .filter((group) => group.events.length > 0)
    .sort((first, second) => (
      new Date(second.latestEventAt || 0) - new Date(first.latestEventAt || 0)
    ));

  const cultureOptions = getUniqueOptions(plantsCatalog, 'cultureName');
  const speciesOptions = getUniqueOptions(
    plantsCatalog.filter((plant) => (
      (plant.cultureName || EMPTY_CATALOG_VALUE) === cultureForm.cultureName
    )),
    'speciesName',
  );
  const varietyOptions = getUniqueOptions(
    plantsCatalog.filter((plant) => (
      (plant.cultureName || EMPTY_CATALOG_VALUE) === cultureForm.cultureName &&
      (plant.speciesName || EMPTY_CATALOG_VALUE) === cultureForm.speciesName
    )),
    'varietyName',
  );

  const filteredCultureCards = cultureCards.filter((card) => {
    const query = cardSearch.trim().toLowerCase();
    const cardStage = card.stage || INTRO_STAGE;
    const batchStatus = getResolvedBatchStatus(card);

    if (card.status === 'cancelled' || (card.status === 'archived' && batchStatus === 'sold')) {
      return false;
    }

    if (cardStage !== selectedStage) {
      return false;
    }

    if (
      (isCultureIntroStage || isCloneStage || isAdaptationStage || isGreenhouseStage) &&
      batchStatusFilter !== 'all' &&
      batchStatus !== batchStatusFilter
    ) {
      return false;
    }

    if (!query) {
      return true;
    }

    return getCardDisplayName(card).toLowerCase().includes(query);
  });

  const allVisibleStageCardsCount = cultureCards.filter((card) => {
    const query = cardSearch.trim().toLowerCase();
    const cardStage = card.stage || INTRO_STAGE;
    const batchStatus = getResolvedBatchStatus(card);

    if (card.status === 'cancelled' || (card.status === 'archived' && batchStatus === 'sold')) {
      return false;
    }

    if (cardStage !== selectedStage) {
      return false;
    }

    return !query || getCardDisplayName(card).toLowerCase().includes(query);
  }).length;
  const recommendationStage = recommendationsContext?.stage || selectedCard?.stage || selectedStage;
  const recommendationCard = recommendationsContext?.cardId
    ? cultureCards.find((card) => card.id === recommendationsContext.cardId)
    : null;
  const recommendationSourceCards = recommendationCard
    ? [recommendationCard]
    : cultureCards.filter((card) => (
      (card.stage || INTRO_STAGE) === recommendationStage &&
      card.status !== 'cancelled' &&
      card.status !== 'archived'
    ));
  const recommendationEntries = recommendationCard && recommendationsMode === 'all'
    ? stages.map((stage) => {
      const plant = findCatalogPlant(recommendationCard);

      return {
        key: `${recommendationCard.id}-${stage}`,
        plantKey: recommendationCard.id,
        subtitle: getCardDisplayName(recommendationCard),
        title: stage,
        items: getStagePlantRecommendationItems(plant, stage),
      };
    })
    : recommendationSourceCards.reduce((entries, card) => {
      const plantKey = [
        card.cultureName,
        card.speciesName,
        card.varietyName,
      ].join('|');

      if (!recommendationCard && entries.some((entry) => entry.plantKey === plantKey)) {
        return entries;
      }

      const plant = findCatalogPlant(card);

      return [
        ...entries,
        {
          key: recommendationCard ? `${card.id}-${recommendationStage}` : plantKey,
          plantKey,
          subtitle: [
            plant?.originalName,
            recommendationCard ? recommendationStage : '',
          ].filter(Boolean).join(' · '),
          title: getCardDisplayName(card),
          items: getStagePlantRecommendationItems(plant, recommendationStage),
        },
      ];
    }, []);

  useEffect(() => {
    loadCultureCards();
    initializeLocalNotifications().catch(() => {});
  }, []);

  async function loadCultureCards() {
    try {
      const savedCards = (await loadCultureCardsFromStorage()).map(removeRecommendationFields);
      setCultureCards(savedCards);
      setStorageError('');
    } catch (loadError) {
      setStorageError('Не удалось загрузить локальные данные');
    } finally {
      setIsCardsLoading(false);
    }
  }

  async function saveCultureCards(nextCards) {
    try {
      const cardsWithoutRecommendations = nextCards.map(removeRecommendationFields);
      await saveCultureCardsToStorage(cardsWithoutRecommendations);
      setCultureCards(cardsWithoutRecommendations);
      setStorageError('');
    } catch (saveError) {
      setStorageError('Не удалось сохранить локальные данные');
    }
  }

  function handleLogin() {
    setNotice('');
    setError('');
    setIsAuthenticated(true);
  }

  function handleForgotPassword() {
    setError('');
    setNotice('Восстановление пароля будет добавлено на следующем шаге.');
  }

  function handleRegister() {
    setError('');
    setNotice('Регистрация будет добавлена отдельно. Роль назначает суперадминистратор.');
  }

  function toggleJournalCard(cardId) {
    setExpandedJournalCardIds((currentIds) => (
      currentIds.includes(cardId)
        ? currentIds.filter((currentId) => currentId !== cardId)
        : [...currentIds, cardId]
    ));
  }

  function handleStagePress(stage) {
    setSelectedStage(stage);
    setCurrentScreen('cultureList');
  }

  function openGlobalJournal() {
    setSelectedStage('');
    setSelectedCardId(null);
    setSelectedCalendarDate('');
    setJournalFilter('important');
    setCurrentScreen('globalJournal');
  }

  function openTasks() {
    setSelectedStage('');
    setSelectedCardId(null);
    setSelectedCalendarDate('');
    setCurrentScreen('tasks');
  }

  function openMenu() {
    setSelectedStage('');
    setSelectedCardId(null);
    setSelectedCalendarDate('');
    setCurrentScreen('menu');
  }

  function openTaskCard(task) {
    const taskCard = cultureCards.find((card) => card.id === task.cardId);

    if (!taskCard) {
      setNotice('Партия для задачи не найдена.');
      return;
    }

    setSelectedStage(taskCard.stage || INTRO_STAGE);
    openCultureCalendar(taskCard);
  }

  async function handleShareData() {
    const exportedAt = new Date().toISOString();
    const fileName = `sadovnik-diary-${exportedAt.slice(0, 10)}.xlsx`;
    const workbook = buildCultureCardsReportWorkbook(cultureCards);
    const reportBase64 = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'base64',
    });

    try {
      if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
        await Share.share({
          title: fileName,
          message: 'Excel-отчет Sadovnik Diary подготовлен в мобильном приложении.',
        });
        setNotice('Excel-отчет подготовлен.');
        return;
      }

      const isSharingAvailable = await Sharing.isAvailableAsync();

      if (!isSharingAvailable) {
        await Share.share({
          title: fileName,
          message: 'Excel-отчет Sadovnik Diary подготовлен, но отправка файлов недоступна.',
        });
        setNotice('Отправка Excel-файла недоступна на устройстве.');
        return;
      }

      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, reportBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await Sharing.shareAsync(fileUri, {
        dialogTitle: 'Поделиться отчетом Sadovnik Diary',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        UTI: 'org.openxmlformats.spreadsheetml.sheet',
      });
      setNotice('Excel-файл отчета готов к отправке.');
    } catch (shareError) {
      setNotice('Не удалось подготовить Excel-отчет.');
    }
  }

  async function handleScheduleTestWateringReminder() {
    try {
      await scheduleWateringReminder({
        body: 'Тестовое напоминание: пора проверить полив.',
        date: new Date(Date.now() + 60 * 1000),
      });
      setNotice('Напоминание о поливе запланировано через 1 минуту.');
    } catch (notificationError) {
      setNotice('Не удалось включить уведомления. Проверьте разрешения телефона.');
    }
  }

  function openStageRecommendations() {
    setRecommendationsContext({
      backScreen: 'cultureList',
      stage: selectedStage,
    });
    setRecommendationsMode('current');
    setCurrentScreen('recommendations');
  }

  function openSelectedCardRecommendations(backScreen) {
    if (!selectedCard) {
      return;
    }

    setRecommendationsContext({
      backScreen,
      cardId: selectedCard.id,
      stage: selectedCard.stage || selectedStage,
    });
    setRecommendationsMode('current');
    setCurrentScreen('recommendations');
  }

  function closeRecommendations() {
    const backScreen = recommendationsContext?.backScreen || 'cultureList';
    setRecommendationsContext(null);
    setRecommendationsMode('current');
    setCurrentScreen(backScreen);
  }

  function handleLogout() {
    setSelectedStage('');
    setCurrentScreen('stages');
    setSelectedCardId(null);
    setSelectedCalendarDate('');
    setIsAuthenticated(false);
  }

  async function handleClearTestData() {
    try {
      await clearCultureCardsForTests();
      setCultureCards([]);
      setSelectedStage('');
      setSelectedCardId(null);
      setSelectedCalendarDate('');
      setEditingCardId(null);
      setEditingOperationId(null);
      setCultureForm(createEmptyCultureForm());
      setStatusForm(createEmptyStatusForm());
      setIntroActionForm(createEmptyIntroActionForm());
      setIntroActionType('');
      setCultureCalendarTab('calendar');
      setIsDateEntryExpanded(false);
      setCurrentScreen('stages');
      setStorageError('');
      setNotice('Карточки стадий и журнал очищены.');
    } catch (clearError) {
      setStorageError('Не удалось очистить карточки стадий');
    }
  }

  function updateCultureForm(field, value) {
    setCultureForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function updateStatusForm(field, value) {
    setStatusForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function updateIntroActionForm(field, value) {
    setIntroActionForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function openCultureForm() {
    setCultureForm(createEmptyCultureForm());
    setFormError('');
    setShowDatePicker(false);
    setOpenDropdown('');
    setTouchedSubmit(false);
    setEditingCardId(null);
    setCurrentScreen('cultureForm');
  }

  function openEditCultureForm(card) {
    setCultureForm({
      ...createEmptyCultureForm(),
      ...removeRecommendationFields(card),
      qrPrinted: card.qrPrinted || false,
      qrPrintedAt: card.qrPrintedAt || null,
      qrPrintedBy: card.qrPrintedBy || null,
    });
    setFormError('');
    setShowDatePicker(false);
    setOpenDropdown('');
    setTouchedSubmit(false);
    setEditingCardId(card.id);
    setCurrentScreen('cultureForm');
  }

  function openCultureCalendar(card) {
    const initialDate = getLatestFilledCalendarDate(card);

    setSelectedCardId(card.id);
    setSelectedCalendarDate(initialDate);
    setCultureCalendarTab('calendar');
    setIsDateEntryExpanded(false);
    setIntroActionType('');
    setIntroActionForm(createEmptyIntroActionForm());
    setStageActionError('');
    setCalendarMonth(dateFromIso(initialDate));
    setCurrentScreen('cultureCalendar');
  }

  function closeCultureForm() {
    setCultureForm(createEmptyCultureForm());
    setFormError('');
    setShowDatePicker(false);
    setOpenDropdown('');
    setTouchedSubmit(false);
    setEditingCardId(null);
    setCurrentScreen('cultureList');
  }

  function closeCultureCalendar() {
    setSelectedCardId(null);
    setSelectedCalendarDate('');
    setCultureCalendarTab('calendar');
    setIsDateEntryExpanded(false);
    setIntroActionType('');
    setIntroActionForm(createEmptyIntroActionForm());
    setEditingOperationId(null);
    setIsStageMoveConfirmVisible(false);
    setStageActionError('');
    setCurrentScreen('cultureList');
  }

  function openStatusChangeForm() {
    if (!selectedCard || !selectedCalendarDate) {
      return;
    }

    setStatusForm(createEmptyStatusForm());
    setEditingOperationId(null);
    setIntroActionType(
      selectedCard.stage === 'Адаптация'
        ? 'adaptationStress'
        : selectedCard.stage === 'Теплица'
          ? 'greenhouseObservation'
          : 'rooting',
    );
    setStatusFormError('');
    setStatusFormNotice('');
    setCurrentScreen('statusChangeForm');
  }

  function closeStatusChangeForm() {
    setStatusForm(createEmptyStatusForm());
    setEditingOperationId(null);
    setStatusFormError('');
    setStatusFormNotice('');
    setIntroActionType('');
    setCurrentScreen('cultureCalendar');
  }

  function getStatusFormComment(operation) {
    if (operation?.type !== 'adaptationStress') {
      return operation?.comment || '';
    }

    return [
      operation.comment,
      operation.conditionDescription ? `Состояние: ${operation.conditionDescription}` : '',
      operation.reason ? `Причина: ${operation.reason}` : '',
      operation.turgor ? `Тургор: ${operation.turgor}` : '',
    ].filter(Boolean).join('\n');
  }

  function openEditOperation(operation) {
    if (!selectedCard || !operation) {
      return;
    }

    const operationDate = operation.date || selectedCalendarDate || getTodayIsoDate();

    setSelectedCalendarDate(operationDate);
    setCalendarMonth(dateFromIso(operationDate));
    setEditingOperationId(operation.id);
    setStatusFormError('');
    setStatusFormNotice('');
    setStageActionError('');

    if (selectedCard.stage === INTRO_STAGE && introOperationFields[operation.type]) {
      setIntroActionType(operation.type);
      setIntroActionForm({
        ...createEmptyIntroActionForm(),
        [introOperationFields[operation.type]]: operation[introOperationFields[operation.type]] || '',
      });
      setIsDateEntryExpanded(true);
      setCultureCalendarTab('calendar');
      setCurrentScreen('introActionForm');
      return;
    }

    if (editableStatusOperationTypes.includes(operation.type)) {
      const countField = statusEventCountFields[operation.type];

      setIntroActionType(operation.type);
      setStatusForm({
        ...createEmptyStatusForm(),
        ...(countField ? { [countField]: operation.count || '' } : {}),
        reason: operation.reason || operation.quarantineReason || '',
        comment: getStatusFormComment(operation),
        photoNote: operation.photoNote || '',
        saleType: operation.saleType || '',
        recipient: operation.recipient || '',
        saleAmount: operation.saleAmount || '',
        propagationMethod: operation.propagationMethod || '',
        stressLevel: operation.stressLevel || '',
        conditionDescription: operation.conditionDescription || '',
        environmentTemperature: operation.environmentTemperature || '',
        environmentHumidity: operation.environmentHumidity || operation.environmentAirHumidity || '',
        environmentAirHumidity: operation.environmentAirHumidity || '',
        substrateHumidity: operation.substrateHumidity || '',
        environmentLight: operation.environmentLight || '',
        ventilation: operation.ventilation || '',
        humidityReduction: operation.humidityReduction || '',
        turgor: operation.turgor || '',
        stability: operation.stability || '',
        careType: operation.careType || '',
        growthRate: operation.growthRate || '',
        riskLevel: operation.riskLevel || '',
        careIntervalDays: operation.careIntervalDays || '',
        wateringIntervalDays: operation.wateringIntervalDays || '',
        diseaseName: operation.diseaseName || '',
        pestName: operation.pestName || '',
        diseaseSeverity: operation.diseaseSeverity || '',
        waterVolume: operation.waterVolume || '',
        applicationMethod: operation.applicationMethod || '',
        productName: operation.productName || '',
        dosage: operation.dosage || '',
        plantReaction: operation.plantReaction || '',
        placement: operation.placement || '',
        densityChange: operation.densityChange || '',
      });
      setCurrentScreen('statusChangeForm');
    }
  }

  async function deleteOperation(operationId) {
    if (!selectedCard || !operationId) {
      return;
    }

    const nextCards = cultureCards.map((card) => (
      card.id === selectedCard.id
        ? (() => {
          const nextCard = {
            ...card,
            operations: (card.operations || []).filter((operation) => operation.id !== operationId),
          };

          return {
            ...nextCard,
            batchStatus: getResolvedBatchStatus(nextCard),
            status: getResolvedBatchStatus(nextCard) === 'sold' ? 'archived' : 'active',
          };
        })()
        : card
    ));

    await saveCultureCards(nextCards);

    if (editingOperationId === operationId) {
      setEditingOperationId(null);
      setIntroActionType('');
      setIntroActionForm(createEmptyIntroActionForm());
      setStatusForm(createEmptyStatusForm());
    }
  }

  function requestDeleteOperation(operationId) {
    setOperationDeleteCandidateId(operationId);
  }

  function cancelDeleteOperation() {
    setOperationDeleteCandidateId(null);
  }

  async function confirmDeleteOperation() {
    const operationId = operationDeleteCandidateId;
    setOperationDeleteCandidateId(null);
    await deleteOperation(operationId);
  }

  function handleSelectCulture(cultureName) {
    if (!canEditCurrentIdentity) {
      return;
    }

    setCultureForm((currentForm) => ({
      ...currentForm,
      cultureName,
      speciesName: '',
      varietyName: '',
      sourcePlantName: '',
    }));
    setOpenDropdown('');
  }

  function handleSelectSpecies(speciesName) {
    if (!canEditCurrentIdentity) {
      return;
    }

    setCultureForm((currentForm) => ({
      ...currentForm,
      speciesName,
      varietyName: '',
      sourcePlantName: '',
    }));
    setOpenDropdown('');
  }

  function handleSelectVariety(varietyName) {
    if (!canEditCurrentIdentity) {
      return;
    }

    const selectedPlant = plantsCatalog.find((plant) => (
      (plant.cultureName || EMPTY_CATALOG_VALUE) === cultureForm.cultureName &&
      (plant.speciesName || EMPTY_CATALOG_VALUE) === cultureForm.speciesName &&
      (plant.varietyName || EMPTY_CATALOG_VALUE) === varietyName
    ));
    setCultureForm((currentForm) => ({
      ...currentForm,
      varietyName,
      sourcePlantName: selectedPlant?.originalName || '',
    }));
    setOpenDropdown('');
  }

  function handleDateChange(event, selectedDate) {
    if (!canEditCurrentIdentity) {
      return;
    }

    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (!selectedDate) {
      return;
    }

    updateCultureForm('createdAt', isoFromDate(selectedDate));
  }

  function handleGenerateCode() {
    if (!canEditCurrentIdentity) {
      return;
    }

    const code = generatePlantingCode(cultureForm.createdAt, selectedStage);
    const isDuplicateCode = cultureCards.some((card) => (
      card.id !== editingCardId &&
      (card.code || '').trim().toLowerCase() === code.trim().toLowerCase()
    ));

    if (isDuplicateCode) {
      setFormError('Код уже существует. Сгенерируйте код ещё раз.');
      return;
    }

    setCultureForm((currentForm) => ({
      ...currentForm,
      code,
      qrStatus: 'pending_print',
    }));
    setFormError('');
  }

  function changeCalendarMonth(monthOffset) {
    setCalendarMonth((currentDate) => (
      new Date(currentDate.getFullYear(), currentDate.getMonth() + monthOffset, 1)
    ));
    setSelectedCalendarDate('');
  }

  async function handleAddStageChange() {
    if (!selectedCard || !selectedCalendarDate) {
      return;
    }

    const nextStage = getNextStage(selectedCard.stage);

    if (!nextStage) {
      return;
    }

    if (selectedCard.sterilityStatus === 'contaminated') {
      setStageActionError('Материал заражён: переход стадии заблокирован до решения администратора или агронома');
      return;
    }

    if (selectedCard.stage === INTRO_STAGE) {
      if ((selectedCard.batchStatus || 'active') !== 'active') {
        setStageActionError('Перевести можно только активную партию');
        return;
      }

      if (getQrStatus(selectedCard) === 'none') {
        setStageActionError('QR-код ещё не создан');
        return;
      }
    }

    if (selectedCard.stage === 'Клонирование') {
      const cloneStats = getCloneStats(selectedCard);

      if ((selectedCard.batchStatus || 'active') === 'quarantine') {
        setStageActionError('Партия в карантине и не может быть переведена дальше');
        return;
      }

      if ((selectedCard.batchStatus || 'active') === 'problem' || cloneStats.riskStatus === 'Критический') {
        setStageActionError('Нельзя перевести партию с критическим статусом');
        return;
      }

      if (cloneStats.rootedCount <= 0) {
        setStageActionError('Сначала зафиксируйте укоренившиеся растения');
        return;
      }

      if (cloneStats.currentQuantity <= 0) {
        setStageActionError('Остаток партии должен быть больше 0');
        return;
      }
    }

    if (selectedCard.stage === 'Адаптация') {
      const adaptationStats = getAdaptationStats(selectedCard);

      if ((selectedCard.batchStatus || 'active') === 'quarantine') {
        setStageActionError('Партия в карантине и не может быть переведена дальше');
        return;
      }

      if (selectedCard.sterilityStatus === 'contaminated') {
        setStageActionError('Есть активная контаминация');
        return;
      }

      if (adaptationStats.riskStatus === 'Критический') {
        setStageActionError('Нельзя перевести партию с критическим стрессом');
        return;
      }

      if (adaptationStats.stability !== 'Стабильна') {
        setStageActionError('Сначала зафиксируйте стабильность партии');
        return;
      }

      if (adaptationStats.currentQuantity <= 0) {
        setStageActionError('Остаток партии должен быть больше 0');
        return;
      }
    }

    const cloneTransitionStats = selectedCard.stage === 'Клонирование'
      ? getCloneStats(selectedCard)
      : null;
    const nextOperation = {
      id: `${Date.now()}`,
      type: 'stageChange',
      title: 'Изменение стадии',
      fromStage: selectedCard.stage,
      toStage: nextStage,
      stage: nextStage,
      date: selectedCalendarDate,
      stageChangedAt: selectedCalendarDate,
      rootedCount: cloneTransitionStats?.rootedCount,
      rootingPercent: cloneTransitionStats?.rootingPercent,
      currentQuantity: cloneTransitionStats?.currentQuantity,
      createdAt: new Date().toISOString(),
    };
    const nextCards = cultureCards.map((card) => {
      if (card.id !== selectedCard.id) {
        return card;
      }

      const cardWithoutRecommendations = removeRecommendationFields(card);

      return {
        ...cardWithoutRecommendations,
        stage: nextStage,
        stageChangedAt: selectedCalendarDate,
        stageChangedBy: currentUser.id,
        stageHistory: [
          {
            fromStage: selectedCard.stage,
            toStage: nextStage,
            date: selectedCalendarDate,
            changedAt: new Date().toISOString(),
            changedBy: currentUser.id,
          },
          ...(card.stageHistory || []),
        ],
        operations: [nextOperation, ...(card.operations || [])],
      };
    });

    await saveCultureCards(nextCards);
    setIsStageMoveConfirmVisible(false);
    setStageActionError('');
    setSelectedStage(nextStage);
    setCurrentScreen('cultureList');
    setSelectedCardId(null);
    setSelectedCalendarDate('');
  }

  async function handleSaveStatusChange() {
    if (!selectedCard || !selectedCalendarDate) {
      return;
    }

    if (selectedCalendarDate !== getTodayIsoDate()) {
      setStatusFormError('Производственные события можно фиксировать только на текущую дату');
      return;
    }

    const eventConfig = {
      rooting: {
        title: 'Укоренение',
        countField: 'rootedCount',
      },
      death: {
        title: 'Гибель',
        countField: 'deathCount',
        requiresReason: true,
      },
      discard: {
        title: 'Выбраковка',
        countField: 'discardCount',
        requiresReason: true,
      },
      sale: {
        title: 'Продажа',
        countField: 'saleCount',
      },
      propagation: {
        title: 'Размножение',
        countField: 'propagationCount',
      },
      quarantine: {
        title: 'Карантин',
        countField: '',
        requiresReason: true,
      },
      quarantineReleased: {
        title: 'Снятие карантина',
        countField: '',
        requiresReason: true,
      },
      adaptationStress: {
        title: 'Наблюдение',
        countField: '',
      },
      adaptationEnvironment: {
        title: 'Изменение среды',
        countField: '',
      },
      adaptationHumidityReduction: {
        title: 'Снижение влажности',
        countField: '',
      },
      adaptationCare: {
        title: 'Уход',
        countField: '',
      },
      greenhouseObservation: {
        title: 'Наблюдение',
        countField: '',
      },
      greenhouseCare: {
        title: 'Уход',
        countField: '',
      },
      greenhouseEnvironment: {
        title: 'Среда',
        countField: '',
      },
      greenhouseDisease: {
        title: 'Болезни / вредители',
        countField: '',
      },
      transplant: {
        title: 'Пересадка',
        countField: 'transplantCount',
      },
    }[introActionType || 'rooting'];
    const count = eventConfig.countField ? statusForm[eventConfig.countField].trim() : '';
    const editedOperation = editingOperationId
      ? selectedCardOperations.find((operation) => operation.id === editingOperationId)
      : null;
    const cardWithoutEditedOperation = editedOperation
      ? {
        ...selectedCard,
        operations: selectedCardOperations.filter((operation) => operation.id !== editingOperationId),
      }
      : selectedCard;
    const currentQuantity = getCardCurrentQuantity(cardWithoutEditedOperation);

    if (eventConfig.countField && !isPositiveInteger(count)) {
      setStatusFormError('Укажите корректное количество');
      return;
    }

    if (
      ['rooting', 'death', 'discard', 'sale'].includes(introActionType) &&
      Number(count) > currentQuantity
    ) {
      setStatusFormError('Количество не может быть больше текущего остатка');
      return;
    }

    if (eventConfig.requiresReason && !statusForm.reason.trim()) {
      setStatusFormError('Укажите причину');
      return;
    }

    if (introActionType === 'quarantineReleased') {
      if (!canReleaseQuarantine) {
        setStatusFormError('Снять карантин может только агроном или администратор');
        return;
      }

      if (!editingOperationId && (selectedCard.batchStatus || 'active') !== 'quarantine') {
        setStatusFormError('Партия не находится в карантине');
        return;
      }
    }

    if (introActionType === 'adaptationStress' && ![
      statusForm.stressLevel,
      statusForm.stability,
      statusForm.comment,
    ].some((value) => value.trim())) {
      setStatusFormError('Укажите хотя бы один параметр наблюдения');
      return;
    }

    if (introActionType === 'adaptationEnvironment' && ![
      statusForm.environmentTemperature,
      statusForm.environmentAirHumidity,
      statusForm.environmentHumidity,
      statusForm.substrateHumidity,
      statusForm.environmentLight,
      statusForm.ventilation,
      statusForm.humidityReduction,
    ].some((value) => value.trim())) {
      setStatusFormError('Укажите хотя бы один параметр среды');
      return;
    }

    if (introActionType === 'adaptationHumidityReduction' && ![
      statusForm.environmentAirHumidity,
      statusForm.environmentHumidity,
      statusForm.substrateHumidity,
      statusForm.humidityReduction,
      statusForm.turgor,
      statusForm.stability,
    ].some((value) => value.trim())) {
      setStatusFormError('Укажите снижение влажности или состояние партии');
      return;
    }

    if (introActionType === 'adaptationCare' && !statusForm.careType.trim()) {
      setStatusFormError('Укажите тип ухода');
      return;
    }

    if (introActionType === 'greenhouseObservation' && ![
      statusForm.growthRate,
      statusForm.stressLevel,
      statusForm.stability,
      statusForm.riskLevel,
      statusForm.conditionDescription,
    ].some((value) => value.trim())) {
      setStatusFormError('Укажите хотя бы один параметр наблюдения');
      return;
    }

    if (introActionType === 'greenhouseCare' && !statusForm.careType.trim()) {
      setStatusFormError('Укажите тип ухода');
      return;
    }

    if (introActionType === 'greenhouseEnvironment' && ![
      statusForm.environmentTemperature,
      statusForm.environmentAirHumidity,
      statusForm.environmentHumidity,
      statusForm.environmentLight,
      statusForm.ventilation,
      statusForm.placement,
      statusForm.densityChange,
    ].some((value) => value.trim())) {
      setStatusFormError('Укажите хотя бы один параметр среды');
      return;
    }

    if (introActionType === 'greenhouseDisease' && ![
      statusForm.diseaseName,
      statusForm.pestName,
      statusForm.diseaseSeverity,
      statusForm.riskLevel,
      statusForm.productName,
    ].some((value) => value.trim())) {
      setStatusFormError('Укажите болезнь, вредителя или уровень риска');
      return;
    }

    const nextOperation = {
      id: editingOperationId || `${Date.now()}`,
      type: introActionType || 'rooting',
      title: eventConfig.title,
      stage: selectedCard.stage || INTRO_STAGE,
      date: selectedCalendarDate,
      ...(count ? { count } : {}),
      totalQuantity: selectedCard.quantity,
      ...(['death', 'discard', 'sale'].includes(introActionType)
        ? { currentQuantity: Math.max(currentQuantity - Number(count), 0) }
        : {}),
      ...(introActionType === 'propagation'
        ? { currentQuantity: currentQuantity + Number(count) }
        : {}),
      comment: statusForm.comment.trim(),
      photoNote: statusForm.photoNote.trim(),
      ...(['death', 'discard'].includes(introActionType)
        ? { reason: statusForm.reason.trim() }
        : {}),
      ...(introActionType === 'quarantine'
        ? { quarantineReason: statusForm.reason.trim() }
        : {}),
      ...(introActionType === 'quarantineReleased'
        ? { reason: statusForm.reason.trim() }
        : {}),
      ...(introActionType === 'sale'
        ? {
          saleType: statusForm.saleType.trim(),
          recipient: statusForm.recipient.trim(),
          saleAmount: statusForm.saleAmount.trim(),
        }
        : {}),
      ...(introActionType === 'propagation'
        ? { propagationMethod: statusForm.propagationMethod.trim() }
        : {}),
      ...(introActionType === 'adaptationStress'
        ? {
          stressLevel: statusForm.stressLevel.trim(),
          stability: statusForm.stability.trim(),
        }
        : {}),
      ...(introActionType === 'adaptationEnvironment'
        ? {
          environmentTemperature: statusForm.environmentTemperature.trim(),
          environmentAirHumidity: statusForm.environmentAirHumidity.trim() || statusForm.environmentHumidity.trim(),
          substrateHumidity: statusForm.substrateHumidity.trim(),
          environmentLight: statusForm.environmentLight.trim(),
          ventilation: statusForm.ventilation.trim(),
          humidityReduction: statusForm.humidityReduction.trim(),
          turgor: statusForm.turgor.trim(),
          stability: statusForm.stability.trim(),
        }
        : {}),
      ...(introActionType === 'adaptationHumidityReduction'
        ? {
          environmentAirHumidity: statusForm.environmentAirHumidity.trim() || statusForm.environmentHumidity.trim(),
          substrateHumidity: statusForm.substrateHumidity.trim(),
          humidityReduction: statusForm.humidityReduction.trim(),
          turgor: statusForm.turgor.trim(),
          stability: statusForm.stability.trim(),
        }
        : {}),
      ...(introActionType === 'adaptationCare'
        ? { careType: statusForm.careType.trim() }
        : {}),
      ...(introActionType === 'greenhouseObservation'
        ? {
          growthRate: statusForm.growthRate.trim(),
          stressLevel: statusForm.stressLevel.trim(),
          stability: statusForm.stability.trim(),
          riskLevel: statusForm.riskLevel.trim(),
          conditionDescription: statusForm.conditionDescription.trim(),
        }
        : {}),
      ...(introActionType === 'greenhouseCare'
        ? {
          careType: statusForm.careType.trim(),
          careIntervalDays: statusForm.careIntervalDays.trim(),
          wateringIntervalDays: statusForm.wateringIntervalDays.trim(),
          waterVolume: statusForm.waterVolume.trim(),
          productName: statusForm.productName.trim(),
          dosage: statusForm.dosage.trim(),
          applicationMethod: statusForm.applicationMethod.trim(),
          plantReaction: statusForm.plantReaction.trim(),
          riskLevel: statusForm.riskLevel.trim(),
        }
        : {}),
      ...(introActionType === 'greenhouseEnvironment'
        ? {
          environmentTemperature: statusForm.environmentTemperature.trim(),
          environmentAirHumidity: statusForm.environmentAirHumidity.trim() || statusForm.environmentHumidity.trim(),
          environmentLight: statusForm.environmentLight.trim(),
          ventilation: statusForm.ventilation.trim(),
          placement: statusForm.placement.trim(),
          densityChange: statusForm.densityChange.trim(),
          growthRate: statusForm.growthRate.trim(),
          stability: statusForm.stability.trim(),
          riskLevel: statusForm.riskLevel.trim(),
        }
        : {}),
      ...(introActionType === 'greenhouseDisease'
        ? {
          diseaseName: statusForm.diseaseName.trim(),
          pestName: statusForm.pestName.trim(),
          diseaseSeverity: statusForm.diseaseSeverity.trim(),
          riskLevel: statusForm.riskLevel.trim(),
          productName: statusForm.productName.trim(),
          dosage: statusForm.dosage.trim(),
          applicationMethod: statusForm.applicationMethod.trim(),
          plantReaction: statusForm.plantReaction.trim(),
        }
        : {}),
      ...(introActionType === 'transplant'
        ? {
          placement: statusForm.placement.trim(),
          densityChange: statusForm.densityChange.trim(),
          growthRate: statusForm.growthRate.trim(),
          stability: statusForm.stability.trim(),
        }
        : {}),
      createdAt: editedOperation?.createdAt || new Date().toISOString(),
      createdBy: editedOperation?.createdBy || currentUser.id,
      ...(editingOperationId ? { updatedAt: new Date().toISOString(), updatedBy: currentUser.id } : {}),
    };
    const nextCards = cultureCards.map((card) => {
      if (card.id !== selectedCard.id) {
        return card;
      }

      const currentOperations = card.operations || [];
      const nextOperations = editingOperationId
        ? currentOperations.map((operation) => (
          operation.id === editingOperationId ? nextOperation : operation
        ))
        : [nextOperation, ...currentOperations];
      const nextCard = {
        ...card,
        operations: nextOperations,
        ...(introActionType === 'greenhouseCare' && statusForm.careType.trim()
          ? {
            greenhouseCareIntervals: {
              ...(card.greenhouseCareIntervals || {}),
              [statusForm.careType.trim()]: statusForm.careIntervalDays.trim() ||
                statusForm.wateringIntervalDays.trim() ||
                card.greenhouseCareIntervals?.[statusForm.careType.trim()],
            },
          }
          : {}),
      };
      const nextQuantity = getCardCurrentQuantity(nextCard);
      const fallbackBatchStatus = introActionType === 'sale' && nextQuantity === 0
        ? 'sold'
        : introActionType === 'quarantine'
          ? 'quarantine'
        : introActionType === 'quarantineReleased'
          ? 'active'
        : (
          (introActionType === 'adaptationStress' && statusForm.stressLevel === 'Критический') ||
          (
            ['greenhouseObservation', 'greenhouseDisease', 'greenhouseCare'].includes(introActionType) &&
            (
              statusForm.stressLevel === 'Критический' ||
              statusForm.riskLevel === 'Критический' ||
              statusForm.diseaseSeverity === 'Критическая'
            )
          )
        )
          ? 'problem'
        : introActionType === 'sale'
          ? 'partial'
          : card.batchStatus || 'active';
      const nextCardWithStatus = {
        ...nextCard,
        batchStatus: fallbackBatchStatus,
      };

      return {
        ...nextCardWithStatus,
        batchStatus: getResolvedBatchStatus(nextCardWithStatus),
        status: getResolvedBatchStatus(nextCardWithStatus) === 'sold'
          ? 'archived'
          : 'active',
      };
    });

    await saveCultureCards(nextCards);

    if (introActionType === 'greenhouseCare' && statusForm.careType.trim() === 'Полив') {
      const updatedCard = nextCards.find((card) => card.id === selectedCard.id);
      const wateringStats = getGreenhouseStats(updatedCard);
      const reminderDate = getReminderDateFromIsoDate(wateringStats.nextWateringDate);

      if (reminderDate) {
        scheduleWateringReminder({
          body: `${getCardDisplayName(updatedCard)}: следующий полив ${formatDisplayDate(wateringStats.nextWateringDate)}.`,
          date: reminderDate,
        }).catch(() => {});
      }
    }

    const wasEditingOperation = Boolean(editingOperationId);

    setStatusForm(createEmptyStatusForm());
    setEditingOperationId(null);
    setStatusFormError('');

    if (wasEditingOperation) {
      setStatusFormNotice('');
      setCurrentScreen('cultureCalendar');
      return;
    }

    setStatusFormNotice('Событие сохранено. Можно добавить следующее.');
  }

  async function handleSaveIntroAction() {
    if (!selectedCard || !selectedCalendarDate || !introActionType) {
      return false;
    }

    const nowIso = new Date().toISOString();
    const actionConfig = {
      comment: {
        field: 'comment',
        type: 'comment',
        title: 'Комментарий',
        error: 'Введите комментарий',
      },
      photo: {
        field: 'photoNote',
        type: 'photo',
        title: 'Фото',
        error: 'Добавьте описание фото или ссылку',
      },
      contamination: {
        field: 'contaminationNote',
        type: 'contamination',
        title: 'Контаминация',
        error: 'Опишите контаминацию',
      },
      quarantine: {
        field: 'quarantineReason',
        type: 'quarantine',
        title: 'Перевод в карантин',
        error: 'Укажите причину карантина',
      },
    }[introActionType];
    if (!actionConfig) {
      return false;
    }

    const value = introActionForm[actionConfig.field].trim();

    if (!value) {
      setStageActionError(actionConfig.error);
      return false;
    }

    const editedOperation = editingOperationId
      ? selectedCardOperations.find((operation) => operation.id === editingOperationId)
      : null;
    const nextOperation = {
      id: editingOperationId || `${actionConfig.type}-${Date.now()}`,
      type: actionConfig.type,
      title: actionConfig.title,
      stage: selectedCard.stage || INTRO_STAGE,
      date: selectedCalendarDate,
      [actionConfig.field]: value,
      createdAt: editedOperation?.createdAt || nowIso,
      createdBy: editedOperation?.createdBy || currentUser.id,
      ...(editingOperationId ? { updatedAt: nowIso, updatedBy: currentUser.id } : {}),
    };
    const nextCards = cultureCards.map((card) => {
      if (card.id !== selectedCard.id) {
        return card;
      }

      return {
        ...card,
        batchStatus: introActionType === 'quarantine' ? 'quarantine' : card.batchStatus || 'active',
        sterilityStatus: introActionType === 'contamination' ? 'contaminated' : card.sterilityStatus || 'unchecked',
        operations: editingOperationId
          ? (card.operations || []).map((operation) => (
            operation.id === editingOperationId ? nextOperation : operation
          ))
          : [nextOperation, ...(card.operations || [])],
      };
    });

    await saveCultureCards(nextCards);
    setIntroActionForm(createEmptyIntroActionForm());
    setEditingOperationId(null);
    setIntroActionType('');
    setStageActionError('');
    return true;
  }

  async function handleSaveCultureCard() {
    setTouchedSubmit(true);

    const createdAt = cultureForm.createdAt.trim();
    const cultureName = cultureForm.cultureName.trim();
    const speciesName = cultureForm.speciesName.trim();
    const varietyName = cultureForm.varietyName.trim();
    const code = cultureForm.code.trim();
    const quantity = cultureForm.quantity.trim();
    const sourceMaterial = cultureForm.sourceMaterial.trim();
    const parentBatch = cultureForm.parentBatch.trim();
    const startPhotoNote = cultureForm.startPhotoNote.trim();
    const isDuplicateCode = cultureCards.some((card) => (
      card.id !== editingCardId &&
      (card.code || '').trim().toLowerCase() === code.toLowerCase()
    ));
    if (
      !createdAt ||
      !cultureName ||
      !speciesName ||
      !varietyName ||
      !code ||
      !quantity ||
      (isCultureIntroStage && !sourceMaterial)
    ) {
      setFormError('Заполните все поля');
      return;
    }

    if (!isPositiveInteger(quantity)) {
      setFormError('Количество указано некорректно');
      return;
    }

    if (isDuplicateCode) {
      setFormError('Код уже существует');
      return;
    }

    const nowIso = new Date().toISOString();
    const qrStatus = cultureForm.qrStatus === 'printed' ? 'printed' : 'pending_print';
    const batchCreatedOperation = createBatchCreatedOperation({
      createdAt,
      stage: selectedStage,
      quantity,
      code,
      createdBy: currentUser.id,
    }, nowIso);
    const nextOperations = editingCardId
      ? cultureForm.operations || []
      : [batchCreatedOperation];
    const cultureFormWithoutRecommendations = removeRecommendationFields(cultureForm);

    const nextCard = {
      ...cultureFormWithoutRecommendations,
      id: editingCardId || `${Date.now()}`,
      createdAt,
      cultureName,
      speciesName,
      varietyName,
      code,
      quantity,
      sourceMaterial,
      parentBatch,
      sterilityStatus: cultureForm.sterilityStatus || 'unchecked',
      startPhotoNote,
      name: getCardDisplayName({ cultureName, speciesName, varietyName }),
      stage: selectedStage,
      qrPrinted: cultureForm.qrPrinted || false,
      qrPrintedAt: cultureForm.qrPrintedAt || null,
      qrPrintedBy: cultureForm.qrPrintedBy || null,
      qrStatus,
      batchStatus: cultureForm.batchStatus || 'active',
      status: cultureForm.status || 'active',
      cancelledAt: cultureForm.cancelledAt || null,
      cancelledBy: cultureForm.cancelledBy || null,
      operations: nextOperations,
    };

    const nextCards = editingCardId
      ? cultureCards.map((card) => (card.id === editingCardId ? nextCard : card))
      : [nextCard, ...cultureCards];

    await saveCultureCards(nextCards);
    closeCultureForm();
  }

  async function handleCancelCultureCard() {
    if (!editingCardId) {
      return;
    }

    const nextCards = cultureCards.map((card) => {
      if (card.id !== editingCardId) {
        return card;
      }

      return {
        ...card,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledBy: currentUser.id,
      };
    });

    await saveCultureCards(nextCards);
    closeCultureForm();
  }

  function isRequiredFieldMissing(field) {
    if (!touchedSubmit) {
      return false;
    }

    return !`${cultureForm[field]}`.trim();
  }

  if (
    isAuthenticated &&
    isSupportedPlantingStage &&
    currentScreen === 'cultureForm'
  ) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <StageHeader
          onBack={closeCultureForm}
          subtitle={<Text style={styles.stageHeaderSubtitle}>{selectedStage}</Text>}
          title={
            isEditingCard
              ? 'Паспорт партии'
              : isCultureIntroStage
                ? 'Создать партию'
                : 'Добавить карточку'
          }
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.cardsScrollContent}
            keyboardShouldPersistTaps="handled"
        >
          <View style={styles.cardsScreen}>
              <View style={styles.formPanel}>
                {isEditingCard && (
                  <View style={styles.noticeBox}>
                    <Text style={styles.noticeText}>
                      Паспорт партии заблокирован после создания. В этой форме можно менять только настройки текущей стадии.
                    </Text>
                  </View>
                )}

                <View style={styles.field}>
                  <Text style={styles.label}>{isAdaptationStage ? 'Дата посадки *' : 'Дата создания *'}</Text>
                  {showIdentityAsText ? (
                    <Text style={styles.readonlyValue}>
                      {formatDisplayDate(cultureForm.createdAt)}
                    </Text>
                  ) : Platform.OS === 'web' ? (
                    <TextInput
                      editable={canEditCurrentIdentity}
                      onChangeText={(value) => {
                        updateCultureForm('createdAt', parseDisplayDate(value));
                      }}
                      placeholder="дд.мм.гггг"
                      placeholderTextColor="#7C8A80"
                      style={[
                        styles.input,
                        !canEditCurrentIdentity && styles.inputDisabled,
                        isRequiredFieldMissing('createdAt') && styles.inputInvalid,
                      ]}
                      value={formatDisplayDate(cultureForm.createdAt)}
                    />
                  ) : (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        disabled={!canEditCurrentIdentity}
                        onPress={() => setShowDatePicker(true)}
                        style={({ pressed }) => [
                          styles.dateButton,
                          !canEditCurrentIdentity && styles.inputDisabled,
                          isRequiredFieldMissing('createdAt') && styles.inputInvalid,
                          pressed && styles.linkButtonPressed,
                        ]}
                      >
                        <Text style={styles.dateButtonText}>
                          {formatDisplayDate(cultureForm.createdAt)}
                        </Text>
                      </Pressable>

                      {showDatePicker && NativeDateTimePicker && (
                        <NativeDateTimePicker
                          mode="date"
                          onChange={handleDateChange}
                          value={dateFromIso(cultureForm.createdAt)}
                        />
                      )}
                    </>
                  )}
                </View>

                <View style={styles.field}>
                  {showIdentityAsText ? (
                    <Text style={styles.readonlyValue}>{cultureForm.cultureName}</Text>
                  ) : (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        disabled={!canEditCurrentIdentity}
                        onPress={() => setOpenDropdown(
                          openDropdown === 'culture' ? '' : 'culture',
                        )}
                        style={[
                          styles.selectButton,
                          !canEditCurrentIdentity && styles.selectButtonDisabled,
                          isRequiredFieldMissing('cultureName') && styles.inputInvalid,
                        ]}
                      >
                        <Text
                          style={[
                            styles.selectButtonText,
                            !cultureForm.cultureName && styles.selectPlaceholder,
                          ]}
                        >
                          {cultureForm.cultureName || 'Выберите культуру'}
                        </Text>
                        <View style={styles.selectButtonArrow}>
                          <ChevronDownIcon />
                        </View>
                      </Pressable>

                      {openDropdown === 'culture' && (
                        <View style={styles.dropdownList}>
                          <ScrollView nestedScrollEnabled>
                            {cultureOptions.map((cultureName) => (
                              <Pressable
                                accessibilityRole="button"
                                key={cultureName}
                                onPress={() => handleSelectCulture(cultureName)}
                                style={({ pressed }) => [
                                  styles.dropdownItem,
                                  pressed && styles.linkButtonPressed,
                                ]}
                              >
                                <Text style={styles.dropdownItemText}>{cultureName}</Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </>
                  )}
                </View>

                <View style={styles.field}>
                  {showIdentityAsText ? (
                    <Text style={styles.readonlyValue}>{cultureForm.speciesName}</Text>
                  ) : (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        disabled={!cultureForm.cultureName || !canEditCurrentIdentity}
                        onPress={() => setOpenDropdown(
                          openDropdown === 'species' ? '' : 'species',
                        )}
                        style={[
                          styles.selectButton,
                          (!cultureForm.cultureName || !canEditCurrentIdentity) && styles.selectButtonDisabled,
                          isRequiredFieldMissing('speciesName') && styles.inputInvalid,
                        ]}
                      >
                        <Text
                          style={[
                            styles.selectButtonText,
                            !cultureForm.speciesName && styles.selectPlaceholder,
                          ]}
                        >
                          {cultureForm.speciesName || 'Выберите вид'}
                        </Text>
                        <View style={styles.selectButtonArrow}>
                          <ChevronDownIcon />
                        </View>
                      </Pressable>

                      {openDropdown === 'species' && (
                        <View style={styles.dropdownList}>
                          <ScrollView nestedScrollEnabled>
                            {speciesOptions.map((speciesName) => (
                              <Pressable
                                accessibilityRole="button"
                                key={speciesName}
                                onPress={() => handleSelectSpecies(speciesName)}
                                style={({ pressed }) => [
                                  styles.dropdownItem,
                                  pressed && styles.linkButtonPressed,
                                ]}
                              >
                                <Text style={styles.dropdownItemText}>{speciesName}</Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </>
                  )}
                </View>

                <View style={styles.field}>
                  {showIdentityAsText ? (
                    <Text style={styles.readonlyValue}>{cultureForm.varietyName}</Text>
                  ) : (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        disabled={!cultureForm.speciesName || !canEditCurrentIdentity}
                        onPress={() => setOpenDropdown(
                          openDropdown === 'variety' ? '' : 'variety',
                        )}
                        style={[
                          styles.selectButton,
                          (!cultureForm.speciesName || !canEditCurrentIdentity) && styles.selectButtonDisabled,
                          isRequiredFieldMissing('varietyName') && styles.inputInvalid,
                        ]}
                      >
                        <Text
                          style={[
                            styles.selectButtonText,
                            !cultureForm.varietyName && styles.selectPlaceholder,
                          ]}
                        >
                          {cultureForm.varietyName || 'Выберите сорт'}
                        </Text>
                        <View style={styles.selectButtonArrow}>
                          <ChevronDownIcon />
                        </View>
                      </Pressable>

                      {openDropdown === 'variety' && (
                        <View style={styles.dropdownList}>
                          <ScrollView nestedScrollEnabled>
                            {varietyOptions.map((varietyName) => (
                              <Pressable
                                accessibilityRole="button"
                                key={varietyName}
                                onPress={() => handleSelectVariety(varietyName)}
                                style={({ pressed }) => [
                                  styles.dropdownItem,
                                  pressed && styles.linkButtonPressed,
                                ]}
                              >
                                <Text style={styles.dropdownItemText}>{varietyName}</Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </>
                  )}
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Код партии *</Text>
                  {showIdentityAsText ? (
                    <Text style={styles.readonlyValue}>{cultureForm.code}</Text>
                  ) : (
                    <View style={styles.codeInputRow}>
                      <TextInput
                        autoCapitalize="characters"
                        editable={canEditCurrentIdentity}
                        onChangeText={(value) => updateCultureForm('code', value)}
                        placeholder={`${isCloneStage ? 'KL' : isAdaptationStage ? 'AD' : 'VK'}-YYYYMMDD-HHMMSS`}
                        placeholderTextColor="#7C8A80"
                        style={[
                          styles.input,
                          styles.codeInput,
                          !canEditCurrentIdentity && styles.inputDisabled,
                          isRequiredFieldMissing('code') && styles.inputInvalid,
                        ]}
                        value={cultureForm.code}
                      />
                      <Pressable
                        accessibilityRole="button"
                        disabled={!canEditCurrentIdentity}
                        onPress={handleGenerateCode}
                        style={({ pressed }) => [
                          styles.generateButton,
                          !canEditCurrentIdentity && styles.generateButtonDisabled,
                          pressed && styles.pressedButton,
                        ]}
                      >
                        <Text style={styles.generateButtonText}>
                          {isEditingCard ? 'Сгенерировать новый' : 'Сгенерировать'}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Количество *</Text>
                  {isEditingCard ? (
                    <Text style={styles.readonlyValue}>{cultureForm.quantity}</Text>
                  ) : (
                    <TextInput
                      inputMode="numeric"
                      keyboardType="numeric"
                      onChangeText={(value) => updateCultureForm('quantity', value)}
                      placeholder="Введите количество"
                      placeholderTextColor="#7C8A80"
                      style={[
                        styles.input,
                        isRequiredFieldMissing('quantity') && styles.inputInvalid,
                      ]}
                      value={cultureForm.quantity}
                    />
                  )}
                </View>

                {isCultureIntroStage && (
                  <>
                    <View style={styles.field}>
                      <Text style={styles.label}>Гормон *</Text>
                      {showIdentityAsText ? (
                        <Text style={styles.readonlyValue}>{cultureForm.hasHormone ? 'Есть' : 'Нет'}</Text>
                      ) : (
                        <View style={styles.toggleRow}>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => updateCultureForm('hasHormone', true)}
                            style={[
                              styles.toggleButton,
                              cultureForm.hasHormone && styles.toggleButtonActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.toggleButtonText,
                                cultureForm.hasHormone && styles.toggleButtonTextActive,
                              ]}
                            >
                              Есть
                            </Text>
                          </Pressable>

                          <Pressable
                            accessibilityRole="button"
                            onPress={() => updateCultureForm('hasHormone', false)}
                            style={[
                              styles.toggleButton,
                              !cultureForm.hasHormone && styles.toggleButtonActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.toggleButtonText,
                                !cultureForm.hasHormone && styles.toggleButtonTextActive,
                              ]}
                            >
                              Нет
                            </Text>
                          </Pressable>
                        </View>
                      )}
                    </View>

                    <View style={styles.field}>
                      {showIdentityAsText ? (
                        <Text style={styles.readonlyValue}>{cultureForm.sourceMaterial}</Text>
                      ) : (
                        <>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => setOpenDropdown(
                              openDropdown === 'sourceMaterial' ? '' : 'sourceMaterial',
                            )}
                            style={[
                              styles.selectButton,
                              isRequiredFieldMissing('sourceMaterial') && styles.inputInvalid,
                            ]}
                          >
                            <Text
                              style={[
                                styles.selectButtonText,
                                !cultureForm.sourceMaterial && styles.selectPlaceholder,
                              ]}
                              >
                                {cultureForm.sourceMaterial || 'Выберите источник материала'}
                              </Text>
                              <View style={styles.selectButtonArrow}>
                                <ChevronDownIcon />
                              </View>
                            </Pressable>

                          {openDropdown === 'sourceMaterial' && (
                            <View style={styles.dropdownList}>
                              <ScrollView nestedScrollEnabled>
                                {SOURCE_MATERIAL_OPTIONS.map((option) => (
                                  <Pressable
                                    accessibilityRole="button"
                                    key={option}
                                    onPress={() => {
                                      updateCultureForm('sourceMaterial', option === 'Другое' ? '' : option);
                                      setOpenDropdown(option === 'Другое' ? 'sourceMaterialCustom' : '');
                                    }}
                                    style={({ pressed }) => [
                                      styles.dropdownItem,
                                      pressed && styles.linkButtonPressed,
                                    ]}
                                  >
                                    <Text style={styles.dropdownItemText}>{option}</Text>
                                  </Pressable>
                                ))}
                              </ScrollView>
                            </View>
                          )}

                          {(
                            openDropdown === 'sourceMaterialCustom' ||
                            (cultureForm.sourceMaterial && !SOURCE_MATERIAL_OPTIONS.includes(cultureForm.sourceMaterial))
                          ) && (
                            <TextInput
                              onChangeText={(value) => updateCultureForm('sourceMaterial', value)}
                              placeholder="Укажите источник материала"
                              placeholderTextColor="#7C8A80"
                              style={[
                                styles.input,
                                isRequiredFieldMissing('sourceMaterial') && styles.inputInvalid,
                              ]}
                              value={cultureForm.sourceMaterial}
                            />
                          )}
                        </>
                      )}
                    </View>

                    <View style={styles.field}>
                      <Text style={styles.label}>Стартовое фото</Text>
                      {showIdentityAsText ? (
                        <Text style={styles.readonlyValue}>{cultureForm.startPhotoNote || 'Не добавлено'}</Text>
                      ) : (
                        <TextInput
                          onChangeText={(value) => updateCultureForm('startPhotoNote', value)}
                          placeholder="Описание фото или ссылка"
                          placeholderTextColor="#7C8A80"
                          style={styles.input}
                          value={cultureForm.startPhotoNote}
                        />
                      )}
                    </View>

                    {!isEditingCard && (
                      <View style={styles.field}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => setOpenDropdown(
                            openDropdown === 'batchStatus' ? '' : 'batchStatus',
                          )}
                          style={styles.selectButton}
                        >
                          <Text style={styles.selectButtonText}>
                            {BATCH_STATUS_LABELS[cultureForm.batchStatus] || 'Выберите статус партии'}
                          </Text>
                          <View style={styles.selectButtonArrow}>
                            <ChevronDownIcon />
                          </View>
                        </Pressable>

                        {openDropdown === 'batchStatus' && (
                          <View style={styles.dropdownList}>
                            <ScrollView nestedScrollEnabled>
                              {cultureCreateBatchStatuses.map(([value, label]) => (
                                <Pressable
                                  accessibilityRole="button"
                                  key={value}
                                  onPress={() => {
                                    updateCultureForm('batchStatus', value);
                                    setOpenDropdown('');
                                  }}
                                  style={({ pressed }) => [
                                    styles.dropdownItem,
                                    pressed && styles.linkButtonPressed,
                                  ]}
                                >
                                  <Text style={styles.dropdownItemText}>{label}</Text>
                                </Pressable>
                              ))}
                            </ScrollView>
                          </View>
                        )}
                      </View>
                    )}
                  </>
                )}

              </View>

              <View style={styles.cultureFormFooter}>
                {!!formError && <Text style={styles.errorText}>{formError}</Text>}

                {canSaveCultureForm && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleSaveCultureCard}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && styles.pressedButton,
                    ]}
                  >
                    <Text style={styles.primaryButtonText}>
                      {isEditingCard ? 'Сохранить настройки' : isCultureIntroStage ? 'Создать партию' : 'Сохранить'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (
    isAuthenticated &&
    isSupportedPlantingStage &&
    currentScreen === 'cultureCalendar' &&
    selectedCard
  ) {
    const selectedDate = selectedCalendarDate || selectedCard.createdAt || getTodayIsoDate();
    return (
      <CultureCalendarScreen
        activeTab={cultureCalendarTab}
        bottomInset={bottomInset}
        isStageMoveConfirmVisible={isStageMoveConfirmVisible}
        isOperationDeleteConfirmVisible={Boolean(operationDeleteCandidateId)}
        onAddEvent={() => {
          setSelectedCalendarDate(selectedDate);
          setStageActionError('');
          setEditingOperationId(null);

          if (selectedCard.stage === INTRO_STAGE) {
            setIsDateEntryExpanded(false);
            setIntroActionType('comment');
            setIntroActionForm(createEmptyIntroActionForm());
            setCurrentScreen('introActionForm');
            return;
          }

          openStatusChangeForm();
        }}
        onBack={closeCultureCalendar}
        onCancelStageMove={() => setIsStageMoveConfirmVisible(false)}
        onCancelOperationDelete={cancelDeleteOperation}
        onChangeTab={(tab) => {
          setCultureCalendarTab(tab);
          setIsDateEntryExpanded(false);
          setIntroActionType('');
          setEditingOperationId(null);
          setStageActionError('');
        }}
        onConfirmStageMove={handleAddStageChange}
        onConfirmOperationDelete={confirmDeleteOperation}
        onOpenRecommendations={() => openSelectedCardRecommendations('cultureCalendar')}
        onRequestStageMove={() => {
          setStageActionError('');
          setIsStageMoveConfirmVisible(true);
        }}
        showBottomActions={cultureCalendarTab === 'calendar'}
        stageActionError={stageActionError}
        stageMoveBlockedMessage={stageMoveBlockedMessage}
        stageMoveButtonLabel={stageMoveButtonLabel}
        stageMoveTarget={selectedCardNextStage}
        title={getCardDisplayName(selectedCard)}
      >
            {cultureCalendarTab === 'calendar' && (
              <CultureCalendarTab
                calendarDays={calendarDays}
                calendarMonth={calendarMonth}
                canDeleteOperation={(operation) => (
                  (
                    (selectedCard.stage === INTRO_STAGE && introOperationFields[operation.type]) ||
                    editableStatusOperationTypes.includes(operation.type)
                  ) && !protectedOperationTypes.includes(operation.type)
                )}
                canEditOperation={(operation) => (
                  (selectedCard.stage === INTRO_STAGE && introOperationFields[operation.type]) ||
                  editableStatusOperationTypes.includes(operation.type)
                )}
                card={selectedCard}
                onChangeMonth={changeCalendarMonth}
                onDeleteOperation={requestDeleteOperation}
                onEditOperation={openEditOperation}
                onSelectDate={(isoDate) => {
                  setSelectedCalendarDate(isoDate);
                  setIsDateEntryExpanded(false);
                  setIntroActionType('');
                  setIntroActionForm(createEmptyIntroActionForm());
                  setEditingOperationId(null);
                  setStageActionError('');
                }}
                operationDates={operationDates}
                selectedDate={selectedDate}
                selectedDateOperations={selectedDateOperations}
                stageActionError=""
                stageMoveBlockedMessage={stageMoveBlockedMessage}
                stageMoveTarget={selectedCardNextStage}
              />
            )}

            {cultureCalendarTab === 'passport' && (
              <CulturePassportTab
                adaptationStats={selectedCardAdaptationStats}
                card={selectedCard}
                cloneStats={selectedCardCloneStats}
                currentQuantity={selectedCardCurrentQuantity}
                daysInStage={selectedCardDaysInStage}
                getResolvedBatchStatus={getResolvedBatchStatus}
              />
            )}

            {cultureCalendarTab === 'journal' && (
              <CultureJournalTab
                canDeleteOperation={(operation) => (
                  (
                    (selectedCard.stage === INTRO_STAGE && introOperationFields[operation.type]) ||
                    editableStatusOperationTypes.includes(operation.type)
                  ) && !protectedOperationTypes.includes(operation.type)
                )}
                canEditOperation={(operation) => (
                  (selectedCard.stage === INTRO_STAGE && introOperationFields[operation.type]) ||
                  editableStatusOperationTypes.includes(operation.type)
                )}
                card={selectedCard}
                operations={selectedCardOperations}
                onDeleteOperation={requestDeleteOperation}
                onEditOperation={openEditOperation}
              />
            )}
      </CultureCalendarScreen>
    );
  }

  if (
    isAuthenticated &&
    currentScreen === 'introActionForm' &&
    selectedCard
  ) {
    return (
      <IntroActionFormScreen
        actionForm={introActionForm}
        actionType={introActionType}
        error={stageActionError}
        isEditing={Boolean(editingOperationId)}
        onBack={() => {
          setIntroActionType('');
          setIntroActionForm(createEmptyIntroActionForm());
          setEditingOperationId(null);
          setStageActionError('');
          setCurrentScreen('cultureCalendar');
        }}
        onChangeActionForm={updateIntroActionForm}
        onSave={async () => {
          const isSaved = await handleSaveIntroAction();
          if (isSaved) {
            setCurrentScreen('cultureCalendar');
          }
        }}
        onSelectActionType={(value) => {
          setIntroActionType(value);
          setEditingOperationId(null);
          setStageActionError('');
        }}
        selectedCard={selectedCard}
      />
    );
  }

  if (
    isAuthenticated &&
    (isCloneStage || isAdaptationStage || isGreenhouseStage) &&
    currentScreen === 'statusChangeForm' &&
    selectedCard
  ) {
    return (
      <StatusChangeFormScreen
        eventType={introActionType}
        form={statusForm}
        formError={statusFormError}
        formNotice={statusFormNotice}
        isEditing={Boolean(editingOperationId)}
        onBack={closeStatusChangeForm}
        onChangeField={updateStatusForm}
        onSave={handleSaveStatusChange}
        onSelectEventType={(value) => {
          setIntroActionType(value);
          setStatusForm(createEmptyStatusForm());
          setStatusFormError('');
          setStatusFormNotice('');
        }}
        selectedCard={selectedCard}
        selectedDate={selectedCalendarDate}
      />
    );

  }

  if (
    isAuthenticated &&
    currentScreen === 'recommendations'
  ) {
    return (
      <RecommendationsScreen
        entries={recommendationEntries}
        mode={recommendationsMode}
        onBack={closeRecommendations}
        onChangeMode={setRecommendationsMode}
        showModeSwitch={Boolean(recommendationCard)}
        stage={recommendationStage}
        title={recommendationCard ? getCardDisplayName(recommendationCard) : 'Рекомендации'}
      />
    );
  }

  if (
    isAuthenticated &&
    isSupportedPlantingStage &&
    currentScreen === 'cultureList'
  ) {
    return (
      <CultureListScreen
        allVisibleStageCardsCount={allVisibleStageCardsCount}
        batchStatusFilter={batchStatusFilter}
        bottomInset={bottomInset}
        cardSearch={cardSearch}
        cards={filteredCultureCards}
        getPlantCardStatusDotStyle={getPlantCardStatusDotStyle}
        getResolvedBatchStatus={getResolvedBatchStatus}
        isAdaptationStage={isAdaptationStage}
        isCardsLoading={isCardsLoading}
        isCloneStage={isCloneStage}
        isCultureIntroStage={isCultureIntroStage}
        isGreenhouseStage={isGreenhouseStage}
        onBack={() => setSelectedStage('')}
        onChangeBatchStatusFilter={setBatchStatusFilter}
        onChangeSearch={setCardSearch}
        onCreateCulture={openCultureForm}
        onEditCulture={openEditCultureForm}
        onOpenCultureCalendar={openCultureCalendar}
        selectedStage={selectedStage}
        storageError={storageError}
      />
    );
  }

  if (isAuthenticated && currentScreen === 'globalJournal') {
    return (
      <GlobalJournalScreen
        bottomInset={bottomInset}
        expandedCardIds={expandedJournalCardIds}
        getJournalFilterLabel={getJournalFilterLabel}
        getResolvedBatchStatus={getResolvedBatchStatus}
        groupedCards={groupedGlobalJournalCards}
        journalFilter={journalFilter}
        onChangeJournalFilter={setJournalFilter}
        onHomePress={() => setCurrentScreen('stages')}
        onJournalPress={openGlobalJournal}
        onMenuPress={openMenu}
        onOpenCard={(card) => {
          setSelectedStage(card.stage || INTRO_STAGE);
          openCultureCalendar(card);
        }}
        onScanPress={() => setNotice('\u0421\u043a\u0430\u043d\u0435\u0440 \u0431\u0443\u0434\u0435\u0442 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d \u043f\u043e\u0437\u0434\u043d\u0435\u0435.')}
        onTasksPress={openTasks}
        onToggleCard={toggleJournalCard}
        taskCount={taskCount}
      />
    );
  }

  if (isAuthenticated && currentScreen === 'menu') {
    return (
      <MenuScreen
        activeCardsCount={activeCardsCount}
        bottomInset={bottomInset}
        firstName={login}
        lastName={password}
        notice={notice}
        onHomePress={() => setCurrentScreen('stages')}
        onJournalPress={() => {
          setJournalFilter('important');
          setCurrentScreen('globalJournal');
        }}
        onLogout={handleLogout}
        onMenuAction={(title) => setNotice(`${title}: раздел будет добавлен позже.`)}
        onScheduleWateringReminder={handleScheduleTestWateringReminder}
        onShareData={handleShareData}
        onScanPress={() => setNotice('\u0421\u043a\u0430\u043d\u0435\u0440 \u0431\u0443\u0434\u0435\u0442 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d \u043f\u043e\u0437\u0434\u043d\u0435\u0435.')}
        onTasksPress={openTasks}
        role={currentUser.role}
        taskCount={taskCount}
      />
    );
  }

  if (isAuthenticated && currentScreen === 'tasks') {
    return (
      <TasksScreen
        bottomInset={bottomInset}
        onHomePress={() => setCurrentScreen('stages')}
        onJournalPress={openGlobalJournal}
        onMenuPress={openMenu}
        onScanPress={() => setNotice('\u0421\u043a\u0430\u043d\u0435\u0440 \u0431\u0443\u0434\u0435\u0442 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d \u043f\u043e\u0437\u0434\u043d\u0435\u0435.')}
        onTaskPress={openTaskCard}
        tasks={careTasks}
      />
    );
  }

  if (isAuthenticated) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.homeSafeArea]}>
        <StatusBar style="dark" />
        <ScrollView
          contentContainerStyle={styles.stagesScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stagesScreen}>
            <View style={styles.stageGrid}>
              {stageHomeItems.map((stage) => (
                <Pressable
                  accessibilityRole="button"
                  key={stage.title}
                  onPress={() => handleStagePress(stage.title)}
                  style={({ pressed }) => [
                    styles.stageCard,
                    pressed && styles.stageCardPressed,
                  ]}
                >
                  <View style={[styles.stageIconBox, styles[stage.iconBoxStyle]]}>
                    <StageItemIcon name={stage.iconName} size={44} />
                  </View>
                  <Text style={styles.stageName}>{stage.label}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={handleClearTestData}
              style={({ pressed }) => [
                styles.dangerButton,
                styles.homeClearButton,
                pressed && styles.linkButtonPressed,
              ]}
            >
              <Text style={styles.dangerButtonText}>Зачистить карточки</Text>
            </Pressable>

            {!!notice && <Text style={styles.homeNoticeText}>{notice}</Text>}
            {!!storageError && <Text style={styles.homeErrorText}>{storageError}</Text>}
          </View>
        </ScrollView>

        <BottomTabBar
          activeTab="home"
          bottomInset={bottomInset}
          onHomePress={() => setCurrentScreen('stages')}
          onJournalPress={() => {
            setJournalFilter('important');
            setCurrentScreen('globalJournal');
          }}
          onMenuPress={openMenu}
          onScanPress={() => setNotice('\u0421\u043a\u0430\u043d\u0435\u0440 \u0431\u0443\u0434\u0435\u0442 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d \u043f\u043e\u0437\u0434\u043d\u0435\u0435.')}
          onTasksPress={openTasks}
          taskCount={taskCount}
        />
      </SafeAreaView>
    );
  }

  return (
    <AuthScreen
      error={error}
      firstName={login}
      focusedField={focusedField}
      lastName={password}
      onFirstNameChange={setLogin}
      onFocusedFieldChange={setFocusedField}
      onLastNameChange={setPassword}
      onLogin={handleLogin}
    />
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}
