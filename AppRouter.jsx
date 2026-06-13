import { StatusBar } from "expo-status-bar";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styles from "./styles";
import BottomTabBar from "./src/components/BottomTabBar";
import { LampChargeIcon, StageItemIcon } from "./src/components/icons";
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
import StatusChangeFormScreen from "./src/screens/StatusChangeFormScreen";
import TasksScreen from "./src/screens/TasksScreen";
import {
  createEmptyIntroActionForm,
  createEmptyStatusForm,
} from "./src/domain/forms";
import { dateFromIso, getTodayIsoDate } from "./src/domain/dates";
import { getCardDisplayName } from "./src/domain/batch";
import {
  cultureCreateBatchStatuses,
  editableStatusOperationTypes,
  introOperationFields,
  protectedOperationTypes,
  stageHomeItems as stageHomeItemsConfig,
} from "./src/domain/operationConfig";
import { INTRO_STAGE, SOURCE_MATERIAL_OPTIONS } from "./src/domain/constants";
import { STATUS_DATE_NOT_TODAY_MESSAGE } from "./src/domain/statusChangeValidation";

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
    isHardeningStage,
    isDateActionErrorVisible,
    isStageMoveConfirmVisible,
    isSupportedPlantingStage,
    journalFilter,
    journalSubFilter,
    authPassword,
    currentEmployee,
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
    selectedCardHardeningStats,
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
    handleGenerateTestData,
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
    handleAddCulturePhoto,
    handleReplaceCulturePhoto,
    handleRemoveCulturePhoto,
    handlePickIntroActionPhoto,
    handleReplaceIntroActionPhoto,
    handleRemoveIntroActionPhoto,
    handleAddStatusPhoto,
    handleRemoveStatusPhoto,
    handleReplaceStatusPhoto,
    setBatchStatusFilter,
    setCardSearch,
    setCultureCalendarTab,
    setCurrentScreen,
    setCalendarMonth,
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
    clearIntroActionPhotoDrafts,
    selectIntroActionType,
    closeDateActionError,
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

    const recommendationsAction = (
      <Pressable
        accessibilityLabel="Рекомендации"
        accessibilityRole="button"
        onPress={() => openSelectedCardRecommendations("cultureCalendar")}
        style={({ pressed }) => [
          styles.headerActionButton,
          pressed && styles.linkButtonPressed,
        ]}
      >
        <LampChargeIcon color="#15863F" size={22} />
      </Pressable>
    );

    function openAddEventFlow(actionDateIso) {
      const selectedStageForAction = selectedCard.stage || INTRO_STAGE;

      if (actionDateIso) {
        setSelectedCalendarDate(actionDateIso);
        setCalendarMonth(dateFromIso(actionDateIso));
      }

      setStageActionError("");
      setEditingOperationId(null);

      if (selectedStageForAction === INTRO_STAGE) {
        setIsDateEntryExpanded(false);
        clearIntroActionPhotoDrafts();
        setIntroActionType("problem");
        setIntroActionForm(createEmptyIntroActionForm());
        setCurrentScreen("introActionForm");
        return;
      }

      openStatusChangeForm();
    }

    function handleAddEventPress() {
      const todayIso = getTodayIsoDate();

      if (selectedCalendarDate && selectedCalendarDate !== todayIso) {
        setStageActionError(STATUS_DATE_NOT_TODAY_MESSAGE);
        setIsDateActionErrorVisible(true);
        return;
      }

      openAddEventFlow(selectedCalendarDate || todayIso);
    }

    function handleConfirmDateAction() {
      const todayIso = getTodayIsoDate();
      closeDateActionError();
      openAddEventFlow(todayIso);
    }

    return (
      <CultureCalendarScreen
        activeTab={cultureCalendarTab}
        bottomInset={bottomInset}
        headerAction={recommendationsAction}
        isDateActionErrorVisible={isDateActionErrorVisible}
        isOperationDeleteConfirmVisible={Boolean(operationDeleteCandidateId)}
        isStageMoveConfirmVisible={isStageMoveConfirmVisible}
        onAddEvent={handleAddEventPress}
        onBack={closeCultureCalendar}
        onCancelOperationDelete={cancelDeleteOperation}
        onCancelStageMove={() => setIsStageMoveConfirmVisible(false)}
        onChangeTab={(tab) => {
          setCultureCalendarTab(tab);
          setIsDateEntryExpanded(false);
          setIntroActionType("");
          setEditingOperationId(null);
          setStageActionError("");
          closeDateActionError();
        }}
        onConfirmOperationDelete={confirmDeleteOperation}
        onConfirmStageMove={handleAddStageChange}
        onRequestStageMove={() => {
          setStageActionError("");
          setIsStageMoveConfirmVisible(true);
        }}
        onCloseDateActionError={closeDateActionError}
        onConfirmDateAction={handleConfirmDateAction}
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
              closeDateActionError();
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
            hardeningStats={selectedCardHardeningStats}
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
          clearIntroActionPhotoDrafts();
          setEditingOperationId(null);
          setStageActionError("");
          setCurrentScreen("cultureCalendar");
        }}
        onChangeActionForm={updateIntroActionForm}
        onPickActionPhoto={handlePickIntroActionPhoto}
        onRemoveActionPhoto={handleRemoveIntroActionPhoto}
        onReplaceActionPhoto={handleReplaceIntroActionPhoto}
        onSave={async () => {
          const isSaved = await handleSaveIntroAction();
          if (isSaved) {
            clearIntroActionPhotoDrafts();
            setCultureCalendarTab("calendar");
            setCurrentScreen("cultureCalendar");
          }
        }}
        onSelectActionType={(value) => {
          selectIntroActionType(value);
          setEditingOperationId(null);
          setStageActionError("");
        }}
        selectedCard={selectedCard}
        selectedCalendarDate={selectedCalendarDate}
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
        onAddPhoto={handleAddStatusPhoto}
        onRemovePhoto={handleRemoveStatusPhoto}
        onReplacePhoto={handleReplaceStatusPhoto}
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
        isHardeningStage={isHardeningStage}
        selectedStageCardsCount={selectedStageCardsCount}
        onBack={() => setSelectedStage("")}
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

  function renderGlobalJournalScreen() {
    return (
      <GlobalJournalScreen
        bottomInset={bottomInset}
        expandedCardIds={expandedJournalCardIds}
        getJournalFilterLabel={getJournalFilterLabel}
        getResolvedBatchStatus={getResolvedBatchStatus}
        groupedCards={groupedGlobalJournalCards}
        journalFilter={journalFilter}
        journalSubFilter={journalSubFilter}
        onChangeJournalFilter={setJournalFilter}
        onChangeJournalSubFilter={setJournalSubFilter}
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
      (isCultureIntroStage || isCloneStage || isAdaptationStage || isGreenhouseStage || isHardeningStage) &&
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
          firstName={currentEmployee?.firstName || ""}
          lastName={currentEmployee?.lastName || ""}
          notice={notice}
          onHomePress={() => setCurrentScreen("stages")}
          onJournalPress={() => {
            setJournalFilter("all");
            setJournalSubFilter("all");
            setCurrentScreen("globalJournal");
          }}
          onLogout={handleLogout}
          onOpenDirectories={openDirectories}
          onClearCards={handleClearTestData}
          onGenerateTestData={handleGenerateTestData}
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
              setJournalFilter("all");
              setJournalSubFilter("all");
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

    return (
      <>
        <View style={styles.screenTransitionContainer}>
          {screenNode}
        </View>

        <PlantCatalogBottomSheet
          visible={isDirectoriesSheetVisible}
          onClose={closeDirectories}
        />
      </>
    );
  }

  return renderAuthenticatedScreens();
}
