import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  SafeAreaProvider,
  initialWindowMetrics,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { CameraView } from 'expo-camera';
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
  getTodayIsoDate,
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
  buildCultureFormOptions,
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
  getActiveCardsCount,
  filterCultureCards,
  getAllVisibleStageCardsCount,
  getSelectedStageCardsCount,
} from './src/domain/cultureSelectors';
import {
  buildRecommendationEntries,
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
import {
  buildCancelledCultureCards,
  buildCultureCardPayload,
  buildSavedCultureCards,
} from './src/domain/cultureCardBuilder';
import { validateCultureCardInput } from './src/domain/cultureFormValidation';
import { updateFormField } from './src/domain/formState';
import {
  clearCultureCardsForTests,
  loadCultureCardsFromStorage,
  saveCultureCardsToStorage,
} from './src/services/cultureCardsStorage';
import {
  buildWateringReminderPayload,
  initializeLocalNotifications,
  scheduleWateringReminder,
} from './src/services/localNotifications';
import { shareQrCode } from './src/services/shareQrCodeService';
import { shareCultureCardsReport } from './src/services/shareReportService';
import {
  doesJournalEventMatchFilter,
  getGlobalJournalEvents,
  getJournalFilterLabel,
  getLatestFilledCalendarDate,
  isOperationVisibleInCurrentStage,
  buildSelectedCardJournalData,
} from './src/domain/journal';
import { buildCareTasks } from './src/domain/tasks';
import { getIntroActionConfig, getStatusEventConfig } from './src/domain/statusOperations';
import { getStatusBaseValidationError } from './src/domain/statusValidation';
import { getAdaptationValidationError } from './src/domain/statusStageValidation';
import { getGreenhouseValidationError } from './src/domain/statusGreenhouseValidation';
import { buildStatusOperation } from './src/domain/statusOperationBuilder';
import { buildStatusFormFromOperation } from './src/domain/statusOperationForm';
import { buildStageChangeOperation, buildStageTransitionCard } from './src/domain/stageTransition';
import { buildIntroActionUpdatedCard } from './src/domain/introActionCardBuilder';
import { buildUpdatedStatusCard } from './src/domain/statusCardBuilder';
import { buildIntroActionOperation } from './src/domain/introActionOperationBuilder';
import { buildStatusOperationContext } from './src/domain/statusOperationContext';
import { buildDeletedOperationCard } from './src/domain/operationDeletion';
import AuthScreen from './src/screens/AuthScreen';
import AppRouter from './AppRouter';
import AppErrorBoundary from './AppErrorBoundary';

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
  const {
    operationDates,
    selectedCardCalendarOperations,
    selectedCardOperations,
    selectedDateOperations,
  } = buildSelectedCardJournalData(selectedCard, selectedCalendarDate);
  const selectedCardCurrentQuantity = getCardCurrentQuantity(selectedCard);
  const selectedCardCloneStats = getCloneStats(selectedCard);
  const selectedCardAdaptationStats = getAdaptationStats(selectedCard);
  const selectedCardDaysInStage = getDaysInCurrentStage(selectedCard);
  const isCultureIntroStage = selectedStage === INTRO_STAGE;
  const isCloneStage = selectedStage === stages[1];
  const isAdaptationStage = selectedStage === stages[2];
  const isGreenhouseStage = selectedStage === stages[3];
  const selectedCardNextStage = getNextStage(selectedCard?.stage || selectedStage);
  const selectedCardActionLocked =
    selectedCard?.batchStatus === 'quarantine' ||
    selectedCard?.sterilityStatus === 'contaminated';
  const userRole = currentUser.role;
  const stageMoveButtonLabel = selectedCardNextStage
    ? `В ${stageMoveTargetLabels[selectedCardNextStage] || selectedCardNextStage.toLocaleLowerCase('ru-RU')}`
    : getStageMoveButtonLabel(selectedCardNextStage);
  const stageMoveBlockedMessage = selectedCard?.stage === INTRO_STAGE && selectedCard.sterilityStatus === 'contaminated'
    ? 'РџР°СЂС‚РёСЏ СЃ РєРѕРЅС‚Р°РјРёРЅР°С†РёРµР№. РџРµСЂРµРІРѕРґ РІ РєР»РѕРЅРёСЂРѕРІР°РЅРёРµ Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅ.'
    : selectedCard?.stage === INTRO_STAGE && (selectedCard.batchStatus || 'active') === 'quarantine'
      ? 'РџР°СЂС‚РёСЏ РЅР° РєР°СЂР°РЅС‚РёРЅРµ. РџРµСЂРµРІРѕРґ РІ РєР»РѕРЅРёСЂРѕРІР°РЅРёРµ Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅ.'
      : '';
  const showIdentityAsText = isEditingCard;
  const canSaveCultureForm = true;
  const isSupportedPlantingStage = stages.includes(selectedStage);
  const isSelectedCloneCard = selectedCard?.stage === stages[1];
  const canReleaseQuarantine = ['agronomist', 'admin', 'superadmin'].includes(currentUser.role);
  const globalJournalEvents = getGlobalJournalEvents(cultureCards);
  const careTasks = buildCareTasks(cultureCards, getResolvedBatchStatus);
  const taskCount = careTasks.length;
  const activeCardsCount = getActiveCardsCount(cultureCards, getResolvedBatchStatus);
  const groupedGlobalJournalCards = buildGroupedGlobalJournalCards(
    cultureCards,
    globalJournalEvents,
    journalFilter,
    doesJournalEventMatchFilter,
  );

  const {
    cultureOptions,
    speciesOptions,
    varietyOptions,
  } = buildCultureFormOptions(plantsCatalog, cultureForm);

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
  const selectedStageCardsCount = getSelectedStageCardsCount(
    cultureCards,
    selectedStage,
    getResolvedBatchStatus,
  );
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
  const recommendationEntries = buildRecommendationEntries({
    plantsCatalog,
    recommendationCard,
    recommendationMode: recommendationsMode,
    recommendationSourceCards,
    recommendationStage,
  });

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
      setStorageError('РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ Р»РѕРєР°Р»СЊРЅС‹Рµ РґР°РЅРЅС‹Рµ');
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
      setStorageError('РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ Р»РѕРєР°Р»СЊРЅС‹Рµ РґР°РЅРЅС‹Рµ');
    }
  }

  function handleLogin() {
    setNotice('');
    setError('');
    setIsAuthenticated(true);
  }

  function handleForgotPassword() {
    setError('');
    setNotice('Р’РѕСЃСЃС‚Р°РЅРѕРІР»РµРЅРёРµ РїР°СЂРѕР»СЏ Р±СѓРґРµС‚ РґРѕР±Р°РІР»РµРЅРѕ РЅР° СЃР»РµРґСѓСЋС‰РµРј С€Р°РіРµ.');
  }

  function handleRegister() {
    setError('');
    setNotice('Р РµРіРёСЃС‚СЂР°С†РёСЏ Р±СѓРґРµС‚ РґРѕР±Р°РІР»РµРЅР° РѕС‚РґРµР»СЊРЅРѕ. Р РѕР»СЊ РЅР°Р·РЅР°С‡Р°РµС‚ СЃСѓРїРµСЂР°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ.');
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

  async function handleScanPress() {
    if (Platform.OS === 'web') {
      setNotice('QR-СЃРєР°РЅРµСЂ РґРѕСЃС‚СѓРїРµРЅ С‚РѕР»СЊРєРѕ РІ РјРѕР±РёР»СЊРЅРѕРј РїСЂРёР»РѕР¶РµРЅРёРё.');
      return;
    }

    let subscription;

    try {
      let handled = false;
      subscription = CameraView.onModernBarcodeScanned(async (event) => {
        if (handled) {
          return;
        }

        handled = true;
        subscription.remove();

        if (Platform.OS === 'ios') {
          await CameraView.dismissScanner();
        }

        const scannedCode = `${event?.data || ''}`.trim();
        const matchedCard = cultureCards.find((card) => (
          `${card.code || ''}`.trim().toLowerCase() === scannedCode.toLowerCase()
        ));

        if (!matchedCard) {
          setNotice(scannedCode
            ? `РљР°СЂС‚РѕС‡РєР° СЃ QR-РєРѕРґРѕРј ${scannedCode} РЅРµ РЅР°Р№РґРµРЅР°.`
            : 'QR-РєРѕРґ РЅР°Р№РґРµРЅ, РЅРѕ РµРіРѕ Р·РЅР°С‡РµРЅРёРµ РїСѓСЃС‚РѕРµ.');
          return;
        }

        setSelectedStage(matchedCard.stage || INTRO_STAGE);
        openCultureCalendar(matchedCard);
        setNotice(`РћС‚РєСЂС‹С‚Р° РєР°СЂС‚РѕС‡РєР°: ${getCardDisplayName(matchedCard)}.`);
      });

      await CameraView.launchScanner({
        barcodeTypes: ['qr'],
      });
    } catch (scanError) {
      setNotice('РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РєСЂС‹С‚СЊ СЃРєР°РЅРµСЂ QR-РєРѕРґР°.');
    } finally {
      subscription?.remove();
    }
  }

  async function handleShareQrPress(card) {
    try {
      const shareResult = await shareQrCode(card?.code);

      if (shareResult === 'web_ready') {
        setNotice('QR-РєРѕРґ РїРѕРґРіРѕС‚РѕРІР»РµРЅ РґР»СЏ РѕС‚РїСЂР°РІРєРё.');
        return;
      }

      if (shareResult === 'native_unavailable') {
        setNotice('РЎРёСЃС‚РµРјРЅРѕРµ РѕС‚РїСЂР°РІР»РµРЅРёРµ РЅРµРґРѕСЃС‚СѓРїРЅРѕ, QR-РєРѕРґ РїРѕРґРіРѕС‚РѕРІР»РµРЅ С‚РµРєСЃС‚РѕРј.');
        return;
      }

      setNotice('QR-РєРѕРґ РѕС‚РїСЂР°РІР»РµРЅ С‡РµСЂРµР· СЃРёСЃС‚РµРјРЅРѕРµ РјРµРЅСЋ.');
    } catch (shareError) {
      setNotice('РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РїСЂР°РІРёС‚СЊ QR-РєРѕРґ.');
    }
  }

  function openTaskCard(task) {
    const taskCard = cultureCards.find((card) => card.id === task.cardId);

    if (!taskCard) {
      setNotice('РџР°СЂС‚РёСЏ РґР»СЏ Р·Р°РґР°С‡Рё РЅРµ РЅР°Р№РґРµРЅР°.');
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
        setNotice('Excel-РѕС‚С‡РµС‚ РїРѕРґРіРѕС‚РѕРІР»РµРЅ.');
        return;
      }

      if (shareResult === 'native_unavailable') {
        setNotice('РћС‚РїСЂР°РІРєР° Excel-С„Р°Р№Р»Р° РЅРµРґРѕСЃС‚СѓРїРЅР° РЅР° СѓСЃС‚СЂРѕР№СЃС‚РІРµ.');
        return;
      }

      setNotice('Excel-С„Р°Р№Р» РѕС‚С‡РµС‚Р° РіРѕС‚РѕРІ Рє РѕС‚РїСЂР°РІРєРµ.');
    } catch (shareError) {
      setNotice('РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕРґРіРѕС‚РѕРІРёС‚СЊ Excel-РѕС‚С‡РµС‚.');
    }
  }
  async function handleScheduleWateringReminder() {
    try {
      await scheduleWateringReminder({
        body: 'РўРµСЃС‚РѕРІРѕРµ РЅР°РїРѕРјРёРЅР°РЅРёРµ: РїРѕСЂР° РїСЂРѕРІРµСЂРёС‚СЊ РїРѕР»РёРІ.',
        date: new Date(Date.now() + 60 * 1000),
      });
      setNotice('РќР°РїРѕРјРёРЅР°РЅРёРµ Рѕ РїРѕР»РёРІРµ Р·Р°РїР»Р°РЅРёСЂРѕРІР°РЅРѕ С‡РµСЂРµР· 1 РјРёРЅСѓС‚Сѓ.');
    } catch (notificationError) {
      setNotice('РќРµ СѓРґР°Р»РѕСЃСЊ РІРєР»СЋС‡РёС‚СЊ СѓРІРµРґРѕРјР»РµРЅРёСЏ. РџСЂРѕРІРµСЂСЊС‚Рµ СЂР°Р·СЂРµС€РµРЅРёСЏ С‚РµР»РµС„РѕРЅР°.');
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

  function handleMenuAction(title) {
    setNotice(`${title}: СЂР°Р·РґРµР» Р±СѓРґРµС‚ РґРѕР±Р°РІР»РµРЅ РїРѕР·Р¶Рµ.`);
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
      setNotice('РљР°СЂС‚РѕС‡РєРё СЃС‚Р°РґРёР№ Рё Р¶СѓСЂРЅР°Р» РѕС‡РёС‰РµРЅС‹.');
    } catch (clearError) {
      setStorageError('РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‡РёСЃС‚РёС‚СЊ РєР°СЂС‚РѕС‡РєРё СЃС‚Р°РґРёР№');
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
      selectedCard.stage === stages[2]
        ? 'adaptationStress'
        : selectedCard.stage === stages[3]
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
        ...buildStatusFormFromOperation(operation, countField),
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
        ? buildDeletedOperationCard(card, operationId)
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
      setFormError('РљРѕРґ СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚. РЎРіРµРЅРµСЂРёСЂСѓР№С‚Рµ РєРѕРґ РµС‰С‘ СЂР°Р·.');
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
      setStageActionError('РњР°С‚РµСЂРёР°Р» Р·Р°СЂР°Р¶С‘РЅ: РїРµСЂРµС…РѕРґ СЃС‚Р°РґРёРё Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅ РґРѕ СЂРµС€РµРЅРёСЏ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР° РёР»Рё Р°РіСЂРѕРЅРѕРјР°');
      return;
    }

    if (selectedCard.stage === INTRO_STAGE) {
      if ((selectedCard.batchStatus || 'active') !== 'active') {
        setStageActionError('РџРµСЂРµРІРµСЃС‚Рё РјРѕР¶РЅРѕ С‚РѕР»СЊРєРѕ Р°РєС‚РёРІРЅСѓСЋ РїР°СЂС‚РёСЋ');
        return;
      }

      if (getQrStatus(selectedCard) === 'none') {
        setStageActionError('QR-РєРѕРґ РµС‰С‘ РЅРµ СЃРѕР·РґР°РЅ');
        return;
      }
    }

    if (selectedCard.stage === stages[1]) {
      const cloneStats = getCloneStats(selectedCard);

      if ((selectedCard.batchStatus || 'active') === 'quarantine') {
        setStageActionError('РџР°СЂС‚РёСЏ РІ РєР°СЂР°РЅС‚РёРЅРµ Рё РЅРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ РїРµСЂРµРІРµРґРµРЅР° РґР°Р»СЊС€Рµ');
        return;
      }

      if ((selectedCard.batchStatus || 'active') === 'problem' || cloneStats.riskStatus === 'РљСЂРёС‚РёС‡РµСЃРєРёР№') {
        setStageActionError('РќРµР»СЊР·СЏ РїРµСЂРµРІРµСЃС‚Рё РїР°СЂС‚РёСЋ СЃ РєСЂРёС‚РёС‡РµСЃРєРёРј СЃС‚Р°С‚СѓСЃРѕРј');
        return;
      }

      if (cloneStats.rootedCount <= 0) {
        setStageActionError('РЎРЅР°С‡Р°Р»Р° Р·Р°С„РёРєСЃРёСЂСѓР№С‚Рµ СѓРєРѕСЂРµРЅРёРІС€РёРµСЃСЏ СЂР°СЃС‚РµРЅРёСЏ');
        return;
      }

      if (cloneStats.currentQuantity <= 0) {
        setStageActionError('РћСЃС‚Р°С‚РѕРє РїР°СЂС‚РёРё РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ Р±РѕР»СЊС€Рµ 0');
        return;
      }
    }

    if (selectedCard.stage === stages[2]) {
      const adaptationStats = getAdaptationStats(selectedCard);

      if ((selectedCard.batchStatus || 'active') === 'quarantine') {
        setStageActionError('РџР°СЂС‚РёСЏ РІ РєР°СЂР°РЅС‚РёРЅРµ Рё РЅРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ РїРµСЂРµРІРµРґРµРЅР° РґР°Р»СЊС€Рµ');
        return;
      }

      if (selectedCard.sterilityStatus === 'contaminated') {
        setStageActionError('Р•СЃС‚СЊ Р°РєС‚РёРІРЅР°СЏ РєРѕРЅС‚Р°РјРёРЅР°С†РёСЏ');
        return;
      }

      if (adaptationStats.riskStatus === 'РљСЂРёС‚РёС‡РµСЃРєРёР№') {
        setStageActionError('РќРµР»СЊР·СЏ РїРµСЂРµРІРµСЃС‚Рё РїР°СЂС‚РёСЋ СЃ РєСЂРёС‚РёС‡РµСЃРєРёРј СЃС‚СЂРµСЃСЃРѕРј');
        return;
      }

      if (adaptationStats.stability !== 'РЎС‚Р°Р±РёР»СЊРЅР°') {
        setStageActionError('РЎРЅР°С‡Р°Р»Р° Р·Р°С„РёРєСЃРёСЂСѓР№С‚Рµ СЃС‚Р°Р±РёР»СЊРЅРѕСЃС‚СЊ РїР°СЂС‚РёРё');
        return;
      }

      if (adaptationStats.currentQuantity <= 0) {
        setStageActionError('РћСЃС‚Р°С‚РѕРє РїР°СЂС‚РёРё РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ Р±РѕР»СЊС€Рµ 0');
        return;
      }
    }

    const cloneTransitionStats = selectedCard.stage === stages[1]
      ? getCloneStats(selectedCard)
      : null;
    const nextOperation = buildStageChangeOperation({
      cloneTransitionStats,
      currentQuantity: getCardCurrentQuantity(selectedCard),
      nextStage,
      nowIso: new Date().toISOString(),
      selectedCard,
      selectedCalendarDate,
    });
    const nextCards = cultureCards.map((card) => {
      if (card.id !== selectedCard.id) {
        return card;
      }

      return buildStageTransitionCard({
        card,
        nextOperation,
        nextStage,
        nowIso: new Date().toISOString(),
        selectedCalendarDate,
        selectedStage: selectedCard.stage,
        userId: currentUser.id,
      });
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
      setStatusFormError('РџСЂРѕРёР·РІРѕРґСЃС‚РІРµРЅРЅС‹Рµ СЃРѕР±С‹С‚РёСЏ РјРѕР¶РЅРѕ С„РёРєСЃРёСЂРѕРІР°С‚СЊ С‚РѕР»СЊРєРѕ РЅР° С‚РµРєСѓС‰СѓСЋ РґР°С‚Сѓ');
      return;
    }

    const eventConfig = getStatusEventConfig(introActionType);
    const count = eventConfig.countField ? statusForm[eventConfig.countField].trim() : '';
    const {
      editedOperation,
      currentQuantity,
    } = buildStatusOperationContext({
      editingOperationId,
      selectedCard,
      selectedCardOperations,
    });
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
      setStatusFormError('РЈРєР°Р¶РёС‚Рµ РєРѕСЂСЂРµРєС‚РЅРѕРµ РєРѕР»РёС‡РµСЃС‚РІРѕ');
      return;
    }

    if (baseValidationError === 'count_gt_current') {
      setStatusFormError('РљРѕР»РёС‡РµСЃС‚РІРѕ РЅРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ Р±РѕР»СЊС€Рµ С‚РµРєСѓС‰РµРіРѕ РѕСЃС‚Р°С‚РєР°');
      return;
    }

    if (baseValidationError === 'missing_reason') {
      setStatusFormError('РЈРєР°Р¶РёС‚Рµ РїСЂРёС‡РёРЅСѓ');
      return;
    }

    if (baseValidationError === 'release_forbidden') {
      setStatusFormError('РЎРЅСЏС‚СЊ РєР°СЂР°РЅС‚РёРЅ РјРѕР¶РµС‚ С‚РѕР»СЊРєРѕ Р°РіСЂРѕРЅРѕРј РёР»Рё Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ');
      return;
    }

    if (baseValidationError === 'not_in_quarantine') {
      setStatusFormError('РџР°СЂС‚РёСЏ РЅРµ РЅР°С…РѕРґРёС‚СЃСЏ РІ РєР°СЂР°РЅС‚РёРЅРµ');
      return;
    }

    const adaptationValidationError = getAdaptationValidationError(introActionType, statusForm);

    if (adaptationValidationError === 'adaptation_stress_missing') {
      setStatusFormError('РЈРєР°Р¶РёС‚Рµ С…РѕС‚СЏ Р±С‹ РѕРґРёРЅ РїР°СЂР°РјРµС‚СЂ РЅР°Р±Р»СЋРґРµРЅРёСЏ');
      return;
    }

    if (adaptationValidationError === 'adaptation_environment_missing') {
      setStatusFormError('РЈРєР°Р¶РёС‚Рµ С…РѕС‚СЏ Р±С‹ РѕРґРёРЅ РїР°СЂР°РјРµС‚СЂ СЃСЂРµРґС‹');
      return;
    }

    if (adaptationValidationError === 'adaptation_humidity_reduction_missing') {
      setStatusFormError('РЈРєР°Р¶РёС‚Рµ СЃРЅРёР¶РµРЅРёРµ РІР»Р°Р¶РЅРѕСЃС‚Рё РёР»Рё СЃРѕСЃС‚РѕСЏРЅРёРµ РїР°СЂС‚РёРё');
      return;
    }

    if (adaptationValidationError === 'adaptation_care_type_missing') {
      setStatusFormError('РЈРєР°Р¶РёС‚Рµ С‚РёРї СѓС…РѕРґР°');
      return;
    }

    const greenhouseValidationError = getGreenhouseValidationError(introActionType, statusForm);

    if (greenhouseValidationError === 'greenhouse_observation_missing') {
      setStatusFormError('РЈРєР°Р¶РёС‚Рµ С…РѕС‚СЏ Р±С‹ РѕРґРёРЅ РїР°СЂР°РјРµС‚СЂ РЅР°Р±Р»СЋРґРµРЅРёСЏ');
      return;
    }

    if (greenhouseValidationError === 'greenhouse_care_type_missing') {
      setStatusFormError('РЈРєР°Р¶РёС‚Рµ С‚РёРї СѓС…РѕРґР°');
      return;
    }

    if (greenhouseValidationError === 'greenhouse_environment_missing') {
      setStatusFormError('РЈРєР°Р¶РёС‚Рµ С…РѕС‚СЏ Р±С‹ РѕРґРёРЅ РїР°СЂР°РјРµС‚СЂ СЃСЂРµРґС‹');
      return;
    }

    if (greenhouseValidationError === 'greenhouse_disease_missing') {
      setStatusFormError('РЈРєР°Р¶РёС‚Рµ Р±РѕР»РµР·РЅСЊ, РІСЂРµРґРёС‚РµР»СЏ РёР»Рё СѓСЂРѕРІРµРЅСЊ СЂРёСЃРєР°');
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

      return buildUpdatedStatusCard(card, {
        editingOperationId,
        introActionType,
        nextOperation,
        statusForm,
      });
    });

    await saveCultureCards(nextCards);

    if (introActionType === 'greenhouseCare' && statusForm.careType.trim() === 'РџРѕР»РёРІ') {
      const updatedCard = nextCards.find((card) => card.id === selectedCard.id);
      const wateringStats = getGreenhouseStats(updatedCard);
      const reminderPayload = buildWateringReminderPayload(updatedCard, wateringStats);

      if (reminderPayload) {
        scheduleWateringReminder(reminderPayload).catch(() => {});
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

    setStatusFormNotice('РЎРѕР±С‹С‚РёРµ СЃРѕС…СЂР°РЅРµРЅРѕ. РњРѕР¶РЅРѕ РґРѕР±Р°РІРёС‚СЊ СЃР»РµРґСѓСЋС‰РµРµ.');
  }

  async function handleSaveIntroAction() {
    if (!selectedCard || !selectedCalendarDate || !introActionType) {
      return false;
    }

    const nowIso = new Date().toISOString();
    const actionConfig = getIntroActionConfig(introActionType);
    if (!actionConfig) {
      return false;
    }

    const value = introActionForm[actionConfig.field].trim();

    if (!value) {
      setStageActionError(actionConfig.error);
      return false;
    }

    const { editedOperation } = buildStatusOperationContext({
      editingOperationId,
      selectedCard,
      selectedCardOperations,
    });
    const nextOperation = buildIntroActionOperation({
      actionConfig,
      editingOperationId,
      editedOperation,
      nowIso,
      selectedCalendarDate,
      selectedStage: selectedCard.stage || INTRO_STAGE,
      userId: currentUser.id,
      value,
    });
    const nextCards = cultureCards.map((card) => {
      if (card.id !== selectedCard.id) {
        return card;
      }

      return buildIntroActionUpdatedCard(card, {
        editingOperationId,
        introActionType,
        nextOperation,
      });
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
      setFormError('Р—Р°РїРѕР»РЅРёС‚Рµ РІСЃРµ РїРѕР»СЏ');
      return;
    }

    if (validationError === 'invalid_quantity') {
      setFormError('РљРѕР»РёС‡РµСЃС‚РІРѕ СѓРєР°Р·Р°РЅРѕ РЅРµРєРѕСЂСЂРµРєС‚РЅРѕ');
      return;
    }

    if (validationError === 'duplicate_code') {
      setFormError('РљРѕРґ СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚');
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

    const nextCards = buildSavedCultureCards(cultureCards, editingCardId, nextCard);

    await saveCultureCards(nextCards);
    closeCultureForm();
  }

  async function handleCancelCultureCard() {
    if (!editingCardId) {
      return;
    }

    const nowIso = new Date().toISOString();
    const nextCards = buildCancelledCultureCards(cultureCards, editingCardId, currentUser.id, nowIso);

    await saveCultureCards(nextCards);
    closeCultureForm();
  }

  function isRequiredFieldMissing(field) {
    return isRequiredFieldMissingInForm(cultureForm, touchedSubmit, field);
  }

  const routerState = {
    activeCardsCount,
    allVisibleStageCardsCount,
    batchStatusFilter,
    bottomInset,
    cardSearch,
    careTasks,
    calendarDays,
    calendarMonth,
    canEditCurrentIdentity,
    canSaveCultureForm: true,
    cultureCalendarTab,
    cultureForm,
    cultureOptions,
    currentScreen,
    editingOperationId,
    expandedJournalCardIds,
    filteredCultureCards,
    formError,
    getJournalFilterLabel,
    getPlantCardStatusDotStyle,
    getResolvedBatchStatus,
    groupedGlobalJournalCards,
    introActionForm,
    introActionType,
    isAdaptationStage,
    isCardsLoading,
    isCloneStage,
    isCultureIntroStage,
    isEditingCard,
    isGreenhouseStage,
    isStageMoveConfirmVisible,
    isSupportedPlantingStage,
    journalFilter,
    login,
    notice,
    openDropdown,
    operationDates,
    operationDeleteCandidateId,
    recommendationsMode,
    recommendationCard,
    recommendationEntries,
    recommendationStage,
    selectedCard,
    selectedCardActionLocked,
    selectedCardAdaptationStats,
    selectedCardCloneStats,
    selectedCardCurrentQuantity,
    selectedCardDaysInStage,
    selectedCardNextStage,
    selectedCardOperations,
    selectedCalendarDate,
    selectedDateOperations,
    selectedStage,
    selectedStageCardsCount,
    showDatePicker,
    showIdentityAsText,
    speciesOptions,
    stageActionError,
    stageMoveBlockedMessage,
    stageMoveButtonLabel,
    storageError,
    statusForm,
    statusFormError,
    statusFormNotice,
    taskCount,
    userRole,
    varietyOptions,
  };

  const routerActions = {
    cancelDeleteOperation,
    changeCalendarMonth,
    closeCultureCalendar,
    closeCultureForm,
    closeRecommendations,
    closeStatusChangeForm,
    confirmDeleteOperation,
    handleAddStageChange,
    handleClearTestData,
    handleDateChange,
    handleGenerateCode,
    handleLogout,
    handleMenuAction,
    handleSaveCultureCard,
    handleSaveIntroAction,
    handleSaveStatusChange,
    handleScanPress,
    handleScheduleWateringReminder,
    handleShareData,
    handleShareQrPress,
    handleStagePress,
    openCultureCalendar,
    openCultureForm,
    openEditCultureForm,
    openEditOperation,
    openGlobalJournal,
    openMenu,
    openSelectedCardRecommendations,
    openStatusChangeForm,
    openTaskCard,
    openTasks,
    requestDeleteOperation,
    setBatchStatusFilter,
    setCardSearch,
    setCurrentScreen,
    setCultureCalendarTab,
    setEditingOperationId,
    setExpandedJournalCardIds,
    setFormError,
    setIntroActionForm,
    setIntroActionType,
    setIsDateEntryExpanded,
    setIsStageMoveConfirmVisible,
    setJournalFilter,
    setOpenDropdown,
    setOperationDeleteCandidateId,
    setRecommendationsContext,
    setRecommendationsMode,
    setSelectedCalendarDate,
    setSelectedStage,
    setShowDatePicker,
    setStageActionError,
    setStatusForm,
    setStatusFormError,
    setStatusFormNotice,
    setTouchedSubmit,
    toggleJournalCard,
    updateCultureForm,
    updateIntroActionForm,
    updateStatusForm,
    handleSelectCulture,
    handleSelectSpecies,
    handleSelectVariety,
    isRequiredFieldMissing,
  };

  if (isAuthenticated) {
    return <AppRouter actions={routerActions} state={routerState} />;
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
    <AppErrorBoundary>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <AppContent />
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}














