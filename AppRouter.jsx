import { StatusBar } from "expo-status-bar";
import { useEffect, useLayoutEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styles from "./styles";
import BottomTabBar from "./src/components/BottomTabBar";
import { StageItemIcon } from "./src/components/icons";
import CultureCalendarTab from "./src/components/CultureCalendarTab";
import CultureJournalTab from "./src/components/CultureJournalTab";
import CulturePassportTab from "./src/components/CulturePassportTab";
import CultureCalendarScreen from "./src/screens/CultureCalendarScreen";
import CultureFormScreen from "./src/screens/CultureFormScreen";
import CultureListScreen from "./src/screens/CultureListScreen";
import GlobalJournalScreen from "./src/screens/GlobalJournalScreen";
import IntroActionFormScreen from "./src/screens/IntroActionFormScreen";
import MenuScreen from "./src/screens/MenuScreen";
import PlantCatalogBottomSheet from "./src/components/PlantCatalogBottomSheet";
import RecommendationsScreen from "./src/screens/RecommendationsScreen";
import SupportScreen from "./src/screens/SupportScreen";
import StatusChangeFormScreen from "./src/screens/StatusChangeFormScreen";
import TasksScreen from "./src/screens/TasksScreen";
import {
  createEmptyIntroActionForm,
  createEmptyStatusForm,
} from "./src/domain/forms";
import { getTodayIsoDate } from "./src/domain/dates";
import { getCardDisplayName } from "./src/domain/batch";
import {
  cultureCreateBatchStatuses,
  editableStatusOperationTypes,
  introOperationFields,
  protectedOperationTypes,
  stageHomeItems as stageHomeItemsConfig,
} from "./src/domain/operationConfig";
import { INTRO_STAGE, SOURCE_MATERIAL_OPTIONS } from "./src/domain/constants";

export default function AppRouter({ actions, state }) {
  const {
    activeCardsCount,
    allVisibleStageCardsCount,
    batchStatusFilter,
    bottomInset,
    cardSearch,
    careTasks,
    calendarDays,
    calendarMonth,
    canEditCurrentIdentity,
    canSaveCultureForm,
    cultureCalendarTab,
    cultureForm,
    cultureOptions,
    currentScreen,
    isDirectoriesSheetVisible,
    expandedJournalCardIds,
    filteredCultureCards,
    formError,
    getJournalFilterLabel,
    getPlantCardStatusDotStyle,
    getResolvedBatchStatus,
    groupedGlobalJournalCards,
    isAdaptationStage,
    isCardsLoading,
    isCloneStage,
    isCultureIntroStage,
    isEditingCard,
    isGreenhouseStage,
    isStageMoveConfirmVisible,
    isSupportedPlantingStage,
    journalFilter,
    authPassword,
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
  } = state;

  const screenTransition = useRef(new Animated.Value(1)).current;
  const previousScreenRef = useRef(currentScreen);

  useLayoutEffect(() => {
    if (previousScreenRef.current === currentScreen) {
      return;
    }

    previousScreenRef.current = currentScreen;
    screenTransition.setValue(0);
  }, [currentScreen, screenTransition]);

  useEffect(() => {
    const animation = Animated.timing(screenTransition, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start();

    return () => {
      animation.stop();
    };
  }, [currentScreen, screenTransition]);

  const {
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
    handleSaveCultureCard,
    handleSaveIntroAction,
    handleSaveStatusChange,
    handleScanPress,
    handleScheduleWateringReminder,
    handleShareData,
    handleChangePermanentPassword,
    handleShareQrPress,
    handleStagePress,
    openDirectories,
    closeDirectories,
    openSupport,
    openCultureCalendar,
    openCultureForm,
    openEditCultureForm,
    openEditOperation,
    openGlobalJournal,
    openMenu,
    openStageRecommendations,
    openSelectedCardRecommendations,
    openStatusChangeForm,
    openTaskCard,
    openTasks,
    requestDeleteOperation,
    setBatchStatusFilter,
    setCardSearch,
    setCultureCalendarTab,
    setCurrentScreen,
    setEditingOperationId,
    setExpandedJournalCardIds,
    setFormError,
    setIntroActionForm,
    setIntroActionType,
    setIsDateEntryExpanded,
    setIsStageMoveConfirmVisible,
    setJournalFilter,
    setNotice,
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
  } = actions;

  function renderCultureFormScreen() {
    return (
      <CultureFormScreen
        canEditCurrentIdentity={canEditCurrentIdentity}
        canSaveCultureForm={Boolean(canSaveCultureForm)}
        cultureCreateBatchStatuses={cultureCreateBatchStatuses}
        cultureForm={cultureForm}
        cultureOptions={cultureOptions}
        formError={formError}
        handleDateChange={handleDateChange}
        handleGenerateCode={handleGenerateCode}
        handleSaveCultureCard={handleSaveCultureCard}
        handleSelectCulture={handleSelectCulture}
        handleSelectSpecies={handleSelectSpecies}
        handleSelectVariety={handleSelectVariety}
        isAdaptationStage={isAdaptationStage}
        isCloneStage={isCloneStage}
        isCultureIntroStage={isCultureIntroStage}
        isEditingCard={isEditingCard}
        isRequiredFieldMissing={isRequiredFieldMissing}
        onBack={closeCultureForm}
        openDropdown={openDropdown}
        selectedStage={selectedStage}
        setOpenDropdown={setOpenDropdown}
        setShowDatePicker={setShowDatePicker}
        showDatePicker={showDatePicker}
        showIdentityAsText={showIdentityAsText}
        sourceMaterialOptions={SOURCE_MATERIAL_OPTIONS}
        speciesOptions={speciesOptions}
        updateCultureForm={updateCultureForm}
        varietyOptions={varietyOptions}
      />
    );
  }

  function renderCultureCalendarScreen() {
    const selectedDate =
      selectedCalendarDate || selectedCard.createdAt || getTodayIsoDate();

    return (
      <CultureCalendarScreen
        activeTab={cultureCalendarTab}
        bottomInset={bottomInset}
        isOperationDeleteConfirmVisible={Boolean(operationDeleteCandidateId)}
        isStageMoveConfirmVisible={isStageMoveConfirmVisible}
        onAddEvent={() => {
          setSelectedCalendarDate(selectedDate);
          setStageActionError("");
          setEditingOperationId(null);

          if (selectedCard.stage === INTRO_STAGE) {
            setIsDateEntryExpanded(false);
            setIntroActionType("comment");
            setIntroActionForm(createEmptyIntroActionForm());
            setCurrentScreen("introActionForm");
            return;
          }

          openStatusChangeForm();
        }}
        onBack={closeCultureCalendar}
        onCancelOperationDelete={cancelDeleteOperation}
        onCancelStageMove={() => setIsStageMoveConfirmVisible(false)}
        onChangeTab={(tab) => {
          setCultureCalendarTab(tab);
          setIsDateEntryExpanded(false);
          setIntroActionType("");
          setEditingOperationId(null);
          setStageActionError("");
        }}
        onConfirmOperationDelete={confirmDeleteOperation}
        onConfirmStageMove={handleAddStageChange}
        onOpenRecommendations={() =>
          openSelectedCardRecommendations("cultureCalendar")
        }
        onRequestStageMove={() => {
          setStageActionError("");
          setIsStageMoveConfirmVisible(true);
        }}
        showBottomActions={
          cultureCalendarTab === "calendar" && !selectedCardActionLocked
        }
        stageActionError={stageActionError}
        stageMoveBlockedMessage={stageMoveBlockedMessage}
        stageMoveButtonLabel={stageMoveButtonLabel}
        stageMoveTarget={selectedCardNextStage}
        subtitle={
          <Text style={styles.stageHeaderSubtitle}>
            {selectedCard.stage || selectedStage}
          </Text>
        }
        title={getCardDisplayName(selectedCard)}
      >
        {cultureCalendarTab === "calendar" && (
          <CultureCalendarTab
            calendarDays={calendarDays}
            calendarMonth={calendarMonth}
            canDeleteOperation={(operation) =>
              ((selectedCard.stage === INTRO_STAGE &&
                introOperationFields[operation.type]) ||
                editableStatusOperationTypes.includes(operation.type)) &&
              !protectedOperationTypes.includes(operation.type)
            }
            canEditOperation={(operation) =>
              (selectedCard.stage === INTRO_STAGE &&
                introOperationFields[operation.type]) ||
              editableStatusOperationTypes.includes(operation.type)
            }
            card={selectedCard}
            onChangeMonth={changeCalendarMonth}
            onDeleteOperation={requestDeleteOperation}
            onEditOperation={openEditOperation}
            onSelectDate={(isoDate) => {
              setSelectedCalendarDate(isoDate);
              setIsDateEntryExpanded(false);
              setIntroActionType("");
              setIntroActionForm(createEmptyIntroActionForm());
              setEditingOperationId(null);
              setStageActionError("");
            }}
            operationDates={operationDates}
            selectedDate={selectedDate}
            selectedDateOperations={selectedDateOperations}
            stageActionError=""
            stageMoveBlockedMessage={stageMoveBlockedMessage}
            stageMoveTarget={selectedCardNextStage}
          />
        )}

        {cultureCalendarTab === "passport" && (
          <CulturePassportTab
            adaptationStats={selectedCardAdaptationStats}
            card={selectedCard}
            cloneStats={selectedCardCloneStats}
            currentQuantity={selectedCardCurrentQuantity}
            daysInStage={selectedCardDaysInStage}
            getResolvedBatchStatus={getResolvedBatchStatus}
            onShareQrPress={() => handleShareQrPress(selectedCard)}
          />
        )}

        {cultureCalendarTab === "journal" && (
          <CultureJournalTab
            canDeleteOperation={(operation) =>
              ((selectedCard.stage === INTRO_STAGE &&
                introOperationFields[operation.type]) ||
                editableStatusOperationTypes.includes(operation.type)) &&
              !protectedOperationTypes.includes(operation.type)
            }
            canEditOperation={(operation) =>
              (selectedCard.stage === INTRO_STAGE &&
                introOperationFields[operation.type]) ||
              editableStatusOperationTypes.includes(operation.type)
            }
            card={selectedCard}
            operations={selectedCardOperations}
            onDeleteOperation={requestDeleteOperation}
            onEditOperation={openEditOperation}
          />
        )}
      </CultureCalendarScreen>
    );
  }

  function renderIntroActionFormScreen() {
    return (
      <IntroActionFormScreen
        actionForm={state.introActionForm}
        actionType={state.introActionType}
        error={stageActionError}
        isEditing={Boolean(state.editingOperationId)}
        onBack={() => {
          setIntroActionType("");
          setIntroActionForm(createEmptyIntroActionForm());
          setEditingOperationId(null);
          setStageActionError("");
          setCurrentScreen("cultureCalendar");
        }}
        onChangeActionForm={updateIntroActionForm}
        onSave={async () => {
          const isSaved = await handleSaveIntroAction();
          if (isSaved) {
            setCurrentScreen("cultureCalendar");
          }
        }}
        onSelectActionType={(value) => {
          setIntroActionType(value);
          setEditingOperationId(null);
          setStageActionError("");
        }}
        selectedCard={selectedCard}
      />
    );
  }

  function renderStatusChangeFormScreen() {
    return (
      <StatusChangeFormScreen
        eventType={state.introActionType}
        form={statusForm}
        formError={statusFormError}
        formNotice={statusFormNotice}
        isEditing={Boolean(state.editingOperationId)}
        onBack={closeStatusChangeForm}
        onChangeField={updateStatusForm}
        onOpenRecommendations={() =>
          openSelectedCardRecommendations("statusChangeForm")
        }
        onSave={handleSaveStatusChange}
        onSelectEventType={(value) => {
          setIntroActionType(value);
          setStatusForm(createEmptyStatusForm());
          setStatusFormError("");
          setStatusFormNotice("");
        }}
        selectedCard={selectedCard}
        selectedDate={selectedCalendarDate}
      />
    );
  }

  function renderRecommendationsScreen() {
    return (
      <RecommendationsScreen
        entries={recommendationEntries}
        mode={recommendationsMode}
        onBack={closeRecommendations}
        onChangeMode={setRecommendationsMode}
        showModeSwitch={Boolean(recommendationCard)}
        stage={recommendationStage}
        title={
          recommendationCard
            ? getCardDisplayName(recommendationCard)
            : "Рекомендации"
        }
      />
    );
  }

  function renderCultureListScreen() {
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
        selectedStageCardsCount={selectedStageCardsCount}
        onBack={() => setSelectedStage("")}
        onChangeBatchStatusFilter={setBatchStatusFilter}
        onChangeSearch={setCardSearch}
        onCreateCulture={openCultureForm}
        onEditCulture={openEditCultureForm}
        onOpenRecommendations={openStageRecommendations}
        onOpenCultureCalendar={openCultureCalendar}
        selectedStage={selectedStage}
        storageError={storageError}
      />
    );
  }

  function renderGlobalJournalScreen() {
    return (
      <GlobalJournalScreen
        bottomInset={bottomInset}
        expandedCardIds={expandedJournalCardIds}
        getJournalFilterLabel={getJournalFilterLabel}
        getResolvedBatchStatus={getResolvedBatchStatus}
        groupedCards={groupedGlobalJournalCards}
        journalFilter={journalFilter}
        onChangeJournalFilter={setJournalFilter}
        onHomePress={() => setCurrentScreen("stages")}
        onJournalPress={openGlobalJournal}
        onMenuPress={openMenu}
        onOpenCard={(card) => {
          setSelectedStage(card.stage || INTRO_STAGE);
          openCultureCalendar(card);
        }}
        onScanPress={handleScanPress}
        onTasksPress={openTasks}
        onToggleCard={toggleJournalCard}
        taskCount={taskCount}
      />
    );
  }

  function renderAuthenticatedScreens() {
    let screenNode = null;

    if (isSupportedPlantingStage && currentScreen === "cultureForm") {
      screenNode = renderCultureFormScreen();
    } else if (
      isSupportedPlantingStage &&
      currentScreen === "cultureCalendar" &&
      selectedCard
    ) {
      screenNode = renderCultureCalendarScreen();
    } else if (currentScreen === "introActionForm" && selectedCard) {
      screenNode = renderIntroActionFormScreen();
    } else if (
      (isCloneStage || isAdaptationStage || isGreenhouseStage) &&
      currentScreen === "statusChangeForm" &&
      selectedCard
    ) {
      screenNode = renderStatusChangeFormScreen();
    } else if (currentScreen === "recommendations") {
      screenNode = renderRecommendationsScreen();
    } else if (isSupportedPlantingStage && currentScreen === "cultureList") {
      screenNode = renderCultureListScreen();
    } else if (currentScreen === "globalJournal") {
      screenNode = renderGlobalJournalScreen();
    } else if (currentScreen === "menu") {
      screenNode = (
        <MenuScreen
          activeCardsCount={activeCardsCount}
          bottomInset={bottomInset}
          currentPassword={authPassword}
          firstName={login}
          lastName=""
          notice={notice}
          onHomePress={() => setCurrentScreen("stages")}
          onJournalPress={() => {
            setJournalFilter("important");
            setCurrentScreen("globalJournal");
          }}
          onLogout={handleLogout}
          onOpenDirectories={openDirectories}
          onOpenSupport={openSupport}
          onClearCards={handleClearTestData}
          onChangePermanentPassword={handleChangePermanentPassword}
          onScheduleWateringReminder={handleScheduleWateringReminder}
          onShareData={handleShareData}
          onScanPress={handleScanPress}
          onTasksPress={openTasks}
          role={userRole}
          taskCount={taskCount}
        />
      );
    } else if (currentScreen === "tasks") {
      screenNode = (
        <TasksScreen
          bottomInset={bottomInset}
          onHomePress={() => setCurrentScreen("stages")}
          onJournalPress={openGlobalJournal}
          onMenuPress={openMenu}
          onScanPress={handleScanPress}
          onTaskPress={openTaskCard}
          tasks={careTasks}
        />
      );
    } else if (currentScreen === "support") {
      screenNode = (
        <SupportScreen
          activeCardsCount={activeCardsCount}
          bottomInset={bottomInset}
          currentScreenLabel="Поддержка"
          login={login}
          notice={notice}
          onHomePress={() => setCurrentScreen("stages")}
          onJournalPress={() => {
            setJournalFilter("important");
            setCurrentScreen("globalJournal");
          }}
          onMenuPress={openMenu}
          onOpenMenu={openMenu}
          onOpenTasks={openTasks}
          onScheduleWateringReminder={handleScheduleWateringReminder}
          onShareData={handleShareData}
          onScanPress={handleScanPress}
          onTasksPress={openTasks}
          role={userRole}
          storageError={storageError}
          taskCount={taskCount}
        />
      );
    } else {
      screenNode = (
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
                    <View
                      style={[styles.stageIconBox, styles[stage.iconBoxStyle]]}
                    >
                      <StageItemIcon name={stage.iconName} size={24} />
                    </View>
                    <Text style={styles.stageName}>{stage.label}</Text>
                  </Pressable>
                ))}
              </View>

              {!!notice && <Text style={styles.homeNoticeText}>{notice}</Text>}
              {!!storageError && (
                <Text style={styles.homeErrorText}>{storageError}</Text>
              )}
            </View>
          </ScrollView>

          <BottomTabBar
            activeTab="home"
            bottomInset={bottomInset}
            onHomePress={() => setCurrentScreen("stages")}
            onJournalPress={() => {
              setJournalFilter("important");
              setCurrentScreen("globalJournal");
            }}
            onMenuPress={openMenu}
            onScanPress={handleScanPress}
            onTasksPress={openTasks}
            taskCount={taskCount}
          />
        </SafeAreaView>
      );
    }

    const shouldUseVerticalOffset = Platform.OS !== "android";
    const translateY = shouldUseVerticalOffset
      ? screenTransition.interpolate({
          inputRange: [0, 1],
          outputRange: [8, 0],
        })
      : 0;

    return (
      <>
        <Animated.View
          style={[
            styles.screenTransitionContainer,
            {
              opacity: screenTransition,
            },
            shouldUseVerticalOffset ? { transform: [{ translateY }] } : null,
          ]}
        >
          {screenNode}
        </Animated.View>

        <PlantCatalogBottomSheet
          visible={isDirectoriesSheetVisible}
          onClose={closeDirectories}
        />
      </>
    );
  }

  return renderAuthenticatedScreens();
}
