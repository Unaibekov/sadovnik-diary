import { useEffect, useState } from "react";
import { Platform } from "react-native";
import {
  SafeAreaProvider,
  initialWindowMetrics,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { CameraView } from "expo-camera";
import plantsCatalog from "./data/plantsCatalog";
import styles from "./styles";
import {
  BATCH_STATUS_LABELS,
  EMPTY_CATALOG_VALUE,
  INTRO_STAGE,
  SOURCE_MATERIAL_OPTIONS,
  currentUser,
  stageMoveTargetLabels,
  stages,
} from "./src/domain/constants";
import {
  dateFromIso,
  formatDisplayDate,
  getMonthDays,
  getShiftedMonthStartDate,
  getTodayIsoDate,
} from "./src/domain/dates";
import {
  createEmptyCultureForm,
  createEmptyIntroActionForm,
  createEmptyStatusForm,
} from "./src/domain/forms";
import {
  canEditIdentityFields,
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
} from "./src/domain/batch";
import {
  buildCultureFormOptions,
  getPlantCardStatusDotStyle,
  getResolvedBatchStatus,
  getUniqueOptions,
} from "./src/domain/cardSelectors";
import {
  cultureCreateBatchStatuses,
  editableStatusOperationTypes,
  introOperationFields,
  protectedOperationTypes,
  stageHomeItems as stageHomeItemsConfig,
  statusEventCountFields,
} from "./src/domain/operationConfig";
import {
  buildGroupedGlobalJournalCards,
  getActiveCardsCount,
  filterCultureCards,
  getAllVisibleStageCardsCount,
  getSelectedStageCardsCount,
} from "./src/domain/cultureSelectors";
import {
  buildRecommendationEntries,
  removeRecommendationFields,
} from "./src/domain/recommendations";
import {
  buildCloseRecommendationsState,
  buildGlobalJournalNavigationState,
  buildMenuNavigationState,
  buildStageRecommendationsNavigationState,
  buildTasksNavigationState,
} from "./src/domain/navigation";
import { buildAppDerivedState } from "./src/domain/appDerivedState";
import {
  findCultureCardByScannedCode,
  getBottomInset,
  getOpenCultureCalendarInitialDate,
  getScannedCode,
  getTaskCardByTask,
  getUpdatedCardById,
  isDuplicateCultureCode,
} from "./src/domain/appModel";
import {
  applyCultureSelection,
  applySpeciesSelection,
  applyVarietySelection,
  buildGeneratedPlantingCode,
  isRequiredFieldMissingInForm,
} from "./src/domain/cultureForm";
import {
  buildCancelledCultureCards,
  buildCultureCardPayload,
  buildSavedCultureCards,
} from "./src/domain/cultureCardBuilder";
import { validateCultureCardInput } from "./src/domain/cultureFormValidation";
import { updateFormField } from "./src/domain/formState";
import {
  clearCultureCardsForTests,
  loadCultureCardsFromStorage,
  saveCultureCardsToStorage,
} from "./src/services/cultureCardsStorage";
import {
  buildWateringReminderPayload,
  initializeLocalNotifications,
  scheduleWateringReminder,
} from "./src/services/localNotifications";
import { shareQrCode } from "./src/services/shareQrCodeService";
import { shareCultureCardsReport } from "./src/services/shareReportService";
import {
  doesJournalEventMatchFilter,
  getGlobalJournalEvents,
  getJournalFilterLabel,
  getLatestFilledCalendarDate,
  isOperationVisibleInCurrentStage,
  buildSelectedCardJournalData,
} from "./src/domain/journal";
import { buildCareTasks } from "./src/domain/tasks";
import {
  getIntroActionConfig,
  getStatusEventConfig,
} from "./src/domain/statusOperations";
import { getStatusBaseValidationError } from "./src/domain/statusValidation";
import { getAdaptationValidationError } from "./src/domain/statusStageValidation";
import { getGreenhouseValidationError } from "./src/domain/statusGreenhouseValidation";
import { buildStatusOperation } from "./src/domain/statusOperationBuilder";
import { buildStatusFormFromOperation } from "./src/domain/statusOperationForm";
import {
  buildStageChangeOperation,
  buildStageTransitionCard,
} from "./src/domain/stageTransition";
import { buildIntroActionUpdatedCard } from "./src/domain/introActionCardBuilder";
import { buildUpdatedStatusCard } from "./src/domain/statusCardBuilder";
import { buildIntroActionOperation } from "./src/domain/introActionOperationBuilder";
import { buildStatusOperationContext } from "./src/domain/statusOperationContext";
import { buildDeletedOperationCard } from "./src/domain/operationDeletion";
import AuthScreen from "./src/screens/AuthScreen";
import AppRouter from "./AppRouter";
import AppErrorBoundary from "./AppErrorBoundary";

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();
  const bottomInset = getBottomInset(safeAreaInsets);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [focusedField, setFocusedField] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedStage, setSelectedStage] = useState("");
  const [cardSearch, setCardSearch] = useState("");
  const [cultureCards, setCultureCards] = useState([]);
  const [isCardsLoading, setIsCardsLoading] = useState(true);
  const [storageError, setStorageError] = useState("");
  const [currentScreen, setCurrentScreen] = useState("stages");
  const [isDirectoriesSheetVisible, setIsDirectoriesSheetVisible] = useState(false);
  const [cultureForm, setCultureForm] = useState(createEmptyCultureForm);
  const [statusForm, setStatusForm] = useState(createEmptyStatusForm);
  const [introActionForm, setIntroActionForm] = useState(
    createEmptyIntroActionForm,
  );
  const [introActionType, setIntroActionType] = useState("");
  const [stageActionError, setStageActionError] = useState("");
  const [batchStatusFilter, setBatchStatusFilter] = useState("all");
  const [journalFilter, setJournalFilter] = useState("important");
  const [expandedJournalCardIds, setExpandedJournalCardIds] = useState([]);
  const [formError, setFormError] = useState("");
  const [statusFormError, setStatusFormError] = useState("");
  const [statusFormNotice, setStatusFormNotice] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [openDropdown, setOpenDropdown] = useState("");
  const [touchedSubmit, setTouchedSubmit] = useState(false);
  const [editingCardId, setEditingCardId] = useState(null);
  const [editingOperationId, setEditingOperationId] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState("");
  const [cultureCalendarTab, setCultureCalendarTab] = useState("calendar");
  const [isDateEntryExpanded, setIsDateEntryExpanded] = useState(false);
  const [isStageMoveConfirmVisible, setIsStageMoveConfirmVisible] =
    useState(false);
  const [operationDeleteCandidateId, setOperationDeleteCandidateId] =
    useState(null);
  const [recommendationsContext, setRecommendationsContext] = useState(null);
  const [recommendationsMode, setRecommendationsMode] = useState("current");
  const {
    activeCardsCount,
    allVisibleStageCardsCount,
    careTasks,
    canEditCurrentIdentity,
    canReleaseQuarantine,
    calendarDays,
    cultureOptions,
    editingCard,
    filteredCultureCards,
    globalJournalEvents,
    groupedGlobalJournalCards,
    isSelectedCloneCard,
    isSupportedPlantingStage,
    operationDates,
    recommendationCard,
    recommendationEntries,
    recommendationSourceCards,
    recommendationStage,
    selectedCard,
    selectedCardActionLocked,
    selectedCardAdaptationStats,
    selectedCardCalendarOperations,
    selectedCardCloneStats,
    selectedCardCurrentQuantity,
    selectedCardDaysInStage,
    selectedCardNextStage,
    selectedCardOperations,
    selectedDateOperations,
    selectedStageCardsCount,
    selectedStageFlags,
    showIdentityAsText,
    speciesOptions,
    stageMoveBlockedMessage,
    stageMoveButtonLabel,
    varietyOptions,
  } = buildAppDerivedState({
    batchStatusFilter,
    cardSearch,
    calendarMonth,
    cultureCards,
    cultureForm,
    currentUser,
    editingCardId,
    journalFilter,
    recommendationsContext,
    recommendationsMode,
    selectedCalendarDate,
    selectedCardId,
    selectedStage,
  });
  const {
    isAdaptationStage,
    isCloneStage,
    isCultureIntroStage,
    isGreenhouseStage,
  } = selectedStageFlags;
  const isEditingCard = Boolean(editingCardId);
  const taskCount = careTasks.length;

  useEffect(() => {
    loadCultureCards();
    initializeLocalNotifications().catch(() => {});
  }, []);

  useEffect(() => {
    if (currentScreen !== "menu" && isDirectoriesSheetVisible) {
      setIsDirectoriesSheetVisible(false);
    }
  }, [currentScreen, isDirectoriesSheetVisible]);

  async function loadCultureCards() {
    try {
      const savedCards = (await loadCultureCardsFromStorage()).map(
        removeRecommendationFields,
      );
      setCultureCards(savedCards);
      setStorageError("");
    } catch (loadError) {
      setStorageError(
        "Не удалось загрузить локальные данные",
      );
    } finally {
      setIsCardsLoading(false);
    }
  }

  async function saveCultureCards(nextCards) {
    try {
      const cardsWithoutRecommendations = nextCards.map(
        removeRecommendationFields,
      );
      await saveCultureCardsToStorage(cardsWithoutRecommendations);
      setCultureCards(cardsWithoutRecommendations);
      setStorageError("");
    } catch (saveError) {
      setStorageError(
        "Не удалось сохранить локальные данные",
      );
    }
  }

  function handleLogin() {
    setNotice("");
    setError("");
    setIsAuthenticated(true);
  }

  function handleForgotPassword() {
    setError("");
    setNotice(
      "Восстановление пароля будет добавлено на следующем шаге.",
    );
  }

  function handleRegister() {
    setError("");
    setNotice(
      "Регистрация будет добавлена отдельно. Роль назначает суперадминистратор.",
    );
  }

  function toggleJournalCard(cardId) {
    setExpandedJournalCardIds((currentIds) =>
      currentIds.includes(cardId)
        ? currentIds.filter((currentId) => currentId !== cardId)
        : [...currentIds, cardId],
    );
  }

  function handleStagePress(stage) {
    setSelectedStage(stage);
    setCurrentScreen("cultureList");
  }

  function openGlobalJournal() {
    const nextState = buildGlobalJournalNavigationState();
    setSelectedStage("");
    setSelectedCardId(null);
    setSelectedCalendarDate("");
    setJournalFilter(nextState.journalFilter);
    setExpandedJournalCardIds(nextState.expandedJournalCardIds);
    setCurrentScreen(nextState.currentScreen);
  }

  function openTasks() {
    const nextState = buildTasksNavigationState();
    setSelectedStage("");
    setSelectedCardId(null);
    setSelectedCalendarDate("");
    setCurrentScreen(nextState.currentScreen);
    setNotice(nextState.notice);
  }

  function openMenu() {
    const nextState = buildMenuNavigationState();
    setSelectedStage("");
    setSelectedCardId(null);
    setSelectedCalendarDate("");
    setIsDirectoriesSheetVisible(false);
    setCurrentScreen(nextState.currentScreen);
    setNotice(nextState.notice);
  }

  function openDirectories() {
    setSelectedStage("");
    setSelectedCardId(null);
    setSelectedCalendarDate("");
    setCurrentScreen("menu");
    setIsDirectoriesSheetVisible(true);
  }

  function closeDirectories() {
    setIsDirectoriesSheetVisible(false);
  }

  function openSupport() {
    setSelectedStage("");
    setSelectedCardId(null);
    setSelectedCalendarDate("");
    setIsDirectoriesSheetVisible(false);
    setCurrentScreen("support");
  }

  async function handleScanPress() {
    if (Platform.OS === "web") {
      setNotice(
        "QR-сканер доступен только в мобильном приложении.",
      );
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

        if (Platform.OS === "ios") {
          await CameraView.dismissScanner();
        }

        const scannedCode = getScannedCode(event);
        const matchedCard = findCultureCardByScannedCode(
          cultureCards,
          scannedCode,
        );

        if (!matchedCard) {
          setNotice(
            scannedCode
              ? `Карточка с QR-кодом ${scannedCode} не найдена.`
              : "QR-код найден, но его значение пустое.",
          );
          return;
        }

        setSelectedStage(matchedCard.stage || INTRO_STAGE);
        openCultureCalendar(matchedCard);
        setNotice(
          `Открыта карточка: ${getCardDisplayName(matchedCard)}.`,
        );
      });

      await CameraView.launchScanner({
        barcodeTypes: ["qr"],
      });
    } catch (scanError) {
      setNotice("Не удалось открыть сканер QR-кода.");
    } finally {
      subscription?.remove();
    }
  }

  async function handleShareQrPress(card) {
    try {
      const shareResult = await shareQrCode(card?.code);

      if (shareResult === "web_ready") {
        setNotice("QR-код подготовлен для отправки.");
        return;
      }

      if (shareResult === "native_unavailable") {
        setNotice(
          "Системное отправление недоступно, QR-код подготовлен текстом.",
        );
        return;
      }

      setNotice(
        "QR-код отправлен через системное меню.",
      );
    } catch (shareError) {
      setNotice("Не удалось отправить QR-код.");
    }
  }

  function openTaskCard(task) {
    const taskCard = getTaskCardByTask(cultureCards, task);

    if (!taskCard) {
      setNotice("Партия для задачи не найдена.");
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

      if (shareResult === "web_ready") {
        setNotice("Excel-отчет подготовлен.");
        return;
      }

      if (shareResult === "native_unavailable") {
        setNotice(
          "Отправка Excel-файла недоступна на устройстве.",
        );
        return;
      }

      setNotice("Excel-файл отчета готов к отправке.");
    } catch (shareError) {
      setNotice("Не удалось подготовить Excel-отчет.");
    }
  }
  async function handleScheduleWateringReminder() {
    try {
      await scheduleWateringReminder({
        body: "Тестовое напоминание: пора проверить полив.",
        date: new Date(Date.now() + 60 * 1000),
      });
      setNotice(
        "Напоминание о поливе запланировано через 1 минуту.",
      );
    } catch (notificationError) {
      setNotice(
        "Не удалось включить уведомления. Проверьте разрешения телефона.",
      );
    }
  }

  function openStageRecommendations() {
    const nextState = buildStageRecommendationsNavigationState(selectedStage);
    setRecommendationsContext({
      ...nextState.recommendationsContext,
      backScreen: "cultureList",
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
    setRecommendationsMode("current");
    setCurrentScreen("recommendations");
  }

  function closeRecommendations() {
    const nextState = buildCloseRecommendationsState(
      recommendationsContext?.backScreen || "cultureList",
    );
    setRecommendationsContext(nextState.recommendationsContext);
    setRecommendationsMode(nextState.recommendationsMode);
    setCurrentScreen(nextState.currentScreen);
  }

  function handleLogout() {
    setSelectedStage("");
    setCurrentScreen("stages");
    setSelectedCardId(null);
    setSelectedCalendarDate("");
    setIsAuthenticated(false);
  }

  async function handleClearTestData() {
    try {
      await clearCultureCardsForTests();
      setCultureCards([]);
      setSelectedStage("");
      setSelectedCardId(null);
      setSelectedCalendarDate("");
      setEditingCardId(null);
      setEditingOperationId(null);
      setCultureForm(createEmptyCultureForm());
      setStatusForm(createEmptyStatusForm());
      setIntroActionForm(createEmptyIntroActionForm());
      setIntroActionType("");
      setCultureCalendarTab("calendar");
      setIsDateEntryExpanded(false);
      setCurrentScreen("stages");
      setStorageError("");
      setNotice(
        "Карточки стадий и журнал очищены.",
      );
    } catch (clearError) {
      setStorageError(
        "Не удалось очистить карточки стадий",
      );
    }
  }

  function updateCultureForm(field, value) {
    setCultureForm((currentForm) => updateFormField(currentForm, field, value));
  }

  function updateStatusForm(field, value) {
    setStatusForm((currentForm) => updateFormField(currentForm, field, value));
  }

  function updateIntroActionForm(field, value) {
    setIntroActionForm((currentForm) =>
      updateFormField(currentForm, field, value),
    );
  }

  function openCultureForm() {
    setCultureForm(createEmptyCultureForm());
    setFormError("");
    setShowDatePicker(false);
    setOpenDropdown("");
    setTouchedSubmit(false);
    setEditingCardId(null);
    setCurrentScreen("cultureForm");
  }

  function openEditCultureForm(card) {
    setCultureForm({
      ...createEmptyCultureForm(),
      ...removeRecommendationFields(card),
      qrPrinted: card.qrPrinted || false,
      qrPrintedAt: card.qrPrintedAt || null,
      qrPrintedBy: card.qrPrintedBy || null,
    });
    setFormError("");
    setShowDatePicker(false);
    setOpenDropdown("");
    setTouchedSubmit(false);
    setEditingCardId(card.id);
    setCurrentScreen("cultureForm");
  }

  function openCultureCalendar(card) {
    const initialDate = getOpenCultureCalendarInitialDate(card);

    setSelectedCardId(card.id);
    setSelectedCalendarDate(initialDate);
    setCultureCalendarTab("calendar");
    setIsDateEntryExpanded(false);
    setIntroActionType("");
    setIntroActionForm(createEmptyIntroActionForm());
    setStageActionError("");
    setCalendarMonth(dateFromIso(initialDate));
    setCurrentScreen("cultureCalendar");
  }

  function closeCultureForm() {
    setCultureForm(createEmptyCultureForm());
    setFormError("");
    setShowDatePicker(false);
    setOpenDropdown("");
    setTouchedSubmit(false);
    setEditingCardId(null);
    setCurrentScreen("cultureList");
  }

  function closeCultureCalendar() {
    setSelectedCardId(null);
    setSelectedCalendarDate("");
    setCultureCalendarTab("calendar");
    setIsDateEntryExpanded(false);
    setIntroActionType("");
    setIntroActionForm(createEmptyIntroActionForm());
    setEditingOperationId(null);
    setIsStageMoveConfirmVisible(false);
    setStageActionError("");
    setCurrentScreen("cultureList");
  }

  function openStatusChangeForm() {
    if (!selectedCard || !selectedCalendarDate) {
      return;
    }

    setStatusForm(createEmptyStatusForm());
    setEditingOperationId(null);
    setIntroActionType(
      selectedCard.stage === stages[2]
        ? "adaptationStress"
        : selectedCard.stage === stages[3]
          ? "greenhouseObservation"
          : "rooting",
    );
    setStatusFormError("");
    setStatusFormNotice("");
    setCurrentScreen("statusChangeForm");
  }

  function closeStatusChangeForm() {
    setStatusForm(createEmptyStatusForm());
    setEditingOperationId(null);
    setStatusFormError("");
    setStatusFormNotice("");
    setIntroActionType("");
    setCurrentScreen("cultureCalendar");
  }

  function openEditOperation(operation) {
    if (!selectedCard || !operation) {
      return;
    }

    const operationDate =
      operation.date || selectedCalendarDate || getTodayIsoDate();

    setSelectedCalendarDate(operationDate);
    setCalendarMonth(dateFromIso(operationDate));
    setEditingOperationId(operation.id);
    setStatusFormError("");
    setStatusFormNotice("");
    setStageActionError("");

    if (
      selectedCard.stage === INTRO_STAGE &&
      introOperationFields[operation.type]
    ) {
      setIntroActionType(operation.type);
      setIntroActionForm({
        ...createEmptyIntroActionForm(),
        [introOperationFields[operation.type]]:
          operation[introOperationFields[operation.type]] || "",
      });
      setIsDateEntryExpanded(true);
      setCultureCalendarTab("calendar");
      setCurrentScreen("introActionForm");
      return;
    }

    if (editableStatusOperationTypes.includes(operation.type)) {
      const countField = statusEventCountFields[operation.type];

      setIntroActionType(operation.type);
      setStatusForm({
        ...createEmptyStatusForm(),
        ...buildStatusFormFromOperation(operation, countField),
      });
      setCurrentScreen("statusChangeForm");
    }
  }

  async function deleteOperation(operationId) {
    if (!selectedCard || !operationId) {
      return;
    }

    const nextCards = cultureCards.map((card) =>
      card.id === selectedCard.id
        ? buildDeletedOperationCard(card, operationId)
        : card,
    );

    await saveCultureCards(nextCards);

    if (editingOperationId === operationId) {
      setEditingOperationId(null);
      setIntroActionType("");
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

    setCultureForm((currentForm) =>
      applyCultureSelection(currentForm, cultureName),
    );
    setOpenDropdown("");
  }

  function handleSelectSpecies(speciesName) {
    if (!canEditCurrentIdentity) {
      return;
    }

    setCultureForm((currentForm) =>
      applySpeciesSelection(currentForm, speciesName),
    );
    setOpenDropdown("");
  }

  function handleSelectVariety(varietyName) {
    if (!canEditCurrentIdentity) {
      return;
    }

    setCultureForm((currentForm) =>
      applyVarietySelection(currentForm, varietyName, plantsCatalog),
    );
    setOpenDropdown("");
  }

  function handleDateChange(event, selectedDate) {
    if (!canEditCurrentIdentity) {
      return;
    }

    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (!selectedDate) {
      return;
    }

    updateCultureForm("createdAt", isoFromDate(selectedDate));
  }

  function handleGenerateCode() {
    if (!canEditCurrentIdentity) {
      return;
    }

    const { code, isDuplicateCode } = buildGeneratedPlantingCode({
      cultureCards,
      createdAt: cultureForm.createdAt,
      selectedStage,
      editingCardId,
    });
    if (isDuplicateCode) {
      setFormError(
        "Код уже существует. Сгенерируйте код ещё раз.",
      );
      return;
    }

    setCultureForm((currentForm) => ({
      ...currentForm,
      code,
      qrStatus: "pending_print",
    }));
    setFormError("");
  }

  function changeCalendarMonth(monthOffset) {
    setCalendarMonth((currentDate) =>
      getShiftedMonthStartDate(currentDate, monthOffset),
    );
    setSelectedCalendarDate("");
  }

  async function handleAddStageChange() {
    if (!selectedCard || !selectedCalendarDate) {
      return;
    }

    const nextStage = getNextStage(selectedCard.stage);

    if (!nextStage) {
      return;
    }

    if (selectedCard.sterilityStatus === "contaminated") {
      setStageActionError(
        "Материал заражён: переход стадии заблокирован до решения администратора или агронома",
      );
      return;
    }

    if (selectedCard.stage === INTRO_STAGE) {
      if ((selectedCard.batchStatus || "active") !== "active") {
        setStageActionError(
          "Перевести можно только активную партию",
        );
        return;
      }

      if (getQrStatus(selectedCard) === "none") {
        setStageActionError("QR-код ещё не создан");
        return;
      }
    }

    if (selectedCard.stage === stages[1]) {
      const cloneStats = getCloneStats(selectedCard);

      if ((selectedCard.batchStatus || "active") === "quarantine") {
        setStageActionError(
          "Партия в карантине и не может быть переведена дальше",
        );
        return;
      }

      if (
        (selectedCard.batchStatus || "active") === "problem" ||
        cloneStats.riskStatus === "Критический"
      ) {
        setStageActionError(
          "Нельзя перевести партию с критическим статусом",
        );
        return;
      }

      if (cloneStats.rootedCount <= 0) {
        setStageActionError(
          "Сначала зафиксируйте укоренившиеся растения",
        );
        return;
      }

      if (cloneStats.currentQuantity <= 0) {
        setStageActionError(
          "Остаток партии должен быть больше 0",
        );
        return;
      }
    }

    if (selectedCard.stage === stages[2]) {
      const adaptationStats = getAdaptationStats(selectedCard);

      if ((selectedCard.batchStatus || "active") === "quarantine") {
        setStageActionError(
          "Партия в карантине и не может быть переведена дальше",
        );
        return;
      }

      if (selectedCard.sterilityStatus === "contaminated") {
        setStageActionError(
          "Есть активная контаминация",
        );
        return;
      }

      if (adaptationStats.riskStatus === "Критический") {
        setStageActionError(
          "Нельзя перевести партию с критическим стрессом",
        );
        return;
      }

      if (adaptationStats.stability !== "Стабильна") {
        setStageActionError(
          "Сначала зафиксируйте стабильность партии",
        );
        return;
      }

      if (adaptationStats.currentQuantity <= 0) {
        setStageActionError(
          "Остаток партии должен быть больше 0",
        );
        return;
      }
    }

    const cloneTransitionStats =
      selectedCard.stage === stages[1] ? getCloneStats(selectedCard) : null;
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
    setStageActionError("");
    setSelectedStage(nextStage);
    setCurrentScreen("cultureList");
    setSelectedCardId(null);
    setSelectedCalendarDate("");
  }

  async function handleSaveStatusChange() {
    if (!selectedCard || !selectedCalendarDate) {
      return;
    }

    if (selectedCalendarDate !== getTodayIsoDate()) {
      setStatusFormError(
        "Производственные события можно фиксировать только на текущую дату",
      );
      return;
    }

    const eventConfig = getStatusEventConfig(introActionType);
    const count = eventConfig.countField
      ? statusForm[eventConfig.countField].trim()
      : "";
    const { editedOperation, currentQuantity } = buildStatusOperationContext({
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

    if (baseValidationError === "invalid_count") {
      setStatusFormError(
        "Укажите корректное количество",
      );
      return;
    }

    if (baseValidationError === "count_gt_current") {
      setStatusFormError(
        "Количество не может быть больше текущего остатка",
      );
      return;
    }

    if (baseValidationError === "missing_reason") {
      setStatusFormError("Укажите причину");
      return;
    }

    if (baseValidationError === "release_forbidden") {
      setStatusFormError(
        "Снять карантин может только агроном или администратор",
      );
      return;
    }

    if (baseValidationError === "not_in_quarantine") {
      setStatusFormError(
        "Партия не находится в карантине",
      );
      return;
    }

    const adaptationValidationError = getAdaptationValidationError(
      introActionType,
      statusForm,
    );

    if (adaptationValidationError === "adaptation_stress_missing") {
      setStatusFormError(
        "Укажите хотя бы один параметр наблюдения",
      );
      return;
    }

    if (adaptationValidationError === "adaptation_environment_missing") {
      setStatusFormError(
        "Укажите хотя бы один параметр среды",
      );
      return;
    }

    if (adaptationValidationError === "adaptation_humidity_reduction_missing") {
      setStatusFormError(
        "Укажите снижение влажности или состояние партии",
      );
      return;
    }

    if (adaptationValidationError === "adaptation_care_type_missing") {
      setStatusFormError("Укажите тип ухода");
      return;
    }

    const greenhouseValidationError = getGreenhouseValidationError(
      introActionType,
      statusForm,
    );

    if (greenhouseValidationError === "greenhouse_observation_missing") {
      setStatusFormError(
        "Укажите хотя бы один параметр наблюдения",
      );
      return;
    }

    if (greenhouseValidationError === "greenhouse_care_type_missing") {
      setStatusFormError("Укажите тип ухода");
      return;
    }

    if (greenhouseValidationError === "greenhouse_environment_missing") {
      setStatusFormError(
        "Укажите хотя бы один параметр среды",
      );
      return;
    }

    if (greenhouseValidationError === "greenhouse_disease_missing") {
      setStatusFormError(
        "Укажите болезнь, вредителя или уровень риска",
      );
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

    if (
      introActionType === "greenhouseCare" &&
      statusForm.careType.trim() === "Полив"
    ) {
      const updatedCard = getUpdatedCardById(nextCards, selectedCard.id);
      const wateringStats = getGreenhouseStats(updatedCard);
      const reminderPayload = buildWateringReminderPayload(
        updatedCard,
        wateringStats,
      );

      if (reminderPayload) {
        scheduleWateringReminder(reminderPayload).catch(() => {});
      }
    }

    const wasEditingOperation = Boolean(editingOperationId);

    setStatusForm(createEmptyStatusForm());
    setEditingOperationId(null);
    setStatusFormError("");

    if (wasEditingOperation) {
      setStatusFormNotice("");
      setCurrentScreen("cultureCalendar");
      return;
    }

    setStatusFormNotice(
      "Событие сохранено. Можно добавить следующее.",
    );
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
    setIntroActionType("");
    setStageActionError("");
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
    const isDuplicateCode = isDuplicateCultureCode(
      cultureCards,
      code,
      editingCardId,
    );
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
    if (validationError === "missing_fields") {
      setFormError("Заполните все поля");
      return;
    }

    if (validationError === "invalid_quantity") {
      setFormError(
        "Количество указано некорректно",
      );
      return;
    }

    if (validationError === "duplicate_code") {
      setFormError("Код уже существует");
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

    const nextCards = buildSavedCultureCards(
      cultureCards,
      editingCardId,
      nextCard,
    );

    await saveCultureCards(nextCards);
    closeCultureForm();
  }

  async function handleCancelCultureCard() {
    if (!editingCardId) {
      return;
    }

    const nowIso = new Date().toISOString();
    const nextCards = buildCancelledCultureCards(
      cultureCards,
      editingCardId,
      currentUser.id,
      nowIso,
    );

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
    isDirectoriesSheetVisible,
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
    userRole: currentUser.role,
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
    openDirectories,
    closeDirectories,
    openSupport,
    handleSaveCultureCard,
    handleSaveIntroAction,
    handleSaveStatusChange,
    handleScanPress,
    handleScheduleWateringReminder,
    handleShareData,
    handleShareQrPress,
    handleStagePress,
    openStageRecommendations,
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
