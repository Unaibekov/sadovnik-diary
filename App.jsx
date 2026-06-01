import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
  getMonthDays,
  getMonthTitle,
  getTodayIsoDate,
  parseDisplayDate,
} from './src/domain/dates';
import {
  createEmptyCultureForm,
  createEmptyIntroActionForm,
  createEmptyStatusForm,
} from './src/domain/forms';
import {
  canEditIdentityFields,
  generatePlantingCode,
  getAdaptationStats,
  getCardCurrentQuantity,
  getCardDisplayName,
  getCloneStats,
  getDaysInCurrentStage,
  getGreenhouseStats,
  getNextStage,
  getOperationSummaryItems,
  getQrStatus,
  getStageMoveButtonLabel,
  isPositiveInteger,
} from './src/domain/batch';
import {
  getPlantCardStatusDotStyle,
  getResolvedBatchStatus,
  getUniqueOptions,
} from './src/domain/cardSelectors';
import {
  cultureCreateBatchStatuses,
  editableStatusOperationTypes,
  introOperationFields,
  protectedOperationTypes,
  stageHomeItems as stageHomeItemsConfig,
  statusEventCountFields,
} from './src/domain/operationConfig';
import {
  buildGroupedGlobalJournalCards,
  filterCultureCards,
  getAllVisibleStageCardsCount,
} from './src/domain/cultureSelectors';
import {
  findCatalogPlant,
  getStagePlantRecommendationItems,
  removeRecommendationFields,
} from './src/domain/recommendations';
import {
  buildCloseRecommendationsState,
  buildGlobalJournalNavigationState,
  buildMenuNavigationState,
  buildStageRecommendationsNavigationState,
  buildTasksNavigationState,
} from './src/domain/navigation';
import {
  applyCultureSelection,
  applySpeciesSelection,
  applyVarietySelection,
  isDuplicateCardCode,
  isRequiredFieldMissingInForm,
} from './src/domain/cultureForm';
import { buildCultureCardPayload } from './src/domain/cultureCardBuilder';
import { validateCultureCardInput } from './src/domain/cultureFormValidation';
import { updateFormField } from './src/domain/formState';
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
import { shareCultureCardsReport } from './src/services/shareReportService';
import {
  doesJournalEventMatchFilter,
  getGlobalJournalEvents,
  getJournalFilterLabel,
  getLatestFilledCalendarDate,
  isOperationVisibleInCurrentStage,
} from './src/domain/journal';
import { buildCareTasks } from './src/domain/tasks';
import { getStatusEventConfig } from './src/domain/statusOperations';
import { getStatusBaseValidationError } from './src/domain/statusValidation';
import { getAdaptationValidationError } from './src/domain/statusStageValidation';
import { getGreenhouseValidationError } from './src/domain/statusGreenhouseValidation';
import { buildStatusOperation } from './src/domain/statusOperationBuilder';
import { getFallbackBatchStatus } from './src/domain/statusCardStatusResolver';
import { getGreenhouseCareIntervalsPatch } from './src/domain/statusCardMutations';
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
import SelectBottomSheet from './src/components/SelectBottomSheet';
import { ChevronDownIcon, QrGenerateIcon, StageItemIcon } from './src/components/icons';

const NativeDateTimePicker = Platform.OS === 'web'
  ? null
  : require('@react-native-community/datetimepicker/src/datetimepicker').default;

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
  const careTasks = buildCareTasks(cultureCards, getResolvedBatchStatus);
  const taskCount = careTasks.length;
  const activeCardsCount = cultureCards.filter((card) => (
    card.status !== 'cancelled' &&
    card.status !== 'archived' &&
    getResolvedBatchStatus(card) !== 'sold'
  )).length;
  const groupedGlobalJournalCards = buildGroupedGlobalJournalCards(
    cultureCards,
    globalJournalEvents,
    journalFilter,
    doesJournalEventMatchFilter,
  );

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

  const filteredCultureCards = filterCultureCards(cultureCards, {
    batchStatusFilter,
    cardSearch,
    getCardDisplayName,
    getResolvedBatchStatus,
    isAdaptationStage,
    isCloneStage,
    isCultureIntroStage,
    isGreenhouseStage,
    selectedStage,
  });

  const allVisibleStageCardsCount = getAllVisibleStageCardsCount(cultureCards, {
    cardSearch,
    getCardDisplayName,
    getResolvedBatchStatus,
    selectedStage,
  });
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
      const plant = findCatalogPlant(recommendationCard, plantsCatalog);

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

      const plant = findCatalogPlant(card, plantsCatalog);

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
    const nextState = buildGlobalJournalNavigationState();
    setSelectedStage('');
    setSelectedCardId(null);
    setSelectedCalendarDate('');
    setJournalFilter(nextState.journalFilter);
    setExpandedJournalCardIds(nextState.expandedJournalCardIds);
    setCurrentScreen(nextState.currentScreen);
  }

  function openTasks() {
    const nextState = buildTasksNavigationState();
    setSelectedStage('');
    setSelectedCardId(null);
    setSelectedCalendarDate('');
    setCurrentScreen(nextState.currentScreen);
    setNotice(nextState.notice);
  }

  function openMenu() {
    const nextState = buildMenuNavigationState();
    setSelectedStage('');
    setSelectedCardId(null);
    setSelectedCalendarDate('');
    setCurrentScreen(nextState.currentScreen);
    setNotice(nextState.notice);
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
    try {
      const shareResult = await shareCultureCardsReport(cultureCards, {
        getCardCurrentQuantity,
        getOperationSummaryItems,
        getResolvedBatchStatus,
      });

      if (shareResult === 'web_ready') {
        setNotice('Excel-отчет подготовлен.');
        return;
      }

      if (shareResult === 'native_unavailable') {
        setNotice('Отправка Excel-файла недоступна на устройстве.');
        return;
      }

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
    const nextState = buildStageRecommendationsNavigationState(selectedStage);
    setRecommendationsContext({
      ...nextState.recommendationsContext,
      backScreen: 'cultureList',
    });
    setRecommendationsMode(nextState.recommendationsMode);
    setCurrentScreen(nextState.currentScreen);
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
    const nextState = buildCloseRecommendationsState(
      recommendationsContext?.backScreen || 'cultureList',
    );
    setRecommendationsContext(nextState.recommendationsContext);
    setRecommendationsMode(nextState.recommendationsMode);
    setCurrentScreen(nextState.currentScreen);
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
    setCultureForm((currentForm) => updateFormField(currentForm, field, value));
  }

  function updateStatusForm(field, value) {
    setStatusForm((currentForm) => updateFormField(currentForm, field, value));
  }

  function updateIntroActionForm(field, value) {
    setIntroActionForm((currentForm) => updateFormField(currentForm, field, value));
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

    setCultureForm((currentForm) => applyCultureSelection(currentForm, cultureName));
    setOpenDropdown('');
  }

  function handleSelectSpecies(speciesName) {
    if (!canEditCurrentIdentity) {
      return;
    }

    setCultureForm((currentForm) => applySpeciesSelection(currentForm, speciesName));
    setOpenDropdown('');
  }

  function handleSelectVariety(varietyName) {
    if (!canEditCurrentIdentity) {
      return;
    }

    setCultureForm((currentForm) => applyVarietySelection(currentForm, varietyName, plantsCatalog));
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
    const isDuplicateCode = isDuplicateCardCode(cultureCards, code, editingCardId);
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

    const eventConfig = getStatusEventConfig(introActionType);
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
    const baseValidationError = getStatusBaseValidationError({
      eventConfig,
      count,
      introActionType,
      currentQuantity,
      reason: statusForm.reason,
      canReleaseQuarantine,
      isEditingOperation: Boolean(editingOperationId),
      batchStatus: selectedCard.batchStatus,
    });

    if (baseValidationError === 'invalid_count') {
      setStatusFormError('Укажите корректное количество');
      return;
    }

    if (baseValidationError === 'count_gt_current') {
      setStatusFormError('Количество не может быть больше текущего остатка');
      return;
    }

    if (baseValidationError === 'missing_reason') {
      setStatusFormError('Укажите причину');
      return;
    }

    if (baseValidationError === 'release_forbidden') {
      setStatusFormError('Снять карантин может только агроном или администратор');
      return;
    }

    if (baseValidationError === 'not_in_quarantine') {
      setStatusFormError('Партия не находится в карантине');
      return;
    }

    const adaptationValidationError = getAdaptationValidationError(introActionType, statusForm);

    if (adaptationValidationError === 'adaptation_stress_missing') {
      setStatusFormError('Укажите хотя бы один параметр наблюдения');
      return;
    }

    if (adaptationValidationError === 'adaptation_environment_missing') {
      setStatusFormError('Укажите хотя бы один параметр среды');
      return;
    }

    if (adaptationValidationError === 'adaptation_humidity_reduction_missing') {
      setStatusFormError('Укажите снижение влажности или состояние партии');
      return;
    }

    if (adaptationValidationError === 'adaptation_care_type_missing') {
      setStatusFormError('Укажите тип ухода');
      return;
    }

    const greenhouseValidationError = getGreenhouseValidationError(introActionType, statusForm);

    if (greenhouseValidationError === 'greenhouse_observation_missing') {
      setStatusFormError('Укажите хотя бы один параметр наблюдения');
      return;
    }

    if (greenhouseValidationError === 'greenhouse_care_type_missing') {
      setStatusFormError('Укажите тип ухода');
      return;
    }

    if (greenhouseValidationError === 'greenhouse_environment_missing') {
      setStatusFormError('Укажите хотя бы один параметр среды');
      return;
    }

    if (greenhouseValidationError === 'greenhouse_disease_missing') {
      setStatusFormError('Укажите болезнь, вредителя или уровень риска');
      return;
    }

    const nowIso = new Date().toISOString();
    const nextOperation = buildStatusOperation({
      editingOperationId,
      introActionType,
      eventConfig,
      selectedCard,
      introStage: INTRO_STAGE,
      selectedCalendarDate,
      count,
      currentQuantity,
      statusForm,
      editedOperation,
      userId: currentUser.id,
      nowIso,
    });
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
        ...getGreenhouseCareIntervalsPatch(card, introActionType, statusForm),
      };
      const nextQuantity = getCardCurrentQuantity(nextCard);
      const fallbackBatchStatus = getFallbackBatchStatus(
        card,
        introActionType,
        nextQuantity,
        statusForm,
      );
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
    const isDuplicateCode = isDuplicateCardCode(cultureCards, code, editingCardId);
    const validationError = validateCultureCardInput({
      createdAt,
      cultureName,
      speciesName,
      varietyName,
      code,
      quantity,
      sourceMaterial,
      isCultureIntroStage,
      isDuplicateCode,
    });
    if (validationError === 'missing_fields') {
      setFormError('Заполните все поля');
      return;
    }

    if (validationError === 'invalid_quantity') {
      setFormError('Количество указано некорректно');
      return;
    }

    if (validationError === 'duplicate_code') {
      setFormError('Код уже существует');
      return;
    }

    const nowIso = new Date().toISOString();
    const nextCard = buildCultureCardPayload({
      cultureForm,
      editingCardId,
      selectedStage,
      createdAt,
      cultureName,
      speciesName,
      varietyName,
      code,
      quantity,
      sourceMaterial,
      parentBatch,
      startPhotoNote,
      userId: currentUser.id,
      nowIso,
    });

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
    return isRequiredFieldMissingInForm(cultureForm, touchedSubmit, field);
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

                      <SelectBottomSheet
                        onClose={() => setOpenDropdown('')}
                        onSelect={handleSelectCulture}
                        options={cultureOptions}
                        title="Выберите культуру"
                        visible={openDropdown === 'culture'}
                      />
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

                      <SelectBottomSheet
                        onClose={() => setOpenDropdown('')}
                        onSelect={handleSelectSpecies}
                        options={speciesOptions}
                        title="Выберите вид"
                        visible={openDropdown === 'species'}
                      />
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

                      <SelectBottomSheet
                        onClose={() => setOpenDropdown('')}
                        onSelect={handleSelectVariety}
                        options={varietyOptions}
                        title="Выберите сорт"
                        visible={openDropdown === 'variety'}
                      />
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
                        accessibilityLabel={isEditingCard ? 'Сгенерировать новый код партии' : 'Сгенерировать код партии'}
                        accessibilityRole="button"
                        disabled={!canEditCurrentIdentity}
                        onPress={handleGenerateCode}
                        style={({ pressed }) => [
                          styles.generateButton,
                          !canEditCurrentIdentity && styles.generateButtonDisabled,
                          pressed && styles.pressedButton,
                        ]}
                      >
                        <QrGenerateIcon
                          color={canEditCurrentIdentity ? '#15863F' : '#9CA3AF'}
                          size={28}
                        />
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

                          <SelectBottomSheet
                            customInputLabel="Указать свое"
                            customInputPlaceholder="Введите источник материала"
                            customInputValue={
                              SOURCE_MATERIAL_OPTIONS.includes(cultureForm.sourceMaterial)
                                ? ''
                                : cultureForm.sourceMaterial
                            }
                            onChangeCustomInput={(value) => updateCultureForm('sourceMaterial', value)}
                            onClose={() => setOpenDropdown('')}
                            onSelect={(option) => {
                              updateCultureForm('sourceMaterial', option);
                              setOpenDropdown('');
                            }}
                            options={SOURCE_MATERIAL_OPTIONS.filter((option) => option !== 'Другое')}
                            title="Выберите источник материала"
                            visible={openDropdown === 'sourceMaterial'}
                          />
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

                        <SelectBottomSheet
                          getKey={([value]) => value}
                          getLabel={([, label]) => label}
                          onClose={() => setOpenDropdown('')}
                          onSelect={([value]) => {
                            updateCultureForm('batchStatus', value);
                            setOpenDropdown('');
                          }}
                          options={cultureCreateBatchStatuses}
                          title="Выберите статус партии"
                          visible={openDropdown === 'batchStatus'}
                        />
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
        subtitle={<Text style={styles.stageHeaderSubtitle}>{selectedCard.stage || selectedStage}</Text>}
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
        lastName=""
        notice={notice}
        onHomePress={() => setCurrentScreen('stages')}
        onJournalPress={() => {
          setJournalFilter('important');
          setCurrentScreen('globalJournal');
        }}
        onLogout={handleLogout}
        onMenuAction={(title) => setNotice(`${title}: раздел будет добавлен позже.`)}
        onClearCards={handleClearTestData}
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
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <ScrollView
          contentContainerStyle={styles.stagesScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stagesScreen}>
            <View style={styles.stageGrid}>
              {stageHomeItemsConfig.map((stage) => (
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
                    <StageItemIcon name={stage.iconName} size={24} />
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
      login={login}
      focusedField={focusedField}
      password={password}
      onLoginChange={setLogin}
      onFocusedFieldChange={setFocusedField}
      onPasswordChange={setPassword}
      onSubmitLogin={handleLogin}
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







