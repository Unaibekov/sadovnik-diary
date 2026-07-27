import { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
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
  AUTH_TEST_LOGIN,
  AUTH_TEST_PASSWORD,
  INTRO_STAGE,
  currentUser,
  stages,
} from "./src/domain/constants";
import {
  dateFromIso,
  getShiftedMonthStartDate,
  getTodayIsoDate,
} from "./src/domain/dates";
import {
  createEmptyCultureForm,
  createEmptyIntroActionForm,
  createEmptyStatusForm,
} from "./src/domain/forms";
import {
  getAdaptationStats,
  getCardCurrentQuantity,
  getCardDisplayName,
  getCloneStats,
  getDaysInCurrentStage,
  getGreenhouseStats,
  getLatestActiveProblemOperation,
  getNextStage,
  getQrStatus,
} from "./src/domain/batch";
import {
  getResolvedBatchStatus,
} from "./src/domain/cardSelectors";
import {
  introOperationFields,
  protectedOperationTypes,
  stageHomeItems as stageHomeItemsConfig,
  statusEventCountFields,
} from "./src/domain/operationConfig";
import { removeRecommendationFields } from "./src/domain/recommendations";
import {
  buildCloseRecommendationsState,
  buildDirectoriesNavigationState,
  buildGlobalJournalNavigationState,
  buildMenuNavigationState,
  buildSelectedCardRecommendationsNavigationState,
  buildStagePressNavigationState,
  buildStageRecommendationsNavigationState,
  buildTasksNavigationState,
} from "./src/domain/navigation";
import { buildAppDerivedState } from "./src/domain/appDerivedState";
import {
  findCultureCardByScannedCode,
  getBottomInset,
  getScannedCode,
  getTaskCardByTask,
  getUpdatedCardById,
  isDuplicateCultureCode,
} from "./src/domain/appModel";
import {
  buildCultureFormGeneratedCodeState,
  buildCultureFormSelectionResult,
  isRequiredFieldMissingInForm,
} from "./src/domain/cultureForm";
import {
  buildCultureCardCancelResult,
  buildCultureCardSaveResult,
} from "./src/domain/cultureCardSave";
import {
  buildDevelopmentCoverageTestCultureCards,
  buildEmptyIntroCultureCards,
} from "./src/domain/testDataGenerator";
import { validateCultureCardInput } from "./src/domain/cultureFormValidation";
import { updateFormField } from "./src/domain/formState";
import { isRenderablePhotoUri } from "./src/domain/photoUri";
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
import { shareAdminReportZip } from "./src/services/shareZipReportService";
import {
  authenticateWithBiometrics,
  loadEmployeeProfile,
  getQuickAuthBiometricInfo,
  loadQuickAuthState,
  clearEmployeeProfile,
  saveBiometricEnabled,
  saveEmployeeProfile,
  saveQuickAuthPin,
  saveQuickAuthPassword,
} from "./src/services/quickAuth";
import { getJournalFilterLabel } from "./src/domain/journal";
import {
  getIntroActionConfig,
  getStatusEventConfig,
} from "./src/domain/statusOperations";
import { buildStatusOperation } from "./src/domain/statusOperationBuilder";
import {
  attachChildToOperation,
  attachPropagationChildToOperation,
  buildDerivedChildBatch,
  buildPropagationChildCard,
} from "./src/domain/propagationChildCard";
import {
  buildStageChangeOperation,
  buildStageTransitionCard,
} from "./src/domain/stageTransition";
import { buildUpdatedStatusCard } from "./src/domain/statusCardBuilder";
import { buildStatusOperationContext } from "./src/domain/statusOperationContext";
import { buildDeletedOperationCards } from "./src/domain/operationDeletion";
import { getStageMoveValidationError } from "./src/domain/stageMoveValidation";
import {
  getStatusChangeValidationError,
  getStatusChangeValidationMessage,
  STATUS_DATE_NOT_TODAY_MESSAGE,
} from "./src/domain/statusChangeValidation";
import { buildIntroActionSaveResult } from "./src/domain/introActionSave";
import { buildTestDataResetState } from "./src/domain/testDataReset";
import { buildOperationEditState } from "./src/domain/operationEditState";
import { buildCultureCalendarOpenState } from "./src/domain/cultureCalendarState";
import { buildCultureCalendarCloseState } from "./src/domain/cultureCalendarCloseState";
import {
  buildStatusChangeCloseState,
  buildStatusChangeOpenState,
} from "./src/domain/statusChangeState";
import {
  buildCultureFormCloseState,
  buildCultureDateChangeResult,
  buildCultureFormEditState,
  buildCultureFormOpenState,
} from "./src/domain/cultureFormState";
import { buildLogoutState } from "./src/domain/logoutState";
import {
  buildRegisterState,
} from "./src/domain/authState";
import { buildTaskCardOpenState } from "./src/domain/tasks";
import {
  getShareQrNotice,
  getShareZipReportNotice,
} from "./src/domain/shareNotice";
import { getWateringReminderNotice } from "./src/domain/notificationNotice";
import {
  getScanErrorNotice,
  getScanNotice,
  getScanWebNotice,
} from "./src/domain/scanNotice";
import AuthScreen from "./src/screens/AuthScreen";
import AppRouter from "./AppRouter";
import AppErrorBoundary from "./AppErrorBoundary";

function normalizeEmployeeValue(value) {
  return `${value || ""}`
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function buildEmployeeProfile(firstName, lastName) {
  const normalizedFirstName = `${firstName || ""}`.trim();
  const normalizedLastName = `${lastName || ""}`.trim();
  const displayName = `${normalizedFirstName} ${normalizedLastName}`.trim();
  const localUserId = `${normalizeEmployeeValue(normalizedFirstName)}-${normalizeEmployeeValue(normalizedLastName)}`
    .replace(/[^a-z0-9а-яё-]+/giu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return {
    displayName,
    firstName: normalizedFirstName,
    lastName: normalizedLastName,
    localUserId: localUserId || "employee",
  };
}

function beginPinAuthFlow({
  hasPin,
  setAuthMode,
  setAuthPinStep,
  setQuickAuthPinInput,
  setQuickAuthPinConfirm,
}) {
  setAuthMode(hasPin ? "pinUnlock" : "pinSetup");
  setAuthPinStep(hasPin ? "unlock" : "setup");
  setQuickAuthPinInput("");
  setQuickAuthPinConfirm("");
}

const NATIVE_PHOTO_MAX_SIDE = 1600;
const NATIVE_PHOTO_COMPRESSION = 0.7;

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();
  const bottomInset = getBottomInset(safeAreaInsets);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [focusedField, setFocusedField] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authStep, setAuthStep] = useState("credentials");
  const [employeeFirstName, setEmployeeFirstName] = useState("");
  const [employeeLastName, setEmployeeLastName] = useState("");
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [quickAuthPin, setQuickAuthPin] = useState("");
  const [quickAuthPinInput, setQuickAuthPinInput] = useState("");
  const [quickAuthPinConfirm, setQuickAuthPinConfirm] = useState("");
  const [authPassword, setAuthPassword] = useState(AUTH_TEST_PASSWORD);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [biometricDescription, setBiometricDescription] = useState("");
  const [authMode, setAuthMode] = useState("credentials");
  const [authPinStep, setAuthPinStep] = useState("unlock");
  const [isBiometricPromptVisible, setIsBiometricPromptVisible] =
    useState(false);
  const [selectedStage, setSelectedStage] = useState("");
  const [cardSearch, setCardSearch] = useState("");
  const [cultureCards, setCultureCards] = useState([]);
  const [isCardsLoading, setIsCardsLoading] = useState(true);
  const [isReportGenerating, setIsReportGenerating] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [currentScreen, setCurrentScreen] = useState("stages");
  const [cultureForm, setCultureForm] = useState(createEmptyCultureForm);
  const [statusForm, setStatusForm] = useState(createEmptyStatusForm);
  const [introActionForm, setIntroActionForm] = useState(
    createEmptyIntroActionForm,
  );
  const [introActionPhotoUrisByType, setIntroActionPhotoUrisByType] = useState({});
  const [introActionType, setIntroActionType] = useState("");
  const [stageActionError, setStageActionError] = useState("");
  const [isDateActionErrorVisible, setIsDateActionErrorVisible] = useState(false);
  const [batchStatusFilter, setBatchStatusFilter] = useState("all");
  const [journalFilter, setJournalFilter] = useState("all");
  const [journalSubFilter, setJournalSubFilter] = useState("all");
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
    calendarDays,
    cultureOptions,
    editingCard,
    filteredCultureCards,
    globalJournalEvents,
    groupedGlobalJournalCards,
    journalSubFilterCounts,
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
    selectedCardPlantingStats,
    selectedCardNextStage,
    selectedCardOperations,
    selectedDateOperations,
    selectedStageCardsCount,
    stageStatusFilterCounts,
    selectedStageFlags,
    showIdentityAsText,
    speciesOptions,
    stageMoveBlockedMessage,
    stageMoveButtonLabel,
    stageMoveHint,
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
    journalSubFilter,
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
    let isActive = true;

    async function loadQuickAuthSettings() {
      try {
        const [quickAuthState, biometricInfo, employeeProfile] = await Promise.all([
          loadQuickAuthState(),
          getQuickAuthBiometricInfo(),
          loadEmployeeProfile(),
        ]);

        if (!isActive) {
          return;
        }

        setQuickAuthPin(quickAuthState.pinCode);
        setIsBiometricEnabled(quickAuthState.biometricEnabled);
        setAuthPassword(quickAuthState.password || AUTH_TEST_PASSWORD);
        setIsBiometricAvailable(biometricInfo.available);
        setBiometricDescription(biometricInfo.description);
        setAuthMode(quickAuthState.pinCode ? "pinUnlock" : "credentials");
        setAuthPinStep(quickAuthState.pinCode ? "unlock" : "setup");
        setQuickAuthPinInput("");
        setQuickAuthPinConfirm("");
        setCurrentEmployee(employeeProfile);
        setEmployeeFirstName(employeeProfile?.firstName || "");
        setEmployeeLastName(employeeProfile?.lastName || "");
        setAuthStep("credentials");
      } catch {
        if (isActive) {
          setIsBiometricAvailable(false);
          setBiometricDescription("");
          setCurrentEmployee(null);
          setEmployeeFirstName("");
          setEmployeeLastName("");
          setAuthMode("credentials");
          setAuthPinStep("setup");
          setAuthStep("credentials");
        }
      }
    }

    loadQuickAuthSettings();

    return () => {
      isActive = false;
    };
  }, []);

  async function loadCultureCards() {
    try {
      const savedCards = (await loadCultureCardsFromStorage()).map(
        removeRecommendationFields,
      );
      setCultureCards(savedCards);
      setStorageError("");
    } catch (loadError) {
      setStorageError("Не удалось загрузить локальные данные");
    } finally {
      setIsCardsLoading(false);
    }
  }

  async function saveCultureCards(nextCards) {
    const cardsWithoutRecommendations = nextCards.map(
      removeRecommendationFields,
    );
    const compactCards = await compactCultureCardsForStorage(
      cardsWithoutRecommendations,
    );

    try {
      await saveCultureCardsToStorage(compactCards);
      setCultureCards(compactCards);
      setStorageError("");
    } catch (saveError) {
      console.error("saveCultureCardsToStorage failed", saveError);
      setStorageError("Не удалось сохранить локальные данные");
    }
  }

  function resetSelectedCardContext() {
    setSelectedStage("");
    setSelectedCardId(null);
    setSelectedCalendarDate("");
  }

  async function handleLogin() {
    const normalizedLogin = login.trim();
    const normalizedPassword = password.trim();

    if (!normalizedLogin) {
      setError("Введите логин");
      setNotice("");
      setFocusedField("login");
      return;
    }

    if (!normalizedPassword) {
      setError("Введите пароль");
      setNotice("");
      setFocusedField("password");
      return;
    }

    if (normalizedLogin !== AUTH_TEST_LOGIN || normalizedPassword !== authPassword) {
      setError("Неверный логин и пароль");
      setNotice("");
      return;
    }

    setError("");
    setNotice("");

    const storedEmployee = currentEmployee || (await loadEmployeeProfile());

    if (storedEmployee) {
      setCurrentEmployee(storedEmployee);
      setEmployeeFirstName(storedEmployee.firstName || "");
      setEmployeeLastName(storedEmployee.lastName || "");
      setAuthStep("credentials");
      setFocusedField("");
      beginPinAuthFlow({
        hasPin: Boolean(quickAuthPin),
        setAuthMode,
        setAuthPinStep,
        setQuickAuthPinInput,
        setQuickAuthPinConfirm,
      });
      return;
    }

    setAuthStep("employee");
    setEmployeeFirstName("");
    setEmployeeLastName("");
    setFocusedField("employeeFirstName");
  }


  async function submitQuickAuthPinValue(pinValue) {
    const normalizedPin = pinValue.trim();

    if (normalizedPin.length !== 4) {
      return;
    }

    setError("");
    setNotice("");

    if (authMode === "pinSetup") {
      if (authPinStep === "setup") {
        setQuickAuthPinConfirm(normalizedPin);
        setQuickAuthPinInput("");
        setAuthPinStep("confirm");
        setNotice("Повторите PIN еще раз");
        return;
      }

      if (authPinStep === "confirm") {
        if (normalizedPin !== quickAuthPinConfirm) {
          setError("PIN не совпадает. Попробуйте еще раз.");
          setNotice("");
          setQuickAuthPinInput("");
          setQuickAuthPinConfirm("");
          setAuthPinStep("setup");
          return;
        }

        try {
          await saveQuickAuthPin(normalizedPin);
          setQuickAuthPin(normalizedPin);
          setQuickAuthPinInput("");
          setQuickAuthPinConfirm("");
          setAuthPinStep("unlock");
          setAuthMode("pinUnlock");
          setNotice("PIN сохранён");

          if (isBiometricAvailable) {
            setIsBiometricPromptVisible(true);
          } else {
            setIsAuthenticated(true);
          }
        } catch {
          setError("Не удалось сохранить PIN");
          setQuickAuthPinInput("");
          setQuickAuthPinConfirm("");
          setAuthPinStep("setup");
        }

        return;
      }
    }

    if (authMode === "pinUnlock") {
      if (normalizedPin !== quickAuthPin) {
        setError("Неверный PIN");
        setQuickAuthPinInput("");
        return;
      }

      setQuickAuthPinInput("");
      setIsAuthenticated(true);
    }
  }

  function handleQuickAuthKeyPress(value) {
    if (value === "delete") {
      setQuickAuthPinInput((current) => current.slice(0, -1));
      setError("");
      return;
    }

    if (!/^[0-9]$/.test(value)) {
      return;
    }

    setError("");

    if (quickAuthPinInput.length >= 4) {
      return;
    }

    const nextPin = `${quickAuthPinInput}${value}`;
    setQuickAuthPinInput(nextPin);

    if (nextPin.length === 4) {
      void submitQuickAuthPinValue(nextPin);
    }
  }

  function handleQuickAuthSubmit() {
    void submitQuickAuthPinValue(quickAuthPinInput);
  }

  async function handleEnableBiometricPress() {
    setError("");
    setNotice("");

    if (!isBiometricAvailable) {
      setIsBiometricPromptVisible(false);
      setIsAuthenticated(true);
      return;
    }

    try {
      const result = await authenticateWithBiometrics();

      if (!result.success) {
        setIsBiometricPromptVisible(false);
        setIsAuthenticated(true);
        return;
      }

      await saveBiometricEnabled(true);
      setIsBiometricEnabled(true);
      setIsBiometricPromptVisible(false);
      setIsAuthenticated(true);
      setNotice("Биометрия включена");
    } catch {
      setIsBiometricPromptVisible(false);
      setIsAuthenticated(true);
    }
  }

  function handleSkipBiometricPress() {
    setIsBiometricPromptVisible(false);
    setIsAuthenticated(true);
  }

  async function handleQuickAuthBiometricSubmit() {
    setError("");
    setNotice("");

    if (!isBiometricAvailable) {
      setError("Биометрия недоступна на этом устройстве");
      return;
    }

    try {
      const result = await authenticateWithBiometrics();

      if (!result.success) {
        if (result.error !== "user_cancel" && result.error !== "system_cancel") {
          setError("Не удалось выполнить биометрический вход");
        }
        return;
      }

      setIsAuthenticated(true);
    } catch {
      setError("Не удалось выполнить биометрический вход");
    }
  }

  async function handleResetQuickAuth() {
    try {
      await Promise.all([saveQuickAuthPin(""), saveBiometricEnabled(false)]);
    } catch {
      setError("Не удалось сбросить PIN");
      return;
    }

    setLogin("");
    setPassword("");
    setQuickAuthPin("");
    setQuickAuthPinInput("");
    setQuickAuthPinConfirm("");
    setIsBiometricEnabled(false);
    setIsBiometricPromptVisible(false);
    setError("");
    setNotice("");
    setFocusedField("");
    setAuthMode("credentials");
    setAuthPinStep("setup");
  }

  async function handleChangePermanentPassword(nextPassword) {
    const normalizedPassword = nextPassword.trim();

    if (!normalizedPassword) {
      throw new Error("empty_password");
    }

    await Promise.all([
      saveQuickAuthPassword(normalizedPassword),
      saveQuickAuthPin(""),
      saveBiometricEnabled(false),
    ]);

    setLogin("");
    setPassword("");
    setFocusedField("");
    setAuthPassword(normalizedPassword);
    setQuickAuthPin("");
    setQuickAuthPinInput("");
    setQuickAuthPinConfirm("");
    setIsBiometricEnabled(false);
    setIsBiometricPromptVisible(false);
    setAuthMode("credentials");
    setAuthPinStep("setup");
    setNotice("Пароль изменён");
    setError("");
  }

  async function handleResetPermanentPassword() {
    await Promise.all([
      saveQuickAuthPassword(AUTH_TEST_PASSWORD),
      saveQuickAuthPin(""),
      saveBiometricEnabled(false),
      clearEmployeeProfile(),
    ]);

    setAuthPassword(AUTH_TEST_PASSWORD);
    setLogin("");
    setPassword("");
    setCurrentEmployee(null);
    setEmployeeFirstName("");
    setEmployeeLastName("");
    setFocusedField("");
    setQuickAuthPin("");
    setQuickAuthPinInput("");
    setQuickAuthPinConfirm("");
    setIsBiometricEnabled(false);
    setIsBiometricPromptVisible(false);
    setAuthMode("credentials");
    setAuthPinStep("setup");
    setAuthStep("credentials");
    setError("");
    setNotice("");
  }

  function handleBackFromQuickAuth() {
    setQuickAuthPinInput("");
    setQuickAuthPinConfirm("");
    setIsBiometricPromptVisible(false);
    setError("");
    setNotice("");
    setAuthMode("credentials");
    setAuthPinStep("setup");
  }

  function handleBackToCredentials() {
    setAuthStep("credentials");
    setError("");
    setNotice("");
    setFocusedField("");
  }

  async function handleEmployeeContinue() {
    const normalizedFirstName = employeeFirstName.trim();
    const normalizedLastName = employeeLastName.trim();

    if (!normalizedFirstName || !normalizedLastName) {
      setError("Введите имя и фамилию");
      setNotice("");
      setFocusedField(!normalizedFirstName ? "employeeFirstName" : "employeeLastName");
      return;
    }

    const employeeProfile = buildEmployeeProfile(
      normalizedFirstName,
      normalizedLastName,
    );

    try {
      await saveEmployeeProfile(employeeProfile);
    } catch {
      setError("Не удалось сохранить данные сотрудника");
      setNotice("");
      return;
    }

    setCurrentEmployee(employeeProfile);
    setEmployeeFirstName(employeeProfile.firstName);
    setEmployeeLastName(employeeProfile.lastName);
    setError("");
    setNotice("");
    setFocusedField("");
    setAuthStep("credentials");
    beginPinAuthFlow({
      hasPin: Boolean(quickAuthPin),
      setAuthMode,
      setAuthPinStep,
      setQuickAuthPinInput,
      setQuickAuthPinConfirm,
    });
  }

  function handleLoginChange(value) {
    setLogin(value);
    if (error) {
      setError("");
    }
    if (notice) {
      setNotice("");
    }
  }

  function handleEmployeeFirstNameChange(value) {
    setEmployeeFirstName(value);
    if (error) {
      setError("");
    }
    if (notice) {
      setNotice("");
    }
  }

  function handleEmployeeLastNameChange(value) {
    setEmployeeLastName(value);
    if (error) {
      setError("");
    }
    if (notice) {
      setNotice("");
    }
  }

  function handlePasswordChange(value) {
    setPassword(value);
    if (error) {
      setError("");
    }
    if (notice) {
      setNotice("");
    }
  }

  function handleRegister() {
    const nextState = buildRegisterState();

    setError(nextState.error);
    setNotice(nextState.notice);
  }

  function toggleJournalCard(cardId) {
    setExpandedJournalCardIds((currentIds) =>
      currentIds.includes(cardId)
        ? currentIds.filter((currentId) => currentId !== cardId)
        : [...currentIds, cardId],
    );
  }

  function handleStagePress(stage) {
    const nextState = buildStagePressNavigationState(stage);

    setSelectedStage(nextState.selectedStage);
    setBatchStatusFilter("all");
    setCurrentScreen(nextState.currentScreen);
  }

  function openGlobalJournal() {
    const nextState = buildGlobalJournalNavigationState();
    resetSelectedCardContext();
    setJournalFilter(nextState.journalFilter);
    setJournalSubFilter(nextState.journalSubFilter);
    setExpandedJournalCardIds(nextState.expandedJournalCardIds);
    setCurrentScreen(nextState.currentScreen);
  }

  function openTasks() {
    const nextState = buildTasksNavigationState();
    resetSelectedCardContext();
    setCurrentScreen(nextState.currentScreen);
    setNotice(nextState.notice);
  }

  function openMenu() {
    const nextState = buildMenuNavigationState();
    resetSelectedCardContext();
    setCurrentScreen(nextState.currentScreen);
    setNotice(nextState.notice);
  }

  function openDirectories() {
    const nextState = buildDirectoriesNavigationState();
    resetSelectedCardContext();
    setCurrentScreen(nextState.currentScreen);
    setNotice(nextState.notice);
  }

  async function handleScanPress() {
    if (Platform.OS === "web") {
      setNotice(getScanWebNotice());
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

        const scanNotice = getScanNotice({ scannedCode, matchedCard });
        setNotice(scanNotice);

        if (!matchedCard) {
          return;
        }

        setSelectedStage(matchedCard.stage || INTRO_STAGE);
        openCultureCalendar(matchedCard);
      });

      await CameraView.launchScanner({
        barcodeTypes: ["qr"],
      });
    } catch (scanError) {
      setNotice(getScanErrorNotice());
    } finally {
      subscription?.remove();
    }
  }

  async function handleShareQrPress(card) {
    try {
      const shareResult = await shareQrCode(card?.code, {
        title: getCardDisplayName(card || {}),
        generatedAt: new Date(),
      });
      setNotice(getShareQrNotice(shareResult));
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

    const nextState = buildTaskCardOpenState(taskCard);

    setSelectedStage(nextState.selectedStage);
    openCultureCalendar(taskCard);
  }

  async function handleShareZipData() {
    if (isReportGenerating) {
      return;
    }

    setIsReportGenerating(true);
    try {
      const shareResult = await shareAdminReportZip(cultureCards, {
        currentEmployee,
        currentUser,
        testLocation: "",
      });
      setNotice(getShareZipReportNotice(shareResult));
    } catch (shareError) {
      setNotice("Не удалось подготовить ZIP-отчет.");
    } finally {
      setIsReportGenerating(false);
    }
  }
  async function handleScheduleWateringReminder() {
    try {
      await scheduleWateringReminder({
        body: "Тестовое напоминание: пора проверить полив.",
        date: new Date(Date.now() + 60 * 1000),
      });
      setNotice(getWateringReminderNotice("scheduled"));
    } catch (notificationError) {
      setNotice(getWateringReminderNotice("error"));
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

    const nextState = buildSelectedCardRecommendationsNavigationState({
      backScreen,
      selectedCardId: selectedCard.id,
      selectedCardStage: selectedCard.stage,
      selectedStage,
    });

    setRecommendationsContext(nextState.recommendationsContext);
    setRecommendationsMode(nextState.recommendationsMode);
    setCurrentScreen(nextState.currentScreen);
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
    const nextState = buildLogoutState();

    setSelectedStage(nextState.selectedStage);
    setCurrentScreen(nextState.currentScreen);
    setSelectedCardId(nextState.selectedCardId);
    setSelectedCalendarDate(nextState.selectedCalendarDate);
    setIsAuthenticated(nextState.isAuthenticated);
    setLogin("");
    setPassword("");
    setQuickAuthPinInput("");
    setQuickAuthPinConfirm("");
    setIsBiometricPromptVisible(false);
    setError("");
    setNotice("");
    setFocusedField("");
    setAuthStep("credentials");
    setAuthMode(quickAuthPin ? "pinUnlock" : "credentials");
    setAuthPinStep(quickAuthPin ? "unlock" : "setup");
  }

  async function handleClearTestData() {
    try {
      await clearCultureCardsForTests();
      const resetState = buildTestDataResetState();
      setCultureCards(resetState.cultureCards);
      setSelectedStage(resetState.selectedStage);
      setSelectedCardId(resetState.selectedCardId);
      setSelectedCalendarDate(resetState.selectedCalendarDate);
      setEditingCardId(resetState.editingCardId);
      setEditingOperationId(resetState.editingOperationId);
      setCultureForm(resetState.cultureForm);
      setStatusForm(resetState.statusForm);
      setIntroActionForm(resetState.introActionForm);
      setIntroActionType(resetState.introActionType);
      setCultureCalendarTab(resetState.cultureCalendarTab);
      setIsDateEntryExpanded(resetState.isDateEntryExpanded);
      setCurrentScreen(resetState.currentScreen);
      setStorageError(resetState.storageError);
      setNotice(resetState.notice);
    } catch (clearError) {
      setStorageError("Не удалось очистить карточки стадий");
    }
  }

  async function handleGenerateCoverageTestData() {
    try {
      const result = buildDevelopmentCoverageTestCultureCards(cultureCards, {
        seed: 'coverage-seed-v1',
      });
      await saveCultureCardsToStorage(result.nextCards);
      setCultureCards(result.nextCards);
      setStorageError("");
      setCurrentScreen("stages");
      setNotice(
        `Создано ${result.createdCardsCount} карточек и ${result.journalRecordsCount} записей журнала.`,
      );
    } catch (generateError) {
      console.error("handleGenerateCoverageTestData failed", generateError);
      setStorageError("Не удалось заполнить тестовыми данными");
    }
  }

  async function handleGenerateIntroSeedCards() {
    try {
      const result = buildEmptyIntroCultureCards(cultureCards, {
        count: 10,
      });
      await saveCultureCardsToStorage(result.nextCards);
      setCultureCards(result.nextCards);
      setStorageError("");
      setCurrentScreen("stages");
      setNotice(
        `Создано ${result.createdCardsCount} партий в стадии «Введение в культуру» и ${result.journalRecordsCount} записей журнала.`,
      );
    } catch (generateError) {
      console.error("handleGenerateIntroSeedCards failed", generateError);
      setStorageError("Не удалось создать партии для ручного заполнения");
    }
  }

  function updateCultureForm(field, value) {
    setCultureForm((currentForm) => updateFormField(currentForm, field, value));
  }

  function updateStatusForm(field, value) {
    setStatusForm((currentForm) => updateFormField(currentForm, field, value));
  }

  function getStatusPhotoUris(form = statusForm) {
    if (Array.isArray(form.photoUris) && form.photoUris.length > 0) {
      return form.photoUris.filter((uri) => isRenderablePhotoUri(uri));
    }

    return isRenderablePhotoUri(form.photoUri) ? [form.photoUri] : [];
  }

  function setStatusPhotoUris(nextUris) {
    const normalizedUris = nextUris.filter((uri) => isRenderablePhotoUri(uri));
    setStatusForm((currentForm) => ({
      ...currentForm,
      photoUris: normalizedUris,
      photoUri: normalizedUris[0] || "",
    }));
  }

  function updateIntroActionForm(field, value) {
    setIntroActionForm((currentForm) =>
      updateFormField(currentForm, field, value),
    );
  }

  function getIntroActionPhotoUris(form = introActionForm) {
    if (Array.isArray(form.photoUris) && form.photoUris.length > 0) {
      return form.photoUris.filter((uri) => isRenderablePhotoUri(uri));
    }

    return isRenderablePhotoUri(form.photoUri) ? [form.photoUri] : [];
  }

  function setIntroActionPhotoUrisForType(actionType, nextUris) {
    const normalizedUris = nextUris.filter((uri) => isRenderablePhotoUri(uri));
    const typeKey = actionType || "comment";

    setIntroActionPhotoUrisByType((currentMap) => ({
      ...currentMap,
      [typeKey]: normalizedUris,
    }));

    if (actionType === introActionType) {
      setIntroActionForm((currentForm) => ({
        ...currentForm,
        photoUris: normalizedUris,
        photoUri: normalizedUris[0] || "",
      }));
    }
  }

  function selectIntroActionType(nextType) {
    const currentType = introActionType || "comment";
    const currentUris = getIntroActionPhotoUris(introActionForm);
    const nextUris = introActionPhotoUrisByType[nextType] || [];

    setIntroActionPhotoUrisByType((currentMap) => ({
      ...currentMap,
      [currentType]: currentUris,
    }));
    setIntroActionForm((currentForm) => ({
      ...currentForm,
      photoUris: nextUris,
      photoUri: nextUris[0] || "",
    }));
    setIntroActionType(nextType);
  }

  function clearIntroActionPhotoDrafts() {
    setIntroActionPhotoUrisByType({});
  }

  function getCulturePhotoUris(form = cultureForm) {
    if (Array.isArray(form.startPhotoUris) && form.startPhotoUris.length > 0) {
      return form.startPhotoUris.filter((uri) => isRenderablePhotoUri(uri));
    }

    return isRenderablePhotoUri(form.startPhotoUri) ? [form.startPhotoUri] : [];
  }

  function setCulturePhotoUris(nextUris) {
    const normalizedUris = nextUris.filter(Boolean);
    setCultureForm((currentForm) => ({
      ...currentForm,
      startPhotoUris: normalizedUris,
      startPhotoUri: normalizedUris[0] || "",
    }));
  }

  function getPhotoFileExtension(asset) {
    const fileName = asset?.fileName || "";
    const extensionFromFileName = fileName.includes(".")
      ? fileName.split(".").pop()
      : "";

    if (extensionFromFileName) {
      return extensionFromFileName.toLowerCase();
    }

    const mimeType = asset?.mimeType || "";

    if (mimeType === "image/png") return "png";
    if (mimeType === "image/webp") return "webp";
    if (mimeType === "image/heic" || mimeType === "image/heif") return "heic";

    return "jpg";
  }

  function blobToDataUri(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        resolve(typeof reader.result === "string" ? reader.result : "");
      };

      reader.onerror = () => reject(new Error("Failed to read image blob"));
      reader.readAsDataURL(blob);
    });
  }

  async function compressWebPhotoUri(uri) {
    if (Platform.OS !== "web" || !uri || typeof document === "undefined") {
      return uri;
    }

    if (!uri.startsWith("data:") && !uri.startsWith("blob:")) {
      return uri;
    }

    try {
      const image = await new Promise((resolve, reject) => {
        const nextImage = new Image();
        nextImage.onload = () => resolve(nextImage);
        nextImage.onerror = () => reject(new Error("Failed to load image"));
        nextImage.src = uri;
      });

      const naturalWidth = image.naturalWidth || image.width || 1;
      const naturalHeight = image.naturalHeight || image.height || 1;
      const maxSide = 1280;
      const scale = Math.min(1, maxSide / Math.max(naturalWidth, naturalHeight));
      const width = Math.max(1, Math.round(naturalWidth * scale));
      const height = Math.max(1, Math.round(naturalHeight * scale));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        return uri;
      }

      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);

      return canvas.toDataURL("image/jpeg", 0.72);
    } catch {
      return uri;
    }
  }

  async function compactPhotoUrisForStorage(uris = []) {
    if (!Array.isArray(uris) || uris.length === 0) {
      return [];
    }

    const nextUris = await Promise.all(
      uris.filter(Boolean).map((uri) => compressWebPhotoUri(uri)),
    );

    return nextUris.filter(Boolean);
  }

  async function compactOperationForStorage(operation) {
    if (!operation) {
      return operation;
    }

    const [photoUri, photoUris] = await Promise.all([
      operation.photoUri ? compressWebPhotoUri(operation.photoUri) : Promise.resolve(""),
      compactPhotoUrisForStorage(operation.photoUris),
    ]);

    return {
      ...operation,
      ...(photoUri ? { photoUri } : {}),
      ...(photoUris.length > 0 ? { photoUris } : {}),
    };
  }

  async function compactCultureCardsForStorage(cards) {
    if (Platform.OS !== "web") {
      return cards;
    }

    return Promise.all(
      cards.map(async (card) => {
        const [startPhotoUris, operations] = await Promise.all([
          compactPhotoUrisForStorage(card.startPhotoUris),
          Promise.all((card.operations || []).map(compactOperationForStorage)),
        ]);

        return {
          ...card,
          ...(startPhotoUris.length > 0
            ? {
              startPhotoUris,
              startPhotoUri: startPhotoUris[0] || "",
            }
            : {}),
          operations,
        };
      }),
    );
  }

  async function persistPickedPhotoAsset(asset) {
    if (!asset?.uri) {
      return { error: "Не удалось получить фото" };
    }

    if (Platform.OS === "web") {
      try {
        if (asset.base64) {
          const mimeType = asset.mimeType || "image/jpeg";
          return { uri: `data:${mimeType};base64,${asset.base64}` };
        }

        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const dataUri = await blobToDataUri(blob);

        return { uri: dataUri || asset.uri };
      } catch {
        return { uri: asset.uri };
      }
    }

    if (!FileSystem.documentDirectory) {
      return { uri: asset.uri };
    }

    let sourceUri = asset.uri;

    try {
      const width = Number(asset.width) || 0;
      const height = Number(asset.height) || 0;
      const context = ImageManipulator.manipulate(asset.uri);

      if (Math.max(width, height) > NATIVE_PHOTO_MAX_SIDE) {
        context.resize(
          width >= height
            ? { width: NATIVE_PHOTO_MAX_SIDE }
            : { height: NATIVE_PHOTO_MAX_SIDE },
        );
      }

      const renderedImage = await context.renderAsync();
      const compressedImage = await renderedImage.saveAsync({
        compress: NATIVE_PHOTO_COMPRESSION,
        format: SaveFormat.JPEG,
      });
      sourceUri = compressedImage.uri || asset.uri;
    } catch {
      // Keep the original asset if the platform cannot transform this image.
    }

    const extension = sourceUri === asset.uri ? getPhotoFileExtension(asset) : "jpg";
    const fileName = `photo-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    try {
      await FileSystem.copyAsync({
        from: sourceUri,
        to: fileUri,
      });

      return { uri: fileUri };
    } catch {
      return { uri: asset.uri };
    }
  }

  async function pickPhotoWithCamera() {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      return {
        error: permissionResult.canAskAgain
          ? "Нужно разрешение на доступ к камере"
          : "Доступ к камере запрещен. Разрешите его в настройках телефона.",
      };
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        base64: Platform.OS === "web",
        quality: 0.85,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

      if (result.canceled || !result.assets?.length) {
        return { canceled: true };
      }

      return persistPickedPhotoAsset(result.assets[0]);
    } catch {
      return {
        error: "Не удалось открыть камеру",
      };
    }
  }

  async function handleAddCulturePhoto() {
    if (!canEditCurrentIdentity) {
      return;
    }

    const result = await pickPhotoWithCamera();

    if (result.canceled) {
      return;
    }

    if (result.error) {
      setFormError(result.error);
      return;
    }

    const nextUris = [...getCulturePhotoUris(), result.uri];
    setCulturePhotoUris(nextUris);
    setFormError("");
  }

  async function handleReplaceCulturePhoto(index) {
    if (!canEditCurrentIdentity) {
      return;
    }

    const result = await pickPhotoWithCamera();

    if (result.canceled) {
      return;
    }

    if (result.error) {
      setFormError(result.error);
      return;
    }

    const nextUris = getCulturePhotoUris().map((uri, currentIndex) =>
      currentIndex === index ? result.uri : uri,
    );
    setCulturePhotoUris(nextUris);
    setFormError("");
  }

  function handleRemoveCulturePhoto(index) {
    if (!canEditCurrentIdentity) {
      return;
    }

    if (typeof index !== "number") {
      setCulturePhotoUris([]);
      return;
    }

    const nextUris = getCulturePhotoUris().filter((_, currentIndex) => currentIndex !== index);
    setCulturePhotoUris(nextUris);
  }

  async function handlePickIntroActionPhoto() {
    const result = await pickPhotoWithCamera();

    if (result.canceled) {
      return;
    }

    if (result.error) {
      setStageActionError(result.error);
      return;
    }

    const nextUris = [...getIntroActionPhotoUris(), result.uri];
    setIntroActionPhotoUrisForType(introActionType, nextUris);
    setStageActionError("");
  }

  async function handleReplaceIntroActionPhoto(index) {
    const result = await pickPhotoWithCamera();

    if (result.canceled) {
      return;
    }

    if (result.error) {
      setStageActionError(result.error);
      return;
    }

    const nextUris = getIntroActionPhotoUris().map((uri, currentIndex) =>
      currentIndex === index ? result.uri : uri,
    );
    setIntroActionPhotoUrisForType(introActionType, nextUris);
    setStageActionError("");
  }

  function handleRemoveIntroActionPhoto(index) {
    if (typeof index !== "number") {
      setIntroActionPhotoUrisForType(introActionType, []);
      return;
    }

    const nextUris = getIntroActionPhotoUris().filter((_, currentIndex) => currentIndex !== index);
    setIntroActionPhotoUrisForType(introActionType, nextUris);
  }

  async function handleAddStatusPhoto() {
    const result = await pickPhotoWithCamera();

    if (result.canceled) {
      return;
    }

    if (result.error) {
      setStatusFormError(result.error);
      return;
    }

    setStatusPhotoUris([...getStatusPhotoUris(), result.uri]);
    setStatusFormError("");
  }

  async function handleReplaceStatusPhoto(index) {
    const result = await pickPhotoWithCamera();

    if (result.canceled) {
      return;
    }

    if (result.error) {
      setStatusFormError(result.error);
      return;
    }

    const nextUris = getStatusPhotoUris().map((uri, currentIndex) =>
      currentIndex === index ? result.uri : uri,
    );

    setStatusPhotoUris(nextUris);
    setStatusFormError("");
  }

  function handleRemoveStatusPhoto(index) {
    if (typeof index !== "number") {
      setStatusPhotoUris([]);
      return;
    }

    const nextUris = getStatusPhotoUris().filter((_, currentIndex) => currentIndex !== index);
    setStatusPhotoUris(nextUris);
  }

  function openCultureForm() {
    const nextState = buildCultureFormOpenState();

    setCultureForm(nextState.cultureForm);
    setFormError(nextState.formError);
    setShowDatePicker(nextState.showDatePicker);
    setOpenDropdown(nextState.openDropdown);
    setTouchedSubmit(nextState.touchedSubmit);
    setEditingCardId(nextState.editingCardId);
    setCurrentScreen(nextState.currentScreen);
  }

  function openEditCultureForm(card) {
    const nextState = buildCultureFormEditState(card);

    setCultureForm(nextState.cultureForm);
    setFormError(nextState.formError);
    setShowDatePicker(nextState.showDatePicker);
    setOpenDropdown(nextState.openDropdown);
    setTouchedSubmit(nextState.touchedSubmit);
    setEditingCardId(nextState.editingCardId);
    setCurrentScreen(nextState.currentScreen);
  }

  function openCultureCalendar(card) {
    const nextState = buildCultureCalendarOpenState(card);

    setSelectedCardId(nextState.selectedCardId);
    setSelectedCalendarDate(nextState.selectedCalendarDate);
    setCultureCalendarTab(nextState.cultureCalendarTab);
    setIsDateEntryExpanded(nextState.isDateEntryExpanded);
    setIntroActionType(nextState.introActionType);
    setIntroActionForm(nextState.introActionForm);
    setStageActionError(nextState.stageActionError);
    setIsDateActionErrorVisible(false);
    setCalendarMonth(nextState.calendarMonth);
    setCurrentScreen(nextState.currentScreen);
  }

  function closeCultureForm() {
    const nextState = buildCultureFormCloseState();

    setCultureForm(nextState.cultureForm);
    setFormError(nextState.formError);
    setShowDatePicker(nextState.showDatePicker);
    setOpenDropdown(nextState.openDropdown);
    setTouchedSubmit(nextState.touchedSubmit);
    setEditingCardId(nextState.editingCardId);
    setCurrentScreen(nextState.currentScreen);
  }

  function closeCultureCalendar() {
    const nextState = buildCultureCalendarCloseState();

    setSelectedCardId(nextState.selectedCardId);
    setSelectedCalendarDate(nextState.selectedCalendarDate);
    setCultureCalendarTab(nextState.cultureCalendarTab);
    setIsDateEntryExpanded(nextState.isDateEntryExpanded);
    setIntroActionType(nextState.introActionType);
    setIntroActionForm(nextState.introActionForm);
    setEditingOperationId(nextState.editingOperationId);
    setIsStageMoveConfirmVisible(nextState.isStageMoveConfirmVisible);
    setStageActionError(nextState.stageActionError);
    setIsDateActionErrorVisible(false);
    setCurrentScreen(nextState.currentScreen);
  }

  function closeDateActionError() {
    setIsDateActionErrorVisible(false);
    setStageActionError("");
  }

  function openStatusChangeForm(initialEventType = '') {
    if (!selectedCard || !selectedCalendarDate) {
      return;
    }

    const nextState = buildStatusChangeOpenState(selectedCard, initialEventType);

    setStatusForm(nextState.statusForm);
    setEditingOperationId(nextState.editingOperationId);
    setIntroActionType(nextState.introActionType);
    setStatusFormError(nextState.statusFormError);
    setStatusFormNotice(nextState.statusFormNotice);
    setCurrentScreen(nextState.currentScreen);
  }

  function closeStatusChangeForm() {
    const nextState = buildStatusChangeCloseState();

    setStatusForm(nextState.statusForm);
    setEditingOperationId(nextState.editingOperationId);
    setStatusFormError(nextState.statusFormError);
    setStatusFormNotice(nextState.statusFormNotice);
    setIntroActionType(nextState.introActionType);
    setCurrentScreen(nextState.currentScreen);
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
    const editState = buildOperationEditState({
      operation,
      selectedCardStage: selectedCard.stage,
      introOperationFields,
      statusEventCountFields,
    });

    if (!editState) {
      return;
    }

    if (editState.introActionType) {
      setIntroActionType(editState.introActionType);
    }

    if (editState.introActionForm) {
      setIntroActionForm(editState.introActionForm);
    }

    if (editState.statusForm) {
      setStatusForm(editState.statusForm);
    }

    if (editState.isDateEntryExpanded !== undefined) {
      setIsDateEntryExpanded(editState.isDateEntryExpanded);
    }

    if (editState.cultureCalendarTab) {
      setCultureCalendarTab(editState.cultureCalendarTab);
    }

    if (editState.currentScreen) {
      setCurrentScreen(editState.currentScreen);
    }
  }

  async function deleteOperation(operationId) {
    if (!selectedCard || !operationId) {
      return;
    }

    const nextCards = buildDeletedOperationCards(
      cultureCards,
      selectedCard.id,
      operationId,
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
      buildCultureFormSelectionResult({
        currentForm,
        type: "culture",
        value: cultureName,
      }),
    );
    setOpenDropdown("");
  }

  function handleSelectSpecies(speciesName) {
    if (!canEditCurrentIdentity) {
      return;
    }

    setCultureForm((currentForm) =>
      buildCultureFormSelectionResult({
        currentForm,
        type: "species",
        value: speciesName,
      }),
    );
    setOpenDropdown("");
  }

  function handleSelectVariety(varietyName) {
    if (!canEditCurrentIdentity) {
      return;
    }

    setCultureForm((currentForm) =>
      buildCultureFormSelectionResult({
        currentForm,
        type: "variety",
        value: varietyName,
        plantsCatalog,
      }),
    );
    setOpenDropdown("");
  }

  function handleDateChange(event, selectedDate) {
    if (!canEditCurrentIdentity) {
      return;
    }

    const nextState = buildCultureDateChangeResult({
      isAndroid: Platform.OS === "android",
      selectedDate,
    });

    if (!nextState) {
      return;
    }

    if (nextState.shouldHideDatePicker) {
      setShowDatePicker(false);
    }

    updateCultureForm("createdAt", nextState.createdAt);
  }

  function handleGenerateCode() {
    if (!canEditCurrentIdentity) {
      return;
    }

    const nextState = buildCultureFormGeneratedCodeState({
      cultureCards,
      createdAt: cultureForm.createdAt,
      selectedStage,
      editingCardId,
    });

    if (nextState.isDuplicateCode) {
      setFormError(nextState.error);
      return;
    }

    setCultureForm((currentForm) => ({
      ...currentForm,
      ...nextState.nextCultureForm,
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

    const stageMoveValidationError = getStageMoveValidationError({
      selectedCard,
      qrStatus: getQrStatus(selectedCard),
      cloneStats:
        selectedCard.stage === stages[1] ? getCloneStats(selectedCard) : null,
      adaptationStats:
        selectedCard.stage === stages[2]
          ? getAdaptationStats(selectedCard)
          : null,
      greenhouseStats:
        selectedCard.stage === stages[3]
          ? getGreenhouseStats(selectedCard)
          : null,
    });

    if (stageMoveValidationError) {
      setStageActionError(stageMoveValidationError);
      return;
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

    const { cardWithoutEditedOperation, editedOperation, currentQuantity } = buildStatusOperationContext({
      editingOperationId,
      selectedCard,
      selectedCardOperations,
    });
    const validationError = getStatusChangeValidationError({
      editingOperationId,
      introActionType,
      selectedCard,
      validationCard: cardWithoutEditedOperation,
      currentQuantity,
      statusForm,
      selectedCalendarDate,
    });

    if (validationError) {
      setStatusFormError(getStatusChangeValidationMessage(validationError));
      return;
    }

    const sanitizedStatusForm = {
      ...statusForm,
      photoUri: isRenderablePhotoUri(statusForm.photoUri) ? statusForm.photoUri : "",
      photoUris: getStatusPhotoUris(statusForm),
    };

    const eventConfig = getStatusEventConfig(introActionType);
    const count = eventConfig.countField
      ? sanitizedStatusForm[eventConfig.countField].trim()
      : "";
    const sourceProblemOperation = introActionType === 'problemIsolation'
      ? (cardWithoutEditedOperation.operations || []).find((operation) => operation.id === sanitizedStatusForm.sourceProblemEventId) ||
        getLatestActiveProblemOperation(cardWithoutEditedOperation)
      : null;

    const nowIso = new Date().toISOString();
    const builtOperation = buildStatusOperation({
      editingOperationId,
      introActionType,
      eventConfig,
      selectedCard,
      introStage: INTRO_STAGE,
      selectedCalendarDate,
      count,
      currentQuantity,
      statusForm: {
        ...sanitizedStatusForm,
        sourceProblemEventId: sourceProblemOperation?.id || sanitizedStatusForm.sourceProblemEventId || '',
      },
      editedOperation,
      userId: currentUser.id,
      nowIso,
      photoUri: sanitizedStatusForm.photoUri,
      photoUris: sanitizedStatusForm.photoUris,
    });
    const propagationChildCard = introActionType === 'propagation' && !editingOperationId
      ? buildPropagationChildCard({
        cultureCards,
        parentCard: selectedCard,
        propagationOperation: builtOperation,
        quantity: Number(count) || 0,
        userId: currentUser.id,
      })
      : null;
    const isolationChildCard = introActionType === 'problemIsolation' && !editingOperationId
      ? buildDerivedChildBatch({
        cultureCards,
        parentCard: selectedCard,
        sourceOperation: builtOperation,
        quantity: Number(sanitizedStatusForm.isolationQuantity) || 0,
        userId: currentUser.id,
        originType: 'problemIsolation',
        stage: selectedCard.stage || INTRO_STAGE,
        locationDescription: sanitizedStatusForm.isolationLocation.trim(),
        batchStatus: getResolvedBatchStatus(selectedCard) === 'quarantine' ? 'quarantine' : 'problem',
        healthStatus: 'problem',
        isolationStatus: 'isolated',
        sourceProblemOperation,
      })
      : null;
    const derivedChildCard = propagationChildCard || isolationChildCard;
    const nextOperation = derivedChildCard
      ? introActionType === 'propagation'
        ? attachPropagationChildToOperation(builtOperation, derivedChildCard)
        : attachChildToOperation(builtOperation, derivedChildCard)
      : editedOperation?.childCardId
        ? {
          ...builtOperation,
          childCardId: editedOperation.childCardId,
          childCode: editedOperation.childCode,
        }
        : builtOperation;
    const linkedPropagationChildId = introActionType === 'propagation' && editingOperationId
      ? editedOperation?.childCardId
      : '';
    const nextCards = cultureCards.map((card) => {
      if (linkedPropagationChildId && card.id === linkedPropagationChildId) {
        return {
          ...card,
          quantity: Number(count) || 0,
          currentQuantity: Number(count) || 0,
          propagationMethod: sanitizedStatusForm.propagationMethod.trim(),
          updatedAt: nowIso,
          updatedBy: currentUser.id,
          operations: (card.operations || []).map((operation) => (
            ['batchCreated', 'clonedFromParent'].includes(operation.type)
              ? {
                ...operation,
                quantity: Number(count) || 0,
                count: operation.type === 'clonedFromParent' ? Number(count) || 0 : operation.count,
                propagationMethod: operation.type === 'clonedFromParent'
                  ? sanitizedStatusForm.propagationMethod.trim()
                  : operation.propagationMethod,
              }
              : operation
          )),
        };
      }

      if (card.id !== selectedCard.id) {
        return card;
      }

      return buildUpdatedStatusCard(card, {
        editingOperationId,
        introActionType,
        nextOperation,
        statusForm: sanitizedStatusForm,
      });
    });

    await saveCultureCards(derivedChildCard ? [...nextCards, derivedChildCard] : nextCards);

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

    setStatusForm(createEmptyStatusForm());
    setEditingOperationId(null);
    setStatusFormError("");
    setStatusFormNotice("");
    setCurrentScreen("cultureCalendar");
  }

  async function handleSaveIntroAction() {
    const introActionDate = selectedCalendarDate || getTodayIsoDate();

    if (!selectedCard || !introActionType) {
      return false;
    }

    if (!editingOperationId && introActionDate !== getTodayIsoDate()) {
      setStageActionError(STATUS_DATE_NOT_TODAY_MESSAGE);
      setIsDateActionErrorVisible(true);
      return false;
    }

    setCalendarMonth(dateFromIso(introActionDate));

    const nowIso = new Date().toISOString();
    const actionConfig = getIntroActionConfig(introActionType);
    if (!actionConfig) {
      return false;
    }

    const sanitizedIntroActionForm = {
      ...introActionForm,
      photoUris: getIntroActionPhotoUris(introActionForm),
      photoUri: isRenderablePhotoUri(introActionForm.photoUri) ? introActionForm.photoUri : "",
    };
    const value = `${sanitizedIntroActionForm[actionConfig.field] || ""}`.trim();
    const hasPhoto = sanitizedIntroActionForm.photoUris.length > 0;
    const hasProblemDetails = [
      sanitizedIntroActionForm.problemType,
      sanitizedIntroActionForm.riskLevel,
      sanitizedIntroActionForm.problemDescription,
      sanitizedIntroActionForm.comment,
      sanitizedIntroActionForm.photoUri,
      ...sanitizedIntroActionForm.photoUris,
    ].some((item) => `${item || ''}`.trim());
    const movementDetails = {
      greenhouseName: sanitizedIntroActionForm.greenhouseName.trim(),
      rackName: sanitizedIntroActionForm.rackName.trim(),
      shelfName: sanitizedIntroActionForm.shelfName.trim(),
    };
    const hasMovementDetails = Boolean(
      movementDetails.greenhouseName ||
      movementDetails.rackName ||
      movementDetails.shelfName ||
      sanitizedIntroActionForm.movementComment.trim(),
    );

    if (
      (!value && !(introActionType === "photo" && hasPhoto)) &&
      !(introActionType === "movement" && hasMovementDetails) &&
      !(introActionType === "problem" && hasProblemDetails) &&
      introActionType !== "introLoss"
    ) {
      setStageActionError(actionConfig.error);
      return false;
    }

    const { nextCards, error } = buildIntroActionSaveResult({
      actionConfig,
      cultureCards,
      editingOperationId,
      introActionType,
      introActionForm: sanitizedIntroActionForm,
      movementDetails,
      nowIso,
      selectedCard,
      selectedCalendarDate: introActionDate,
      selectedCardOperations,
      userId: currentUser.id,
    });

    if (error) {
      setStageActionError(error);
      return false;
    }

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
    const startPhotoUris = getCulturePhotoUris(cultureForm);
    const startPhotoUri = startPhotoUris[0] || "";
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
      setFormError("Количество указано некорректно");
      return;
    }

    if (validationError === "duplicate_code") {
      setFormError("Код уже существует");
      return;
    }

    const nowIso = new Date().toISOString();
    const { nextCards } = buildCultureCardSaveResult({
      cultureCards,
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
      startPhotoUri,
      startPhotoUris,
      userId: currentUser.id,
      nowIso,
    });

    await saveCultureCards(nextCards);
    closeCultureForm();
  }

  async function handleCancelCultureCard() {
    if (!editingCardId) {
      return;
    }

    const nowIso = new Date().toISOString();
    const { nextCards } = buildCultureCardCancelResult({
      cultureCards,
      editingCardId,
      userId: currentUser.id,
      nowIso,
    });

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
    cultureCards,
    cultureForm,
    cultureOptions,
    currentScreen,
    editingOperationId,
    expandedJournalCardIds,
    filteredCultureCards,
    formError,
    getJournalFilterLabel,
    getResolvedBatchStatus,
    groupedGlobalJournalCards,
    journalSubFilterCounts,
    introActionForm,
    introActionType,
    isAdaptationStage,
    isCardsLoading,
    isCloneStage,
    isCultureIntroStage,
    isEditingCard,
    isGreenhouseStage,
    isHardeningStage: selectedStageFlags.isHardeningStage,
    isPlantingStage: selectedStageFlags.isPlantingStage,
    isReportGenerating,
    isStageMoveConfirmVisible,
    isDateActionErrorVisible,
    isSupportedPlantingStage,
    journalFilter,
    journalSubFilter,
    login,
    notice,
    openDropdown,
    operationDates,
    operationDeleteCandidateId,
    recommendationsMode,
    recommendationCard,
    recommendationEntries,
    recommendationStage,
    authPassword,
    currentEmployee,
    selectedCard,
    selectedCardActionLocked,
    selectedCardAdaptationStats,
    selectedCardCloneStats,
    selectedCardCurrentQuantity,
    selectedCardDaysInStage,
    selectedCardNextStage,
    selectedCardPlantingStats,
    selectedCardOperations,
    selectedCalendarDate,
    selectedDateOperations,
    selectedStage,
    selectedStageCardsCount,
    stageStatusFilterCounts,
    showDatePicker,
    showIdentityAsText,
    speciesOptions,
    stageActionError,
    stageMoveBlockedMessage,
    stageMoveButtonLabel,
    stageMoveHint,
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
    handleGenerateCoverageTestData,
    handleGenerateIntroSeedCards,
    handleDateChange,
    handleGenerateCode,
    handleLogout,
    openDirectories,
    handleSaveCultureCard,
    handleSaveIntroAction,
    handleSaveStatusChange,
    handleAddCulturePhoto,
    handleReplaceCulturePhoto,
    handleRemoveCulturePhoto,
    handlePickIntroActionPhoto,
    handleReplaceIntroActionPhoto,
    handleRemoveIntroActionPhoto,
    handleAddStatusPhoto,
    handleRemoveStatusPhoto,
    handleReplaceStatusPhoto,
    handleScanPress,
    handleScheduleWateringReminder,
    handleShareZipData,
    handleShareQrPress,
    handleChangePermanentPassword,
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
    closeDateActionError,
    requestDeleteOperation,
    setBatchStatusFilter,
    setCardSearch,
    setCurrentScreen,
    setCalendarMonth,
    setCultureCalendarTab,
    setEditingOperationId,
    setExpandedJournalCardIds,
    setFormError,
    setIntroActionForm,
    setIntroActionType,
    setIsDateEntryExpanded,
    setIsDateActionErrorVisible,
    setIsStageMoveConfirmVisible,
    setJournalFilter,
    setJournalSubFilter,
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
    handleAddCulturePhoto,
    handleReplaceCulturePhoto,
    handleRemoveCulturePhoto,
    handlePickIntroActionPhoto,
    handleReplaceIntroActionPhoto,
    handleRemoveIntroActionPhoto,
    handleAddStatusPhoto,
    handleRemoveStatusPhoto,
    handleReplaceStatusPhoto,
    handleSelectCulture,
    handleSelectSpecies,
    handleSelectVariety,
    clearIntroActionPhotoDrafts,
    selectIntroActionType,
    isRequiredFieldMissing,
  };

  if (isAuthenticated) {
    return <AppRouter actions={routerActions} state={routerState} />;
  }

  return (
    <AuthScreen
      authMode={authMode}
      authPinStep={authPinStep}
      authStep={authStep}
      biometricDescription={biometricDescription}
      error={error}
      employeeFirstName={employeeFirstName}
      employeeLastName={employeeLastName}
      focusedField={focusedField}
      isBiometricAvailable={isBiometricAvailable}
      isBiometricEnabled={isBiometricEnabled}
      isBiometricPromptVisible={isBiometricPromptVisible}
      login={login}
      notice={notice}
      onBackToCredentialsPress={handleBackToCredentials}
      onEnableBiometricPress={handleEnableBiometricPress}
      onFocusedFieldChange={setFocusedField}
      onEmployeeContinuePress={handleEmployeeContinue}
      onEmployeeFirstNameChange={handleEmployeeFirstNameChange}
      onEmployeeLastNameChange={handleEmployeeLastNameChange}
      onLoginChange={handleLoginChange}
      onPasswordChange={handlePasswordChange}
      onResetPermanentPassword={handleResetPermanentPassword}
      onQuickAuthBiometricSubmit={handleQuickAuthBiometricSubmit}
      onQuickAuthKeyPress={handleQuickAuthKeyPress}
      onQuickAuthSubmit={handleQuickAuthSubmit}
      onResetQuickAuthPress={handleResetQuickAuth}
      onBackFromQuickAuthPress={handleBackFromQuickAuth}
      onSkipBiometricPress={handleSkipBiometricPress}
      onSubmitLogin={handleLogin}
      password={password}
      quickAuthPinInput={quickAuthPinInput}
      safeAreaInsets={safeAreaInsets}
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
