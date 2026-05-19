import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import plantsCatalog from './data/plantsCatalog';
import styles from './styles';
import {
  BATCH_STATUS_LABELS,
  CUSTOM_REQUIREMENT_OPTION,
  EMPTY_CATALOG_VALUE,
  INTRO_STAGE,
  QR_STATUS_LABELS,
  SOURCE_MATERIAL_OPTIONS,
  STERILITY_STATUS_LABELS,
  currentUser,
  humidityRequirementOptions,
  lightRequirementOptions,
  stages,
  temperatureRequirementOptions,
} from './src/domain/constants';
import {
  dateFromIso,
  formatDisplayDate,
  formatDisplayTime,
  getMonthDays,
  getMonthTitle,
  getTodayIsoDate,
  isoFromDate,
  parseDisplayDate,
} from './src/domain/dates';
import {
  createEmptyCultureForm,
  createEmptyIntroActionForm,
  createEmptyPreventionDraft,
  createEmptyStatusForm,
} from './src/domain/forms';
import {
  canEditIdentityFields,
  createBatchCreatedOperation,
  createQrGeneratedOperation,
  generatePlantingCode,
  getAdaptationStats,
  getCardCurrentQuantity,
  getCardDisplayName,
  getCloneStats,
  getDaysInCurrentStage,
  getNextStage,
  getOperationSummaryItems,
  getQrStatus,
  getStageMoveButtonLabel,
  getStatusOperationItems,
  isPositiveInteger,
} from './src/domain/batch';
import {
  clearCultureCardsForTests,
  loadCultureCardsFromStorage,
  saveCultureCardsToStorage,
} from './src/services/cultureCardsStorage';
import AuthScreen from './src/screens/AuthScreen';
import BottomTabBar from './src/components/BottomTabBar';
import StageHeader from './src/components/StageHeader';

const NativeDateTimePicker = Platform.OS === 'web'
  ? null
  : require('@react-native-community/datetimepicker/src/datetimepicker').default;

const stageHomeItems = [
  {
    icon: require('./assets/img/icon_01.svg'),
    iconBoxStyle: 'stageIconBoxGreen',
    label: 'Введение\nв культуру',
    title: stages[0],
  },
  {
    icon: require('./assets/img/icon_02.svg'),
    iconBoxStyle: 'stageIconBoxMint',
    label: 'Клонирование',
    title: stages[1],
  },
  {
    icon: require('./assets/img/icon_03.svg'),
    iconBoxStyle: 'stageIconBoxAqua',
    label: 'Адаптация',
    title: stages[2],
  },
  {
    icon: require('./assets/img/icon_04.svg'),
    iconBoxStyle: 'stageIconBoxLime',
    label: 'Теплица',
    title: stages[3],
  },
  {
    icon: require('./assets/img/icon_05.svg'),
    iconBoxStyle: 'stageIconBoxSky',
    label: 'Закалка',
    title: stages[4],
  },
  {
    icon: require('./assets/img/icon_06.svg'),
    iconBoxStyle: 'stageIconBoxOrange',
    label: 'Высадка',
    title: stages[5],
  },
];

function getStageRequirementsFromPlant(plant, stage) {
  if (!plant) {
    return {};
  }

  if (stage === 'Адаптация') {
    return {
      temperatureRequirement: plant.adaptationTemperatureRequirement || plant.cloneTemperatureRequirement || '',
      lightRequirement: plant.adaptationLightRequirement || plant.cloneLightRequirement || '',
      humidityRequirement: plant.adaptationHumidityRequirement || '',
      preventionItems: plant.adaptationPreventionItems || [],
    };
  }

  if (stage === 'Клонирование') {
    const preventionName = [
      plant.preventionStimulators,
      plant.preventionChemicals,
    ].filter(Boolean).join('; ');

    return {
      temperatureRequirement: plant.cloneTemperatureRequirement || '',
      lightRequirement: plant.cloneLightRequirement || '',
      humidityRequirement: plant.cloneHumidityRange ? `${plant.cloneHumidityRange}%` : '',
      preventionItems: preventionName
        ? [{
          name: preventionName,
          applicationRate: plant.preventionApplicationRate || '',
          frequency: plant.preventionFrequency || '',
        }]
        : [],
    };
  }

  return {};
}

function findCatalogPlant(card) {
  return plantsCatalog.find((plant) => (
    (plant.cultureName || EMPTY_CATALOG_VALUE) === card.cultureName &&
    (plant.speciesName || EMPTY_CATALOG_VALUE) === card.speciesName &&
    (plant.varietyName || EMPTY_CATALOG_VALUE) === card.varietyName
  ));
}

function getRequirementSelectOptions(recommendedValue, presetOptions) {
  const options = [];

  if (recommendedValue) {
    options.push({
      label: `Рекомендовано: ${recommendedValue}`,
      value: recommendedValue,
    });
  }

  presetOptions
    .filter((option) => option !== recommendedValue)
    .forEach((option) => {
      options.push({ label: option, value: option });
    });

  options.push({
    label: CUSTOM_REQUIREMENT_OPTION,
    value: CUSTOM_REQUIREMENT_OPTION,
  });

  return options;
}

function getGlobalJournalEvents(cards) {
  return cards
    .flatMap((card) => (card.operations || []).map((operation) => ({
      ...operation,
      cardId: card.id,
      cardName: getCardDisplayName(card),
      cardCode: card.code,
      cardStage: card.stage || INTRO_STAGE,
      cultureName: card.cultureName,
      speciesName: card.speciesName,
      varietyName: card.varietyName,
    })))
    .sort((first, second) => (
      new Date(second.createdAt || second.date || 0) - new Date(first.createdAt || first.date || 0)
    ));
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

function QrIcon() {
  return (
    <View style={styles.qrIcon}>
      <View style={styles.qrCorner} />
      <View style={styles.qrDot} />
      <View style={styles.qrCorner} />
      <View style={styles.qrDot} />
      <View style={styles.qrCornerSmall} />
      <View style={styles.qrDot} />
      <View style={styles.qrCorner} />
      <View style={styles.qrDot} />
      <View style={styles.qrCorner} />
    </View>
  );
}

export default function App() {
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
  const [preventionDraft, setPreventionDraft] = useState(createEmptyPreventionDraft);
  const [editingPreventionIndex, setEditingPreventionIndex] = useState(null);
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
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('');

  const editingCard = cultureCards.find((card) => card.id === editingCardId);
  const selectedCard = cultureCards.find((card) => card.id === selectedCardId);
  const isEditingCard = Boolean(editingCardId);
  const canEditCurrentIdentity = canEditIdentityFields(currentUser, editingCard);
  const calendarDays = getMonthDays(calendarMonth);
  const selectedCardOperations = selectedCard?.operations || [];
  const operationDates = new Set(selectedCardOperations.map((operation) => operation.date));
  const selectedCardCurrentQuantity = getCardCurrentQuantity(selectedCard);
  const selectedCardCloneStats = getCloneStats(selectedCard);
  const selectedCardAdaptationStats = getAdaptationStats(selectedCard);
  const selectedCardDaysInStage = getDaysInCurrentStage(selectedCard);
  const selectedDateStatusOperation = selectedCardOperations.find((operation) => (
    operation.type === 'statusChange' && operation.date === selectedCalendarDate
  ));
  const selectedDateOperations = selectedCardOperations.filter((operation) => (
    operation.date === selectedCalendarDate
  ));
  const selectedDateStatusItems = getStatusOperationItems(selectedDateStatusOperation);
  const isCultureIntroStage = selectedStage === 'Введение в культуру';
  const isCloneStage = selectedStage === 'Клонирование';
  const isAdaptationStage = selectedStage === 'Адаптация';
  const hasControlledRequirements = isCloneStage || isAdaptationStage;
  const selectedCatalogPlant = findCatalogPlant(cultureForm);
  const selectedStageRequirements = getStageRequirementsFromPlant(selectedCatalogPlant, selectedStage);
  const temperatureRequirementSelectOptions = getRequirementSelectOptions(
    selectedStageRequirements.temperatureRequirement || '',
    temperatureRequirementOptions,
  );
  const lightRequirementSelectOptions = getRequirementSelectOptions(
    selectedStageRequirements.lightRequirement || '',
    lightRequirementOptions,
  );
  const humidityRequirementSelectOptions = getRequirementSelectOptions(
    selectedStageRequirements.humidityRequirement || '',
    humidityRequirementOptions,
  );
  const isCustomTemperatureRequirement = Boolean(cultureForm.temperatureRequirement) &&
    !temperatureRequirementSelectOptions.some((option) => option.value === cultureForm.temperatureRequirement);
  const isCustomLightRequirement = Boolean(cultureForm.lightRequirement) &&
    !lightRequirementSelectOptions.some((option) => option.value === cultureForm.lightRequirement);
  const isCustomHumidityRequirement = Boolean(cultureForm.humidityRequirement) &&
    !humidityRequirementSelectOptions.some((option) => option.value === cultureForm.humidityRequirement);
  const selectedCardNextStage = getNextStage(selectedCard?.stage || selectedStage);
  const stageMoveButtonLabel = getStageMoveButtonLabel(selectedCardNextStage);
  const showIdentityAsText = isEditingCard;
  const canSaveCultureForm = !isEditingCard || hasControlledRequirements;
  const isSupportedPlantingStage = stages.includes(selectedStage);
  const isSelectedCloneCard = selectedCard?.stage === 'Клонирование';
  const canReleaseQuarantine = ['agronomist', 'admin', 'superadmin'].includes(currentUser.role);
  const globalJournalEvents = getGlobalJournalEvents(cultureCards);
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
    const batchStatus = card.batchStatus || 'active';

    if (card.status === 'cancelled' || card.status === 'archived') {
      return false;
    }

    if (cardStage !== selectedStage) {
      return false;
    }

    if (
      (isCultureIntroStage || isCloneStage || isAdaptationStage) &&
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

    if (card.status === 'cancelled' || card.status === 'archived') {
      return false;
    }

    if (cardStage !== selectedStage) {
      return false;
    }

    return !query || getCardDisplayName(card).toLowerCase().includes(query);
  }).length;

  useEffect(() => {
    loadCultureCards();
  }, []);

  async function loadCultureCards() {
    try {
      const savedCards = await loadCultureCardsFromStorage();
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
      await saveCultureCardsToStorage(nextCards);
      setCultureCards(nextCards);
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
      setCultureForm(createEmptyCultureForm());
      setStatusForm(createEmptyStatusForm());
      setIntroActionForm(createEmptyIntroActionForm());
      setIntroActionType('');
      setCurrentScreen('stages');
      setStorageError('');
      setNotice('Тестовые карточки и журнал очищены.');
    } catch (clearError) {
      setStorageError('Не удалось очистить тестовые данные');
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

  function updatePreventionDraft(field, value) {
    setPreventionDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  }

  function resetPreventionEditor() {
    setPreventionDraft(createEmptyPreventionDraft());
    setEditingPreventionIndex(null);
  }

  function startAddPreventionItem() {
    setPreventionDraft(createEmptyPreventionDraft());
    setEditingPreventionIndex(-1);
  }

  function selectRecommendedPreventionItem(item) {
    setCultureForm((currentForm) => ({
      ...currentForm,
      preventionItems: [item],
    }));
    resetPreventionEditor();
    setOpenDropdown('');
  }

  function startEditPreventionItem(index) {
    setPreventionDraft(cultureForm.preventionItems[index] || createEmptyPreventionDraft());
    setEditingPreventionIndex(index);
  }

  function savePreventionItem() {
    const nextItem = {
      name: preventionDraft.name.trim(),
      applicationRate: preventionDraft.applicationRate.trim(),
      frequency: preventionDraft.frequency.trim(),
    };

    if (!nextItem.name && !nextItem.applicationRate && !nextItem.frequency) {
      resetPreventionEditor();
      return;
    }

    setCultureForm((currentForm) => {
      const currentItems = currentForm.preventionItems || [];
      const nextItems = editingPreventionIndex >= 0
        ? currentItems.map((item, index) => (index === editingPreventionIndex ? nextItem : item))
        : [...currentItems, nextItem];

      return {
        ...currentForm,
        preventionItems: nextItems,
      };
    });
    resetPreventionEditor();
  }

  function openCultureForm() {
    setCultureForm(createEmptyCultureForm());
    setFormError('');
    resetPreventionEditor();
    setShowDatePicker(false);
    setOpenDropdown('');
    setTouchedSubmit(false);
    setEditingCardId(null);
    setCurrentScreen('cultureForm');
  }

  function openEditCultureForm(card) {
    const catalogPlant = findCatalogPlant(card);
    const stageRequirements = getStageRequirementsFromPlant(catalogPlant, card.stage);

    setCultureForm({
      ...createEmptyCultureForm(),
      ...card,
      temperatureRequirement: card.temperatureRequirement || stageRequirements.temperatureRequirement || '',
      lightRequirement: card.lightRequirement || stageRequirements.lightRequirement || '',
      humidityRequirement: card.humidityRequirement || stageRequirements.humidityRequirement || '',
      preventionItems: card.preventionItems || stageRequirements.preventionItems || [],
      qrPrinted: card.qrPrinted || false,
      qrPrintedAt: card.qrPrintedAt || null,
      qrPrintedBy: card.qrPrintedBy || null,
    });
    setFormError('');
    resetPreventionEditor();
    setShowDatePicker(false);
    setOpenDropdown('');
    setTouchedSubmit(false);
    setEditingCardId(card.id);
    setCurrentScreen('cultureForm');
  }

  function openCultureCalendar(card) {
    setSelectedCardId(card.id);
    setSelectedCalendarDate('');
    setCalendarMonth(card.createdAt ? dateFromIso(card.createdAt) : new Date());
    setCurrentScreen('cultureCalendar');
  }

  function closeCultureForm() {
    setCultureForm(createEmptyCultureForm());
    setFormError('');
    resetPreventionEditor();
    setShowDatePicker(false);
    setOpenDropdown('');
    setTouchedSubmit(false);
    setEditingCardId(null);
    setCurrentScreen('cultureList');
  }

  function closeCultureCalendar() {
    setSelectedCardId(null);
    setSelectedCalendarDate('');
    setIntroActionType('');
    setIntroActionForm(createEmptyIntroActionForm());
    setStageActionError('');
    setCurrentScreen('cultureList');
  }

  function openStatusChangeForm() {
    if (!selectedCard || !selectedCalendarDate) {
      return;
    }

    setStatusForm(createEmptyStatusForm());
    setIntroActionType(selectedCard.stage === 'Адаптация' ? 'adaptationStress' : 'rooting');
    setStatusFormError('');
    setStatusFormNotice('');
    setCurrentScreen('statusChangeForm');
  }

  function closeStatusChangeForm() {
    setStatusForm(createEmptyStatusForm());
    setStatusFormError('');
    setStatusFormNotice('');
    setIntroActionType('');
    setCurrentScreen('cultureCalendar');
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
      temperatureRequirement: '',
      lightRequirement: '',
      humidityRequirement: '',
      preventionItems: [],
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
      temperatureRequirement: '',
      lightRequirement: '',
      humidityRequirement: '',
      preventionItems: [],
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
    const stageRequirements = getStageRequirementsFromPlant(selectedPlant, selectedStage);

    setCultureForm((currentForm) => ({
      ...currentForm,
      varietyName,
      sourcePlantName: selectedPlant?.originalName || '',
      temperatureRequirement: stageRequirements.temperatureRequirement || currentForm.temperatureRequirement,
      lightRequirement: stageRequirements.lightRequirement || currentForm.lightRequirement,
      humidityRequirement: stageRequirements.humidityRequirement || currentForm.humidityRequirement,
      preventionItems: stageRequirements.preventionItems || currentForm.preventionItems,
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

      const catalogPlant = findCatalogPlant(card);
      const stageRequirements = getStageRequirementsFromPlant(catalogPlant, nextStage);

      return {
        ...card,
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
        temperatureRequirement: nextStage === 'Адаптация'
          ? stageRequirements.temperatureRequirement || card.temperatureRequirement || ''
          : card.temperatureRequirement || stageRequirements.temperatureRequirement || '',
        lightRequirement: nextStage === 'Адаптация'
          ? stageRequirements.lightRequirement || card.lightRequirement || ''
          : card.lightRequirement || stageRequirements.lightRequirement || '',
        humidityRequirement: nextStage === 'Адаптация'
          ? stageRequirements.humidityRequirement || card.humidityRequirement || ''
          : card.humidityRequirement || stageRequirements.humidityRequirement || '',
        preventionItems: nextStage === 'Адаптация'
          ? stageRequirements.preventionItems || card.preventionItems || []
          : card.preventionItems || stageRequirements.preventionItems || [],
        operations: [nextOperation, ...(card.operations || [])],
      };
    });

    await saveCultureCards(nextCards);
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
        title: 'Стресс / состояние',
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
    }[introActionType || 'rooting'];
    const count = eventConfig.countField ? statusForm[eventConfig.countField].trim() : '';
    const currentQuantity = getCardCurrentQuantity(selectedCard);

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

      if ((selectedCard.batchStatus || 'active') !== 'quarantine') {
        setStatusFormError('Партия не находится в карантине');
        return;
      }
    }

    if (introActionType === 'adaptationStress' && !statusForm.stressLevel.trim()) {
      setStatusFormError('Укажите уровень стресса');
      return;
    }

    if (introActionType === 'adaptationEnvironment' && ![
      statusForm.environmentTemperature,
      statusForm.environmentAirHumidity,
      statusForm.environmentHumidity,
      statusForm.substrateHumidity,
      statusForm.environmentLight,
      statusForm.ventilation,
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

    const nextOperation = {
      id: `${Date.now()}`,
      type: introActionType || 'rooting',
      title: eventConfig.title,
      date: selectedCalendarDate,
      ...(count ? { count } : {}),
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
          conditionDescription: statusForm.conditionDescription.trim(),
          reason: statusForm.reason.trim(),
          turgor: statusForm.turgor.trim(),
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
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id,
    };
    const nextCards = cultureCards.map((card) => {
      if (card.id !== selectedCard.id) {
        return card;
      }

      const nextOperations = [nextOperation, ...(card.operations || [])];
      const nextCard = {
        ...card,
        operations: nextOperations,
      };
      const nextQuantity = getCardCurrentQuantity(nextCard);

      return {
        ...nextCard,
        batchStatus: introActionType === 'sale' && nextQuantity === 0
          ? 'sold'
          : introActionType === 'quarantine'
            ? 'quarantine'
          : introActionType === 'quarantineReleased'
            ? 'active'
          : introActionType === 'adaptationStress' && statusForm.stressLevel === 'Критический'
            ? 'problem'
          : introActionType === 'sale'
            ? 'partial'
            : card.batchStatus || 'active',
        status: introActionType === 'sale' && nextQuantity === 0
          ? 'archived'
          : card.status || 'active',
      };
    });

    await saveCultureCards(nextCards);
    setStatusForm(createEmptyStatusForm());
    setStatusFormError('');
    setStatusFormNotice('Событие сохранено. Можно добавить следующее.');
  }

  async function handleSaveIntroAction() {
    if (!selectedCard || !selectedCalendarDate || !introActionType) {
      return;
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
    const value = introActionForm[actionConfig.field].trim();

    if (!value) {
      setStageActionError(actionConfig.error);
      return;
    }

    const nextOperation = {
      id: `${actionConfig.type}-${Date.now()}`,
      type: actionConfig.type,
      title: actionConfig.title,
      date: selectedCalendarDate,
      [actionConfig.field]: value,
      createdAt: nowIso,
      createdBy: currentUser.id,
    };
    const nextCards = cultureCards.map((card) => {
      if (card.id !== selectedCard.id) {
        return card;
      }

      return {
        ...card,
        batchStatus: introActionType === 'quarantine' ? 'quarantine' : card.batchStatus || 'active',
        sterilityStatus: introActionType === 'contamination' ? 'contaminated' : card.sterilityStatus || 'unchecked',
        operations: [nextOperation, ...(card.operations || [])],
      };
    });

    await saveCultureCards(nextCards);
    setIntroActionForm(createEmptyIntroActionForm());
    setIntroActionType('');
    setStageActionError('');
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
    const temperatureRequirement = cultureForm.temperatureRequirement.trim();
    const lightRequirement = cultureForm.lightRequirement.trim();
    const humidityRequirement = cultureForm.humidityRequirement.trim();
    const isDuplicateCode = cultureCards.some((card) => (
      card.id !== editingCardId &&
      (card.code || '').trim().toLowerCase() === code.toLowerCase()
    ));
    const isMissingCloneField = isCloneStage && (!temperatureRequirement || !lightRequirement || !humidityRequirement);
    const isMissingAdaptationField = isAdaptationStage &&
      (!temperatureRequirement || !lightRequirement || !humidityRequirement);

    if (
      !createdAt ||
      !cultureName ||
      !speciesName ||
      !varietyName ||
      !code ||
      !quantity ||
      (isCultureIntroStage && !sourceMaterial) ||
      isMissingCloneField ||
      isMissingAdaptationField
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
    const stageSettingsChanged = Boolean(editingCardId && editingCard && (
      (editingCard.temperatureRequirement || '') !== temperatureRequirement ||
      (editingCard.lightRequirement || '') !== lightRequirement ||
      (editingCard.humidityRequirement || '') !== humidityRequirement ||
      JSON.stringify(editingCard.preventionItems || []) !== JSON.stringify(cultureForm.preventionItems || [])
    ));
    const stageSettingsOperation = stageSettingsChanged
      ? {
        id: `settings-${Date.now()}`,
        type: 'stageSettingsUpdated',
        title: 'Изменение настроек стадии',
        date: getTodayIsoDate(),
        createdAt: nowIso,
        createdBy: currentUser.id,
        stage: selectedStage,
        temperatureRequirement,
        lightRequirement,
        humidityRequirement,
        preventionItems: cultureForm.preventionItems || [],
      }
      : null;
    const batchCreatedOperation = createBatchCreatedOperation({
      createdAt,
      stage: selectedStage,
      quantity,
      code,
      createdBy: currentUser.id,
    }, nowIso);
    const qrGeneratedOperation = createQrGeneratedOperation({
      id: editingCardId || `${Date.now()}`,
      createdAt,
      code,
      qrStatus,
    }, nowIso);
    const nextOperations = editingCardId
      ? [
        ...(stageSettingsOperation ? [stageSettingsOperation] : []),
        ...(cultureForm.operations || []),
      ]
      : [qrGeneratedOperation, batchCreatedOperation];

    const nextCard = {
      ...cultureForm,
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
      temperatureRequirement,
      lightRequirement,
      humidityRequirement,
      preventionItems: cultureForm.preventionItems || [],
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.cardsScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.cardsScreen}>
              <View style={styles.stagesTopBar}>
                <Pressable
                  accessibilityRole="button"
                  onPress={closeCultureForm}
                  style={({ pressed }) => [
                    styles.backButton,
                    pressed && styles.linkButtonPressed,
                  ]}
                >
                  <Text style={styles.backButtonText}>Назад</Text>
                </Pressable>
              </View>

              <View style={styles.cardsHeader}>
                <Text style={styles.cardsTitle}>
                  {isEditingCard && hasControlledRequirements
                    ? 'Паспорт и настройки'
                    : isEditingCard
                      ? 'Паспорт партии'
                      : isCultureIntroStage
                        ? 'Создать партию'
                        : 'Добавить карточку'}
                </Text>
                <Text style={styles.cardsSubtitle}>{selectedStage}</Text>
              </View>

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
                  <Text style={styles.label}>Название культуры *</Text>
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
                  <Text style={styles.label}>Название вида *</Text>
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
                  <Text style={styles.label}>Название сорта *</Text>
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
                      <Text style={styles.label}>Источник материала *</Text>
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
                            !cultureForm.sourceMaterial ||
                            !SOURCE_MATERIAL_OPTIONS.includes(cultureForm.sourceMaterial)
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
                      <Text style={styles.label}>Родительская партия</Text>
                      {showIdentityAsText ? (
                        <Text style={styles.readonlyValue}>{cultureForm.parentBatch || 'Не указана'}</Text>
                      ) : (
                        <TextInput
                          onChangeText={(value) => updateCultureForm('parentBatch', value)}
                          placeholder="Код родительской партии, если есть"
                          placeholderTextColor="#7C8A80"
                          style={styles.input}
                          value={cultureForm.parentBatch}
                        />
                      )}
                    </View>

                    {showIdentityAsText && (
                      <View style={styles.field}>
                        <Text style={styles.label}>Статус стерильности</Text>
                        <Text style={styles.readonlyValue}>
                          {STERILITY_STATUS_LABELS[cultureForm.sterilityStatus] || cultureForm.sterilityStatus}
                        </Text>
                      </View>
                    )}

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
                        <Text style={styles.label}>Статус партии *</Text>
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
                        </Pressable>

                        {openDropdown === 'batchStatus' && (
                          <View style={styles.dropdownList}>
                            <ScrollView nestedScrollEnabled>
                              {Object.entries(BATCH_STATUS_LABELS).map(([value, label]) => (
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

                {hasControlledRequirements && (
                  <>
                    <View style={styles.field}>
                      <Text style={styles.label}>Требование к температурному режиму *</Text>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setOpenDropdown(
                          openDropdown === 'temperatureRequirement' ? '' : 'temperatureRequirement',
                        )}
                        style={[
                          styles.selectButton,
                          isRequiredFieldMissing('temperatureRequirement') && styles.inputInvalid,
                        ]}
                      >
                        <Text
                          style={[
                            styles.selectButtonText,
                            !cultureForm.temperatureRequirement && styles.selectPlaceholder,
                          ]}
                        >
                          {cultureForm.temperatureRequirement || 'Выберите температурный режим'}
                        </Text>
                      </Pressable>

                      {openDropdown === 'temperatureRequirement' && (
                        <View style={styles.dropdownList}>
                          <ScrollView nestedScrollEnabled>
                            {temperatureRequirementSelectOptions.map((option) => (
                              <Pressable
                                accessibilityRole="button"
                                key={option.label}
                                onPress={() => {
                                  if (option.value === CUSTOM_REQUIREMENT_OPTION) {
                                    updateCultureForm('temperatureRequirement', '');
                                    setOpenDropdown('temperatureRequirementCustom');
                                    return;
                                  }

                                  updateCultureForm('temperatureRequirement', option.value);
                                  setOpenDropdown('');
                                }}
                                style={({ pressed }) => [
                                  styles.dropdownItem,
                                  pressed && styles.linkButtonPressed,
                                ]}
                              >
                                <Text style={styles.dropdownItemText}>{option.label}</Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                        </View>
                      )}

                      {(openDropdown === 'temperatureRequirementCustom' || isCustomTemperatureRequirement) && (
                        <TextInput
                          onChangeText={(value) => updateCultureForm('temperatureRequirement', value)}
                          placeholder="Введите свой температурный режим"
                          placeholderTextColor="#7C8A80"
                          style={[
                            styles.input,
                            isRequiredFieldMissing('temperatureRequirement') && styles.inputInvalid,
                          ]}
                          value={cultureForm.temperatureRequirement}
                        />
                      )}
                    </View>

                    <View style={styles.field}>
                      <Text style={styles.label}>Требование к освещенности *</Text>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setOpenDropdown(
                          openDropdown === 'lightRequirement' ? '' : 'lightRequirement',
                        )}
                        style={[
                          styles.selectButton,
                          isRequiredFieldMissing('lightRequirement') && styles.inputInvalid,
                        ]}
                      >
                        <Text
                          style={[
                            styles.selectButtonText,
                            !cultureForm.lightRequirement && styles.selectPlaceholder,
                          ]}
                        >
                          {cultureForm.lightRequirement || 'Выберите режим освещенности'}
                        </Text>
                      </Pressable>

                      {openDropdown === 'lightRequirement' && (
                        <View style={styles.dropdownList}>
                          <ScrollView nestedScrollEnabled>
                            {lightRequirementSelectOptions.map((option) => (
                              <Pressable
                                accessibilityRole="button"
                                key={option.label}
                                onPress={() => {
                                  if (option.value === CUSTOM_REQUIREMENT_OPTION) {
                                    updateCultureForm('lightRequirement', '');
                                    setOpenDropdown('lightRequirementCustom');
                                    return;
                                  }

                                  updateCultureForm('lightRequirement', option.value);
                                  setOpenDropdown('');
                                }}
                                style={({ pressed }) => [
                                  styles.dropdownItem,
                                  pressed && styles.linkButtonPressed,
                                ]}
                              >
                                <Text style={styles.dropdownItemText}>{option.label}</Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                        </View>
                      )}

                      {(openDropdown === 'lightRequirementCustom' || isCustomLightRequirement) && (
                        <TextInput
                          onChangeText={(value) => updateCultureForm('lightRequirement', value)}
                          placeholder="Введите свой режим освещенности"
                          placeholderTextColor="#7C8A80"
                          style={[
                            styles.input,
                            isRequiredFieldMissing('lightRequirement') && styles.inputInvalid,
                          ]}
                          value={cultureForm.lightRequirement}
                        />
                      )}
                    </View>

                    <View style={styles.field}>
                      <Text style={styles.label}>{isCloneStage ? 'Требование к влажности *' : 'Требование к влажности воздуха *'}</Text>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setOpenDropdown(
                          openDropdown === 'humidityRequirement' ? '' : 'humidityRequirement',
                        )}
                        style={[
                          styles.selectButton,
                          isRequiredFieldMissing('humidityRequirement') && styles.inputInvalid,
                        ]}
                      >
                        <Text
                          style={[
                            styles.selectButtonText,
                            !cultureForm.humidityRequirement && styles.selectPlaceholder,
                          ]}
                        >
                          {cultureForm.humidityRequirement || 'Выберите влажность'}
                        </Text>
                      </Pressable>

                      {openDropdown === 'humidityRequirement' && (
                        <View style={styles.dropdownList}>
                          <ScrollView nestedScrollEnabled>
                            {humidityRequirementSelectOptions.map((option) => (
                              <Pressable
                                accessibilityRole="button"
                                key={option.label}
                                onPress={() => {
                                  if (option.value === CUSTOM_REQUIREMENT_OPTION) {
                                    updateCultureForm('humidityRequirement', '');
                                    setOpenDropdown('humidityRequirementCustom');
                                    return;
                                  }

                                  updateCultureForm('humidityRequirement', option.value);
                                  setOpenDropdown('');
                                }}
                                style={({ pressed }) => [
                                  styles.dropdownItem,
                                  pressed && styles.linkButtonPressed,
                                ]}
                              >
                                <Text style={styles.dropdownItemText}>{option.label}</Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                        </View>
                      )}

                      {(openDropdown === 'humidityRequirementCustom' || isCustomHumidityRequirement) && (
                        <TextInput
                          onChangeText={(value) => updateCultureForm('humidityRequirement', value)}
                          placeholder="Введите свою влажность"
                          placeholderTextColor="#7C8A80"
                          style={[
                            styles.input,
                            isRequiredFieldMissing('humidityRequirement') && styles.inputInvalid,
                          ]}
                          value={cultureForm.humidityRequirement}
                        />
                      )}
                    </View>

                    <View style={styles.field}>
                      <Text style={styles.label}>{isCloneStage ? 'Стимуляторы и препараты' : 'Требование к профилактике'}</Text>

                          <Pressable
                            accessibilityRole="button"
                            onPress={() => setOpenDropdown(
                              openDropdown === 'preventionRequirement' ? '' : 'preventionRequirement',
                            )}
                            style={styles.selectButton}
                          >
                            <Text
                              style={[
                                styles.selectButtonText,
                                !(cultureForm.preventionItems || []).length && styles.selectPlaceholder,
                              ]}
                            >
                              {(cultureForm.preventionItems || [])[0]?.name || 'Выберите профилактику'}
                            </Text>
                          </Pressable>

                          {openDropdown === 'preventionRequirement' && (
                            <View style={styles.dropdownList}>
                              <ScrollView nestedScrollEnabled>
                                {(selectedStageRequirements.preventionItems || []).map((item, index) => (
                                  <Pressable
                                    accessibilityRole="button"
                                    key={`${item.name}-${index}`}
                                    onPress={() => selectRecommendedPreventionItem(item)}
                                    style={({ pressed }) => [
                                      styles.dropdownItem,
                                      pressed && styles.linkButtonPressed,
                                    ]}
                                  >
                                    <Text style={styles.dropdownItemText}>{item.name}</Text>
                                    {!!item.applicationRate && (
                                      <Text style={styles.dropdownItemMeta}>Норма: {item.applicationRate}</Text>
                                    )}
                                    {!!item.frequency && (
                                      <Text style={styles.dropdownItemMeta}>Периодичность: {item.frequency}</Text>
                                    )}
                                  </Pressable>
                                ))}
                                <Pressable
                                  accessibilityRole="button"
                                  onPress={startAddPreventionItem}
                                  style={({ pressed }) => [
                                    styles.dropdownItem,
                                    pressed && styles.linkButtonPressed,
                                  ]}
                                >
                                  <Text style={styles.dropdownItemText}>Свое значение</Text>
                                </Pressable>
                              </ScrollView>
                            </View>
                          )}

                          {(cultureForm.preventionItems || []).map((item, index) => (
                            <View key={`${item.name}-${index}`} style={styles.preventionItem}>
                              <Text style={styles.preventionItemTitle}>{item.name || 'Без названия'}</Text>
                              {!!item.applicationRate && (
                                <Text style={styles.preventionItemText}>Норма: {item.applicationRate}</Text>
                              )}
                              {!!item.frequency && (
                                <Text style={styles.preventionItemText}>Периодичность: {item.frequency}</Text>
                              )}
                              <View style={styles.inlineActions}>
                                <Pressable
                                  accessibilityRole="button"
                                  onPress={() => startEditPreventionItem(index)}
                                  style={({ pressed }) => [
                                    styles.inlineActionButton,
                                    pressed && styles.linkButtonPressed,
                                  ]}
                                >
                                  <Text style={styles.inlineActionButtonText}>Изменить</Text>
                                </Pressable>
                              </View>
                            </View>
                          ))}

                          {editingPreventionIndex !== null && (
                            <View style={styles.preventionEditor}>
                              <TextInput
                                onChangeText={(value) => updatePreventionDraft('name', value)}
                                placeholder="Название"
                                placeholderTextColor="#7C8A80"
                                style={styles.input}
                                value={preventionDraft.name}
                              />
                              <TextInput
                                onChangeText={(value) => updatePreventionDraft('applicationRate', value)}
                                placeholder="Норма внесения"
                                placeholderTextColor="#7C8A80"
                                style={styles.input}
                                value={preventionDraft.applicationRate}
                              />
                              <TextInput
                                onChangeText={(value) => updatePreventionDraft('frequency', value)}
                                placeholder="Периодичность внесения"
                                placeholderTextColor="#7C8A80"
                                style={styles.input}
                                value={preventionDraft.frequency}
                              />
                              <View style={styles.inlineActions}>
                                <Pressable
                                  accessibilityRole="button"
                                  onPress={savePreventionItem}
                                  style={({ pressed }) => [
                                    styles.inlineActionButton,
                                    pressed && styles.linkButtonPressed,
                                  ]}
                                >
                                  <Text style={styles.inlineActionButtonText}>Сохранить</Text>
                                </Pressable>
                                <Pressable
                                  accessibilityRole="button"
                                  onPress={resetPreventionEditor}
                                  style={({ pressed }) => [
                                    styles.inlineDangerButton,
                                    pressed && styles.linkButtonPressed,
                                  ]}
                                >
                                  <Text style={styles.inlineDangerButtonText}>Отменить</Text>
                                </Pressable>
                              </View>
                            </View>
                          )}
                        </View>
                  </>
                )}

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
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.calendarScreen}>
          <View style={styles.fixedCardsHeader}>
            <View style={styles.stagesTopBar}>
              <Pressable
                accessibilityRole="button"
                onPress={closeCultureCalendar}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.linkButtonPressed,
                ]}
              >
                <Text style={styles.backButtonText}>Назад</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => openEditCultureForm(selectedCard)}
                style={({ pressed }) => [
                  styles.codeButton,
                  pressed && styles.pressedButton,
                ]}
              >
                <Text style={styles.codeButtonText}>Ещё</Text>
              </Pressable>
            </View>

            <View style={styles.cardsHeader}>
              <Text style={styles.cardsTitle}>{getCardDisplayName(selectedCard)}</Text>
              {!!selectedCard.stageChangedAt && (
                <Text style={styles.cardsSubtitle}>
                  Дата перехода в стадию: {formatDisplayDate(selectedCard.stageChangedAt)}
                </Text>
              )}
              <Text style={styles.cardsSubtitle}>
                Дата создания: {formatDisplayDate(selectedCard.createdAt)}
              </Text>
              <Text style={styles.cardsSubtitle}>
                Код: {selectedCard.code}
              </Text>
              <Text style={styles.cardsSubtitle}>
                QR: {QR_STATUS_LABELS[getQrStatus(selectedCard)] || getQrStatus(selectedCard)}
              </Text>
              <Text style={styles.cardsSubtitle}>
                Текущий остаток: {selectedCardCurrentQuantity} шт.
              </Text>
              <Text style={styles.cardsSubtitle}>
                Дней на стадии: {selectedCardDaysInStage}
              </Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.calendarContent}>
            {selectedCard.stage === 'Введение в культуру' && (
              <View style={styles.passportPanel}>
                <Text style={styles.passportTitle}>Паспорт партии</Text>
                <View style={styles.passportRow}>
                  <Text style={styles.passportLabel}>Культура</Text>
                  <Text style={styles.passportValue}>{selectedCard.cultureName}</Text>
                </View>
                <View style={styles.passportRow}>
                  <Text style={styles.passportLabel}>Вид</Text>
                  <Text style={styles.passportValue}>{selectedCard.speciesName}</Text>
                </View>
                <View style={styles.passportRow}>
                  <Text style={styles.passportLabel}>Сорт</Text>
                  <Text style={styles.passportValue}>{selectedCard.varietyName}</Text>
                </View>
                <View style={styles.passportRow}>
                  <Text style={styles.passportLabel}>Исходное количество</Text>
                  <Text style={styles.passportValue}>{selectedCard.quantity} шт.</Text>
                </View>
                <View style={styles.passportRow}>
                  <Text style={styles.passportLabel}>Гормон</Text>
                  <Text style={styles.passportValue}>{selectedCard.hasHormone ? 'Есть' : 'Нет'}</Text>
                </View>
                <View style={styles.passportRow}>
                  <Text style={styles.passportLabel}>Источник материала</Text>
                  <Text style={styles.passportValue}>{selectedCard.sourceMaterial || 'Не указан'}</Text>
                </View>
                <View style={styles.passportRow}>
                  <Text style={styles.passportLabel}>Родительская партия</Text>
                  <Text style={styles.passportValue}>{selectedCard.parentBatch || 'Не указана'}</Text>
                </View>
                <View style={styles.passportRow}>
                  <Text style={styles.passportLabel}>Статус стерильности</Text>
                  <Text style={styles.passportValue}>
                    {STERILITY_STATUS_LABELS[selectedCard.sterilityStatus || 'unchecked'] || selectedCard.sterilityStatus}
                  </Text>
                </View>
                <View style={styles.passportRow}>
                  <Text style={styles.passportLabel}>Статус партии</Text>
                  <Text style={styles.passportValue}>
                    {BATCH_STATUS_LABELS[selectedCard.batchStatus || 'active'] || selectedCard.batchStatus}
                  </Text>
                </View>
                <View style={styles.passportRow}>
                  <Text style={styles.passportLabel}>Стартовое фото</Text>
                  <Text style={styles.passportValue}>{selectedCard.startPhotoNote || 'Не добавлено'}</Text>
                </View>
              </View>
            )}

            {selectedCard.stage === 'Клонирование' && (
              <>
                <View style={styles.passportPanel}>
                  <Text style={styles.passportTitle}>Состояние партии</Text>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Исходное количество</Text>
                    <Text style={styles.passportValue}>{selectedCardCloneStats.initialQuantity} шт.</Text>
                  </View>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Текущий остаток</Text>
                    <Text style={styles.passportValue}>{selectedCardCloneStats.currentQuantity} шт.</Text>
                  </View>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Укоренено</Text>
                    <Text style={styles.passportValue}>
                      {selectedCardCloneStats.rootedCount} шт. / {selectedCardCloneStats.rootingPercent}%
                    </Text>
                  </View>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Продано</Text>
                    <Text style={styles.passportValue}>{selectedCardCloneStats.saleCount} шт.</Text>
                  </View>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Размножение</Text>
                    <Text style={styles.passportValue}>{selectedCardCloneStats.propagationCount} шт.</Text>
                  </View>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Гибель</Text>
                    <Text style={styles.passportValue}>{selectedCardCloneStats.deathCount} шт.</Text>
                  </View>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Выбраковка</Text>
                    <Text style={styles.passportValue}>{selectedCardCloneStats.discardCount} шт.</Text>
                  </View>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Потери</Text>
                    <Text style={styles.passportValue}>
                      {selectedCardCloneStats.lossCount} шт. / {selectedCardCloneStats.lossPercent}%
                    </Text>
                  </View>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Статус риска</Text>
                    <Text style={styles.passportValue}>{selectedCardCloneStats.riskStatus}</Text>
                  </View>
                </View>

                <View style={styles.passportPanel}>
                  <Text style={styles.passportTitle}>Рекомендации из Excel</Text>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Температура</Text>
                    <Text style={styles.passportValue}>{selectedCard.temperatureRequirement || 'Нет данных'}</Text>
                  </View>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Влажность</Text>
                    <Text style={styles.passportValue}>
                      {selectedCard.humidityRequirement ||
                      (findCatalogPlant(selectedCard)?.cloneHumidityRange
                        ? `${findCatalogPlant(selectedCard).cloneHumidityRange}%`
                        : 'Нет данных')}
                    </Text>
                  </View>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Освещенность</Text>
                    <Text style={styles.passportValue}>{selectedCard.lightRequirement || 'Нет данных'}</Text>
                  </View>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Световой режим</Text>
                    <Text style={styles.passportValue}>
                      {findCatalogPlant(selectedCard)?.clonePhotoperiodRange
                        ? `${findCatalogPlant(selectedCard).clonePhotoperiodRange} ч/сутки`
                        : 'Нет данных'}
                    </Text>
                  </View>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Стимуляторы и препараты</Text>
                    <Text style={styles.passportValue}>
                      {(selectedCard.preventionItems || []).map((item) => item.name).filter(Boolean).join('; ') ||
                        [
                          findCatalogPlant(selectedCard)?.preventionStimulators,
                          findCatalogPlant(selectedCard)?.preventionChemicals,
                        ].filter(Boolean).join('; ') ||
                        'Нет данных'}
                    </Text>
                  </View>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Нормы внесения</Text>
                    <Text style={styles.passportValue}>
                      {(selectedCard.preventionItems || []).map((item) => item.applicationRate).filter(Boolean).join('; ') ||
                        findCatalogPlant(selectedCard)?.preventionApplicationRate ||
                        'Нет данных'}
                    </Text>
                  </View>
                </View>
              </>
            )}

            {selectedCard.stage === 'Адаптация' && (
              <>
                <View style={styles.passportPanel}>
                  <Text style={styles.passportTitle}>Состояние адаптации</Text>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Исходное количество</Text>
                    <Text style={styles.passportValue}>{selectedCardAdaptationStats.initialQuantity} шт.</Text>
                  </View>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Текущий остаток</Text>
                    <Text style={styles.passportValue}>{selectedCardAdaptationStats.currentQuantity} шт.</Text>
                  </View>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Приживаемость</Text>
                    <Text style={styles.passportValue}>{selectedCardAdaptationStats.survivalPercent}%</Text>
                  </View>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Потери</Text>
                    <Text style={styles.passportValue}>{selectedCardAdaptationStats.lossCount} шт.</Text>
                  </View>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Продано</Text>
                    <Text style={styles.passportValue}>{selectedCardAdaptationStats.saleCount} шт.</Text>
                  </View>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Гибель</Text>
                    <Text style={styles.passportValue}>{selectedCardAdaptationStats.deathCount} шт.</Text>
                  </View>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Выбраковка</Text>
                    <Text style={styles.passportValue}>{selectedCardAdaptationStats.discardCount} шт.</Text>
                  </View>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Стресс</Text>
                    <Text style={styles.passportValue}>{selectedCardAdaptationStats.stressLevel}</Text>
                  </View>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Тургор</Text>
                    <Text style={styles.passportValue}>{selectedCardAdaptationStats.turgor}</Text>
                  </View>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Стабильность</Text>
                    <Text style={styles.passportValue}>{selectedCardAdaptationStats.stability}</Text>
                  </View>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Статус риска</Text>
                    <Text style={styles.passportValue}>{selectedCardAdaptationStats.riskStatus}</Text>
                  </View>
                </View>

                <View style={styles.passportPanel}>
                  <Text style={styles.passportTitle}>Рекомендации из Excel</Text>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Температура</Text>
                    <Text style={styles.passportValue}>{selectedCard.temperatureRequirement || 'Нет данных'}</Text>
                  </View>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Влажность воздуха</Text>
                    <Text style={styles.passportValue}>{selectedCard.humidityRequirement || 'Нет данных'}</Text>
                  </View>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Освещенность</Text>
                    <Text style={styles.passportValue}>{selectedCard.lightRequirement || 'Нет данных'}</Text>
                  </View>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Профилактика / лечение</Text>
                    <Text style={styles.passportValue}>
                      {(selectedCard.preventionItems || []).map((item) => item.name).filter(Boolean).join('; ') || 'Нет данных'}
                    </Text>
                  </View>
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>Снижение стресса</Text>
                    <Text style={styles.passportValue}>Постепенно снижать влажность, контролировать тургор и реакцию на свет.</Text>
                  </View>
                </View>
              </>
            )}

            <View style={styles.monthBar}>
              <Pressable
                accessibilityRole="button"
                onPress={() => changeCalendarMonth(-1)}
                style={({ pressed }) => [
                  styles.monthButton,
                  pressed && styles.linkButtonPressed,
                ]}
              >
                <Text style={styles.monthButtonText}>Предыдущий</Text>
              </Pressable>

              <Text style={styles.monthTitle}>{getMonthTitle(calendarMonth)}</Text>

              <Pressable
                accessibilityRole="button"
                onPress={() => changeCalendarMonth(1)}
                style={({ pressed }) => [
                  styles.monthButton,
                  pressed && styles.linkButtonPressed,
                ]}
              >
                <Text style={styles.monthButtonText}>Следующий</Text>
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((dayName) => (
                <Text key={dayName} style={styles.weekDay}>{dayName}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarDays.map((date, index) => {
                const isoDate = date ? isoFromDate(date) : '';
                const hasOperation = operationDates.has(isoDate);
                const isSelected = selectedCalendarDate === isoDate;

                return (
                  <Pressable
                    accessibilityRole="button"
                    disabled={!date}
                    key={`${isoDate}-${index}`}
                    onPress={() => setSelectedCalendarDate(isoDate)}
                    style={[
                      styles.dayCell,
                      !date && styles.dayCellEmpty,
                      hasOperation && styles.dayCellMarked,
                      isSelected && styles.dayCellSelected,
                    ]}
                  >
                    {!!date && (
                      <Text
                        style={[
                          styles.dayCellText,
                          (hasOperation || isSelected) && styles.dayCellTextMarked,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {!!selectedCalendarDate && (
              <View style={styles.dateActionPanel}>
                <Text style={styles.dateActionTitle}>
                  {formatDisplayDate(selectedCalendarDate)}
                </Text>

                {!!selectedDateStatusItems.length && (
                  <View style={styles.statusSummary}>
                    <Text style={styles.statusSummaryTitle}>Изменение статуса</Text>
                    {selectedDateStatusItems.map(([label, value]) => (
                      <Text key={label} style={styles.statusSummaryText}>
                        {label}: {value} шт.
                      </Text>
                    ))}
                  </View>
                )}

                {selectedDateOperations
                  .filter((operation) => operation.type !== 'statusChange')
                  .map((operation) => (
                    <View key={operation.id} style={styles.statusSummary}>
                      <Text style={styles.statusSummaryTitle}>{operation.title}</Text>
                      {getOperationSummaryItems(operation).map(([label, value]) => (
                        <Text key={label} style={styles.statusSummaryText}>
                          {label}: {value}
                        </Text>
                      ))}
                    </View>
                  ))}

                {selectedCard.stage === 'Клонирование' && selectedCalendarDate !== getTodayIsoDate() && (
                  <Text style={styles.noticeText}>
                    Производственные события фиксируются только на текущую дату. Прошлые даты доступны для просмотра.
                  </Text>
                )}

                {!!stageActionError && <Text style={styles.errorText}>{stageActionError}</Text>}

                {selectedCard.stage === INTRO_STAGE && (
                  <>
                    <View style={styles.actionGrid}>
                      {[
                        ['comment', 'Комментарий'],
                        ['photo', 'Фото'],
                        ['contamination', 'Контаминация'],
                        ['quarantine', 'Карантин'],
                      ].map(([value, label]) => (
                        <Pressable
                          accessibilityRole="button"
                          key={value}
                          onPress={() => {
                            setIntroActionType(value);
                            setStageActionError('');
                          }}
                          style={[
                            styles.actionChip,
                            introActionType === value && styles.actionChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.actionChipText,
                              introActionType === value && styles.actionChipTextActive,
                            ]}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    {!!introActionType && (
                      <View style={styles.inlineForm}>
                        {introActionType === 'comment' && (
                          <TextInput
                            multiline
                            onChangeText={(value) => updateIntroActionForm('comment', value)}
                            placeholder="Комментарий"
                            placeholderTextColor="#7C8A80"
                            style={[styles.input, styles.multilineInput]}
                            value={introActionForm.comment}
                          />
                        )}
                        {introActionType === 'photo' && (
                          <TextInput
                            multiline
                            onChangeText={(value) => updateIntroActionForm('photoNote', value)}
                            placeholder="Описание фото или ссылка"
                            placeholderTextColor="#7C8A80"
                            style={[styles.input, styles.multilineInput]}
                            value={introActionForm.photoNote}
                          />
                        )}
                        {introActionType === 'contamination' && (
                          <TextInput
                            multiline
                            onChangeText={(value) => updateIntroActionForm('contaminationNote', value)}
                            placeholder="Описание контаминации"
                            placeholderTextColor="#7C8A80"
                            style={[styles.input, styles.multilineInput]}
                            value={introActionForm.contaminationNote}
                          />
                        )}
                        {introActionType === 'quarantine' && (
                          <TextInput
                            multiline
                            onChangeText={(value) => updateIntroActionForm('quarantineReason', value)}
                            placeholder="Причина карантина"
                            placeholderTextColor="#7C8A80"
                            style={[styles.input, styles.multilineInput]}
                            value={introActionForm.quarantineReason}
                          />
                        )}
                        <View style={styles.inlineActions}>
                          <Pressable
                            accessibilityRole="button"
                            onPress={handleSaveIntroAction}
                            style={({ pressed }) => [
                              styles.inlineActionButton,
                              pressed && styles.linkButtonPressed,
                            ]}
                          >
                            <Text style={styles.inlineActionButtonText}>Сохранить</Text>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => {
                              setIntroActionType('');
                              setIntroActionForm(createEmptyIntroActionForm());
                              setStageActionError('');
                            }}
                            style={({ pressed }) => [
                              styles.inlineDangerButton,
                              pressed && styles.linkButtonPressed,
                            ]}
                          >
                            <Text style={styles.inlineDangerButtonText}>Отменить</Text>
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </>
                )}

                <Pressable
                  accessibilityRole="button"
                  disabled={!selectedCardNextStage}
                  onPress={handleAddStageChange}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    !selectedCardNextStage && styles.generateButtonDisabled,
                    pressed && styles.pressedButton,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>{stageMoveButtonLabel}</Text>
                </Pressable>

                {(selectedCard.stage === 'Клонирование' || selectedCard.stage === 'Адаптация') && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={openStatusChangeForm}
                    style={({ pressed }) => [
                      styles.statusButton,
                      pressed && styles.linkButtonPressed,
                    ]}
                  >
                    <Text style={styles.statusButtonText}>Добавить событие</Text>
                  </Pressable>
                )}
              </View>
            )}

            <View style={styles.journalPanel}>
              <Text style={styles.journalTitle}>Журнал событий</Text>
              {selectedCardOperations.length === 0 && (
                <Text style={styles.journalEmpty}>Событий пока нет</Text>
              )}
              {selectedCardOperations.map((operation) => {
                const summaryItems = getOperationSummaryItems(operation);

                return (
                  <View
                    key={operation.id}
                    style={[
                      styles.journalItem,
                      ['contamination', 'quarantine'].includes(operation.type) && styles.journalItemWarning,
                    ]}
                  >
                    <Text style={styles.journalItemTitle}>{operation.title || 'Событие'}</Text>
                    {!!operation.date && (
                      <Text style={styles.journalItemDate}>
                        {formatDisplayDate(operation.date)}
                        {operation.createdAt ? `, ${formatDisplayTime(operation.createdAt)}` : ''}
                      </Text>
                    )}
                    {summaryItems.map(([label, value]) => (
                      <Text key={label} style={styles.journalItemText}>
                        {label}: {value}
                      </Text>
                    ))}
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.chatButton,
              pressed && styles.pressedButton,
            ]}
          >
            <Text style={styles.chatButtonText}>Чат</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (
    isAuthenticated &&
    (isCloneStage || isAdaptationStage) &&
    currentScreen === 'statusChangeForm' &&
    selectedCard
  ) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.cardsScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.cardsScreen}>
              <View style={styles.stagesTopBar}>
                <Pressable
                  accessibilityRole="button"
                  onPress={closeStatusChangeForm}
                  style={({ pressed }) => [
                    styles.backButton,
                    pressed && styles.linkButtonPressed,
                  ]}
                >
                  <Text style={styles.backButtonText}>Назад</Text>
                </Pressable>
              </View>

              <View style={styles.cardsHeader}>
                <Text style={styles.cardsTitle}>Добавить событие</Text>
                <Text style={styles.cardsSubtitle}>
                  {getCardDisplayName(selectedCard)}
                </Text>
                <Text style={styles.cardsSubtitle}>
                  {formatDisplayDate(selectedCalendarDate)}
                </Text>
              </View>

              <View style={styles.formPanel}>
                <View style={styles.actionGrid}>
                  {(selectedCard.stage === 'Адаптация'
                    ? [
                      ['adaptationStress', 'Стресс'],
                      ['adaptationEnvironment', 'Среда'],
                      ['adaptationHumidityReduction', 'Снижение влажности'],
                      ['adaptationCare', 'Уход'],
                      ['quarantine', 'Карантин'],
                      ...((selectedCard.batchStatus || 'active') === 'quarantine'
                        ? [['quarantineReleased', 'Снять карантин']]
                        : []),
                      ['death', 'Гибель'],
                      ['discard', 'Выбраковка'],
                      ['sale', 'Продажа'],
                    ]
                    : [
                      ['rooting', 'Укоренение'],
                      ['death', 'Гибель'],
                      ['discard', 'Выбраковка'],
                      ['sale', 'Продажа'],
                      ['propagation', 'Размножение'],
                      ['quarantine', 'Карантин'],
                    ]).map(([value, label]) => (
                    <Pressable
                      accessibilityRole="button"
                      key={value}
                      onPress={() => {
                        setIntroActionType(value);
                        setStatusForm(createEmptyStatusForm());
                        setStatusFormError('');
                        setStatusFormNotice('');
                      }}
                      style={[
                        styles.actionChip,
                        introActionType === value && styles.actionChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.actionChipText,
                          introActionType === value && styles.actionChipTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {![
                  'adaptationStress',
                  'adaptationEnvironment',
                  'adaptationHumidityReduction',
                  'adaptationCare',
                  'quarantine',
                  'quarantineReleased',
                ].includes(introActionType) && (
                  <View style={styles.field}>
                    <Text style={styles.label}>Количество, шт. *</Text>
                    <TextInput
                      inputMode="numeric"
                      keyboardType="numeric"
                      onChangeText={(value) => updateStatusForm(
                        {
                          rooting: 'rootedCount',
                          death: 'deathCount',
                          discard: 'discardCount',
                          sale: 'saleCount',
                          propagation: 'propagationCount',
                        }[introActionType || 'rooting'],
                        value,
                      )}
                      placeholder="0"
                      placeholderTextColor="#7C8A80"
                      style={styles.input}
                      value={statusForm[{
                        rooting: 'rootedCount',
                        death: 'deathCount',
                        discard: 'discardCount',
                        sale: 'saleCount',
                        propagation: 'propagationCount',
                      }[introActionType || 'rooting']]}
                    />
                  </View>
                )}

                {introActionType === 'adaptationStress' && (
                  <>
                    <View style={styles.field}>
                      <Text style={styles.label}>Уровень стресса *</Text>
                      <View style={styles.toggleRow}>
                        {['Низкий', 'Средний', 'Высокий', 'Критический'].map((value) => (
                          <Pressable
                            accessibilityRole="button"
                            key={value}
                            onPress={() => updateStatusForm('stressLevel', value)}
                            style={[
                              styles.toggleButton,
                              statusForm.stressLevel === value && styles.toggleButtonActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.toggleButtonText,
                                statusForm.stressLevel === value && styles.toggleButtonTextActive,
                              ]}
                            >
                              {value}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.label}>Описание состояния</Text>
                      <TextInput
                        multiline
                        onChangeText={(value) => updateStatusForm('conditionDescription', value)}
                        placeholder="Тургор, увядание, остановка развития"
                        placeholderTextColor="#7C8A80"
                        style={[styles.input, styles.multilineInput]}
                        value={statusForm.conditionDescription}
                      />
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.label}>Причина</Text>
                      <TextInput
                        onChangeText={(value) => updateStatusForm('reason', value)}
                        placeholder="Причина, если известна"
                        placeholderTextColor="#7C8A80"
                        style={styles.input}
                        value={statusForm.reason}
                      />
                    </View>
                  </>
                )}

                {introActionType === 'adaptationEnvironment' && (
                  <>
                    <View style={styles.field}>
                      <Text style={styles.label}>Фактическая температура</Text>
                      <TextInput onChangeText={(value) => updateStatusForm('environmentTemperature', value)} placeholder="Например: 24 °C" placeholderTextColor="#7C8A80" style={styles.input} value={statusForm.environmentTemperature} />
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.label}>Влажность воздуха</Text>
                      <TextInput onChangeText={(value) => updateStatusForm('environmentAirHumidity', value)} placeholder="Например: 75%" placeholderTextColor="#7C8A80" style={styles.input} value={statusForm.environmentAirHumidity} />
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.label}>Влажность субстрата</Text>
                      <TextInput onChangeText={(value) => updateStatusForm('substrateHumidity', value)} placeholder="Например: умеренная или 45%" placeholderTextColor="#7C8A80" style={styles.input} value={statusForm.substrateHumidity} />
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.label}>Освещение</Text>
                      <TextInput onChangeText={(value) => updateStatusForm('environmentLight', value)} placeholder="Фактическое освещение" placeholderTextColor="#7C8A80" style={styles.input} value={statusForm.environmentLight} />
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.label}>Проветривание</Text>
                      <TextInput onChangeText={(value) => updateStatusForm('ventilation', value)} placeholder="Режим проветривания" placeholderTextColor="#7C8A80" style={styles.input} value={statusForm.ventilation} />
                    </View>
                  </>
                )}

                {introActionType === 'adaptationHumidityReduction' && (
                  <>
                    <View style={styles.field}>
                      <Text style={styles.label}>Новое целевое снижение влажности</Text>
                      <TextInput onChangeText={(value) => updateStatusForm('humidityReduction', value)} placeholder="Например: снизить до 75% за 3 дня" placeholderTextColor="#7C8A80" style={styles.input} value={statusForm.humidityReduction} />
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.label}>Влажность воздуха</Text>
                      <TextInput onChangeText={(value) => updateStatusForm('environmentAirHumidity', value)} placeholder="Например: 75%" placeholderTextColor="#7C8A80" style={styles.input} value={statusForm.environmentAirHumidity} />
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.label}>Влажность субстрата</Text>
                      <TextInput onChangeText={(value) => updateStatusForm('substrateHumidity', value)} placeholder="Например: умеренная или 45%" placeholderTextColor="#7C8A80" style={styles.input} value={statusForm.substrateHumidity} />
                    </View>
                  </>
                )}

                {['adaptationStress', 'adaptationEnvironment', 'adaptationHumidityReduction'].includes(introActionType) && (
                  <>
                    <View style={styles.field}>
                      <Text style={styles.label}>Тургор</Text>
                      <TextInput onChangeText={(value) => updateStatusForm('turgor', value)} placeholder="Например: нормальный, снижен" placeholderTextColor="#7C8A80" style={styles.input} value={statusForm.turgor} />
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.label}>Стабильность партии</Text>
                      <View style={styles.toggleRow}>
                        {['Стабильна', 'Нестабильна'].map((value) => (
                          <Pressable
                            accessibilityRole="button"
                            key={value}
                            onPress={() => updateStatusForm('stability', value)}
                            style={[
                              styles.toggleButton,
                              statusForm.stability === value && styles.toggleButtonActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.toggleButtonText,
                                statusForm.stability === value && styles.toggleButtonTextActive,
                              ]}
                            >
                              {value}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </>
                )}

                {introActionType === 'adaptationCare' && (
                  <View style={styles.field}>
                    <Text style={styles.label}>Тип ухода *</Text>
                    <View style={styles.actionGrid}>
                      {['Полив', 'Подкормка', 'Стимуляция', 'Профилактика', 'Лечение'].map((value) => (
                        <Pressable
                          accessibilityRole="button"
                          key={value}
                          onPress={() => updateStatusForm('careType', value)}
                          style={[
                            styles.actionChip,
                            statusForm.careType === value && styles.actionChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.actionChipText,
                              statusForm.careType === value && styles.actionChipTextActive,
                            ]}
                          >
                            {value}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}

                {['death', 'discard', 'quarantine', 'quarantineReleased'].includes(introActionType) && (
                  <View style={styles.field}>
                    <Text style={styles.label}>
                      {introActionType === 'quarantine'
                        ? 'Причина карантина *'
                        : introActionType === 'quarantineReleased'
                          ? 'Причина снятия карантина *'
                          : 'Причина *'}
                    </Text>
                    <TextInput
                      onChangeText={(value) => updateStatusForm('reason', value)}
                      placeholder={introActionType === 'quarantine'
                        ? 'Укажите причину карантина'
                        : introActionType === 'quarantineReleased'
                          ? 'Укажите основание для снятия карантина'
                          : 'Укажите причину'}
                      placeholderTextColor="#7C8A80"
                      style={styles.input}
                      value={statusForm.reason}
                    />
                  </View>
                )}

                {introActionType === 'sale' && (
                  <>
                    <View style={styles.field}>
                      <Text style={styles.label}>Тип реализации</Text>
                      <TextInput
                        onChangeText={(value) => updateStatusForm('saleType', value)}
                        placeholder="Например: розница, опт, бронь"
                        placeholderTextColor="#7C8A80"
                        style={styles.input}
                        value={statusForm.saleType}
                      />
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.label}>Получатель</Text>
                      <TextInput
                        onChangeText={(value) => updateStatusForm('recipient', value)}
                        placeholder="Получатель, если нужно"
                        placeholderTextColor="#7C8A80"
                        style={styles.input}
                        value={statusForm.recipient}
                      />
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.label}>Стоимость</Text>
                      <TextInput
                        inputMode="decimal"
                        keyboardType="decimal-pad"
                        onChangeText={(value) => updateStatusForm('saleAmount', value)}
                        placeholder="Сумма, если нужно"
                        placeholderTextColor="#7C8A80"
                        style={styles.input}
                        value={statusForm.saleAmount}
                      />
                    </View>
                  </>
                )}

                {introActionType === 'propagation' && (
                  <View style={styles.field}>
                    <Text style={styles.label}>Способ размножения</Text>
                    <TextInput
                      onChangeText={(value) => updateStatusForm('propagationMethod', value)}
                      placeholder="Укажите способ"
                      placeholderTextColor="#7C8A80"
                      style={styles.input}
                      value={statusForm.propagationMethod}
                    />
                  </View>
                )}

                <View style={styles.field}>
                  <Text style={styles.label}>Комментарий</Text>
                  <TextInput
                    multiline
                    onChangeText={(value) => updateStatusForm('comment', value)}
                    placeholder="Комментарий"
                    placeholderTextColor="#7C8A80"
                    style={[styles.input, styles.multilineInput]}
                    value={statusForm.comment}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Фото</Text>
                  <TextInput
                    onChangeText={(value) => updateStatusForm('photoNote', value)}
                    placeholder="Описание фото или ссылка"
                    placeholderTextColor="#7C8A80"
                    style={styles.input}
                    value={statusForm.photoNote}
                  />
                </View>

                {!!statusFormError && <Text style={styles.errorText}>{statusFormError}</Text>}
                {!!statusFormNotice && <Text style={styles.noticeText}>{statusFormNotice}</Text>}

                <Pressable
                  accessibilityRole="button"
                  onPress={handleSaveStatusChange}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.pressedButton,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>Сохранить и добавить ещё</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={closeStatusChangeForm}
                  style={({ pressed }) => [
                    styles.cancelButton,
                    pressed && styles.linkButtonPressed,
                  ]}
                >
                  <Text style={styles.cancelButtonText}>Готово</Text>
                </Pressable>
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
    currentScreen === 'cultureList'
  ) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.fixedCardsScreen}>
          <StageHeader
            onBack={() => setSelectedStage('')}
            title={selectedStage}
          >
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>{'\u2315'}</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setCardSearch}
                placeholder={'\u041f\u043e\u0438\u0441\u043a \u043f\u043e \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u044e'}
                placeholderTextColor="#9AA3AF"
                style={styles.searchInput}
                value={cardSearch}
              />
            </View>
          </View>

          {(isCultureIntroStage || isCloneStage || isAdaptationStage) && (
            <ScrollView
              contentContainerStyle={styles.filterScrollContent}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
            >
              {(isCloneStage || isAdaptationStage
                ? [
                  ['all', 'Все'],
                  ['active', 'Активная'],
                  ['quarantine', 'Карантин'],
                  ['partial', 'Частично реализована'],
                  ['problem', 'Проблемная'],
                ]
                : [
                  ['all', 'Все'],
                  ['active', 'Активная'],
                  ['draft', 'Черновик'],
                  ['quarantine', 'Карантин'],
                ]).map(([value, label]) => (
                <Pressable
                  accessibilityRole="button"
                  key={value}
                  onPress={() => setBatchStatusFilter(value)}
                  style={[
                    styles.filterButton,
                    batchStatusFilter === value && styles.filterButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      batchStatusFilter === value && styles.filterButtonTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                  {value === 'all' && (
                    <Text
                      style={[
                        styles.filterButtonCount,
                        batchStatusFilter === value && styles.filterButtonCountActive,
                      ]}
                    >
                      {allVisibleStageCardsCount}
                    </Text>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          )}
          </StageHeader>
          <ScrollView
            contentContainerStyle={styles.fixedCardsScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.plantCardList}>
              {isCardsLoading && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Загрузка карточек...</Text>
                </View>
              )}

              {!!storageError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{storageError}</Text>
                </View>
              )}

              {!isCardsLoading && filteredCultureCards.map((card) => (
                <Pressable
                  accessibilityRole="button"
                  key={card.id}
                  onPress={() => openCultureCalendar(card)}
                  style={({ pressed }) => [
                    styles.plantCard,
                    (card.sterilityStatus === 'contaminated' || card.batchStatus === 'quarantine') &&
                      styles.plantCardWarning,
                    pressed && styles.stageCardPressed,
                  ]}
                >
                  <View>
                    {(() => {
                      const cloneStats = getCloneStats(card);
                      const adaptationStats = getAdaptationStats(card);
                      const batchStatus = card.batchStatus || 'active';

                      return (
                        <>
                    {isCultureIntroStage ? (
                      <>
                        <View style={styles.plantCardHeaderRow}>
                          <Text style={styles.plantCardName} numberOfLines={2}>
                            {getCardDisplayName(card)}
                          </Text>
                          <Text style={styles.plantCardStatusPill}>
                            {BATCH_STATUS_LABELS[batchStatus] || batchStatus}
                          </Text>
                        </View>
                        <View style={styles.plantCardMetaRow}>
                          {!!card.code && (
                            <Text style={styles.plantCardCodePill}>{card.code}</Text>
                          )}
                          <Text style={styles.plantCardMetaText} numberOfLines={1}>
                            {card.createdAt ? formatDisplayDate(card.createdAt) : '-'} / {getCardCurrentQuantity(card)} {'\u0438\u0437'} {card.quantity || 0} {'\u0448\u0442.'} / QR: {QR_STATUS_LABELS[getQrStatus(card)] || getQrStatus(card)}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <>
                    <Text style={styles.plantCardName}>{getCardDisplayName(card)}</Text>
                    {!!card.stageChangedAt && (
                      <Text style={styles.plantCardCode}>
                        Дата перехода: {formatDisplayDate(card.stageChangedAt)}
                      </Text>
                    )}
                    {!card.stageChangedAt && !!card.createdAt && (
                      <Text style={styles.plantCardCode}>
                        Дата создания: {formatDisplayDate(card.createdAt)}
                      </Text>
                    )}
                    {!!card.quantity && (
                      <Text style={styles.plantCardCode}>
                        Остаток: {getCardCurrentQuantity(card)} из {card.quantity} шт.
                      </Text>
                    )}
                    <Text style={styles.plantCardCode}>
                      Статус: {BATCH_STATUS_LABELS[card.batchStatus || 'active'] || card.batchStatus}
                    </Text>
                    {card.sterilityStatus === 'contaminated' && (
                      <Text style={styles.plantCardWarningText}>
                        Материал заражён. Переход стадии заблокирован.
                      </Text>
                    )}
                    {card.batchStatus === 'quarantine' && (
                      <Text style={styles.plantCardWarningText}>
                        Партия в карантине. Требуется решение администратора или агронома.
                      </Text>
                    )}
                    {isCloneStage && (
                      <>
                        <Text style={styles.plantCardCode}>
                          Укоренение: {cloneStats.rootingPercent}% / потери: {cloneStats.lossCount} шт.
                        </Text>
                        <Text style={styles.plantCardCode}>
                          Риск: {cloneStats.riskStatus} / дней: {getDaysInCurrentStage(card)}
                        </Text>
                      </>
                    )}
                    {isAdaptationStage && (
                      <>
                        <Text style={styles.plantCardCode}>
                          Приживаемость: {adaptationStats.survivalPercent}% / стресс: {adaptationStats.stressLevel}
                        </Text>
                        <Text style={styles.plantCardCode}>
                          Риск: {adaptationStats.riskStatus} / дней: {getDaysInCurrentStage(card)}
                        </Text>
                      </>
                    )}
                    <Text style={styles.plantCardCode}>
                      QR: {QR_STATUS_LABELS[getQrStatus(card)] || getQrStatus(card)}
                    </Text>
                      </>
                    )}
                        </>
                      );
                    })()}
                  </View>
                </Pressable>
              ))}

              {!isCardsLoading && filteredCultureCards.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    {isCultureIntroStage && 'Партий пока нет. Нажмите "Создать партию", чтобы создать первую.'}
                    {isCloneStage && 'Карточек пока нет. Переведите растение из введения в культуру.'}
                    {isAdaptationStage && 'Карточек пока нет. Переведите растение из клонирования.'}
                    {!isCultureIntroStage && !isCloneStage && !isAdaptationStage &&
                      'Карточек пока нет. Переведите растение из предыдущей стадии.'}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {(isCultureIntroStage || isAdaptationStage) && (
            <View style={styles.fixedAddButtonBar}>
              <Pressable
                accessibilityRole="button"
                onPress={openCultureForm}
                style={({ pressed }) => [
                  styles.addButton,
                  styles.fixedAddButton,
                  pressed && styles.pressedButton,
                ]}
              >
                <Text style={styles.addButtonText}>{isCultureIntroStage ? 'Создать партию' : 'Добавить'}</Text>
              </Pressable>
              {!isCultureIntroStage && (
                <Pressable
                  accessibilityLabel="Сканировать QR"
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.qrScanButton,
                    pressed && styles.pressedButton,
                  ]}
                >
                  <QrIcon />
                </Pressable>
              )}
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (isAuthenticated && currentScreen === 'globalJournal') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.fixedCardsScreen}>
          <StageHeader
            onBack={() => setCurrentScreen('stages')}
            title={'\u0416\u0443\u0440\u043d\u0430\u043b'}
          >
            <View style={styles.filterRow}>
              {[
                'important',
                'all',
                'contamination',
                'quarantine',
                'losses',
                'sales',
                'stageChange',
              ].map((filter) => (
                <Pressable
                  accessibilityRole="button"
                  key={filter}
                  onPress={() => setJournalFilter(filter)}
                  style={[
                    styles.filterButton,
                    journalFilter === filter && styles.filterButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      journalFilter === filter && styles.filterButtonTextActive,
                    ]}
                  >
                    {getJournalFilterLabel(filter)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </StageHeader>
          <ScrollView contentContainerStyle={styles.fixedCardsScrollContent}>
            <View style={styles.journalPanel}>
              <Text style={styles.journalTitle}>
                {getJournalFilterLabel(journalFilter)} события
              </Text>

              {groupedGlobalJournalCards.length === 0 && (
                <Text style={styles.journalEmpty}>Событий пока нет</Text>
              )}

              {groupedGlobalJournalCards.map(({ card, events }) => {
                const isExpanded = expandedJournalCardIds.includes(card.id);

                return (
                  <View
                    key={card.id}
                    style={[
                      styles.globalJournalCard,
                      (card.sterilityStatus === 'contaminated' || card.batchStatus === 'quarantine') &&
                        styles.globalJournalCardWarning,
                    ]}
                  >
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => toggleJournalCard(card.id)}
                      style={({ pressed }) => [
                        styles.globalJournalCardHeader,
                        pressed && styles.linkButtonPressed,
                      ]}
                    >
                      <View style={styles.globalJournalCardTitleBlock}>
                        <Text style={styles.journalItemTitle} numberOfLines={2}>
                          {getCardDisplayName(card)}
                        </Text>
                        <Text style={styles.journalItemDate} numberOfLines={1}>
                          {card.code} · {card.stage || INTRO_STAGE}
                        </Text>
                      </View>
                      <View style={styles.globalJournalCardHeaderSide}>
                        <Text style={styles.globalJournalBadge}>{events.length}</Text>
                        <Text style={styles.globalJournalToggleText}>
                          {isExpanded ? 'Свернуть' : 'Открыть'}
                        </Text>
                      </View>
                    </Pressable>

                    <Text style={styles.journalItemText} numberOfLines={1}>
                      {BATCH_STATUS_LABELS[card.batchStatus || 'active'] || card.batchStatus} · {getCardCurrentQuantity(card)} шт.
                    </Text>

                    {isExpanded && (
                      <>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => {
                            setSelectedStage(card.stage || INTRO_STAGE);
                            setSelectedCardId(card.id);
                            setSelectedCalendarDate('');
                            setCalendarMonth(events[0]?.date ? dateFromIso(events[0].date) : new Date());
                            setCurrentScreen('cultureCalendar');
                          }}
                          style={({ pressed }) => [
                            styles.globalJournalOpenCardButton,
                            pressed && styles.linkButtonPressed,
                          ]}
                        >
                          <Text style={styles.globalJournalOpenCardButtonText}>Открыть карточку</Text>
                        </Pressable>

                        <View style={styles.globalJournalEventList}>
                          {events.map((event) => {
                            const summaryItems = getOperationSummaryItems(event);

                            return (
                              <View
                                key={`${event.cardId}-${event.id}`}
                                style={[
                                  styles.journalItem,
                                  (['contamination', 'quarantine'].includes(event.type) ||
                                    event.stressLevel === 'Критический') && styles.journalItemWarning,
                                ]}
                              >
                                <Text style={styles.journalItemTitle}>{event.title || 'Событие'}</Text>
                                {!!event.date && (
                                  <Text style={styles.journalItemDate}>
                                    {formatDisplayDate(event.date)}
                                    {event.createdAt ? `, ${formatDisplayTime(event.createdAt)}` : ''}
                                  </Text>
                                )}
                                {summaryItems.map(([label, value]) => (
                                  <Text key={label} style={styles.journalItemText}>
                                    {label}: {value}
                                  </Text>
                                ))}
                              </View>
                            );
                          })}
                        </View>
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
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
                    <Image
                      accessibilityIgnoresInvertColors
                      source={stage.icon}
                      style={styles.stageIcon}
                    />
                  </View>
                  <Text style={styles.stageName}>{stage.label}</Text>
                </Pressable>
              ))}
            </View>

            {!!notice && <Text style={styles.homeNoticeText}>{notice}</Text>}
            {!!storageError && <Text style={styles.homeErrorText}>{storageError}</Text>}
          </View>
        </ScrollView>

        <BottomTabBar
          activeTab="home"
          onHomePress={() => setCurrentScreen('stages')}
          onJournalPress={() => {
            setJournalFilter('important');
            setCurrentScreen('globalJournal');
          }}
          onScanPress={() => setNotice('\u0421\u043a\u0430\u043d\u0435\u0440 \u0431\u0443\u0434\u0435\u0442 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d \u043f\u043e\u0437\u0434\u043d\u0435\u0435.')}
          onTasksPress={() => setNotice('\u0417\u0430\u0434\u0430\u0447\u0438 \u0431\u0443\u0434\u0443\u0442 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u044b \u043f\u043e\u0437\u0434\u043d\u0435\u0435.')}
          taskCount={0}
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
