// Экран формы стартового действия для культуры.
import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from '../../styles';
import PhotoGallery from '../components/PhotoGallery';
import StageHeader from '../components/StageHeader';
import StatusFilterTabs from '../components/StatusFilterTabs';
import SelectBottomSheet from '../components/SelectBottomSheet';
import { CalendarIcon, ChevronDownIcon, LeaveIcon } from '../components/icons';
import { createAsyncActionGuard } from '../domain/asyncActionGuard';
import { INTRO_STAGE } from '../domain/constants';
import { formatDisplayDate } from '../domain/dates';
import {
  formatActionCardQuantityDisplay,
  getCardActiveProblemQuantity,
  getCardCurrentQuantity,
  getCardDisplayName,
  getCardUnisolatedProblemQuantity,
} from '../domain/batch';
import { isRenderablePhotoUri } from '../domain/photoUri';

const introActionCommands = [
  ['problem', 'Проблема'],
  ['movement', 'Перемещение'],
  ['introLoss', 'Потери'],
];

const problemTypeOptions = ['Контаминация', 'Карантин', 'Болезнь', 'Вредители', 'Другое'];
const riskLevelOptions = ['Низкий', 'Средний', 'Высокий', 'Критический'];

export default function IntroActionFormScreen({
  actionForm,
  actionType,
  error,
  isEditing,
  onBack,
  onChangeActionForm,
  onPickActionPhoto,
  onRemoveActionPhoto,
  onReplaceActionPhoto,
  onSave,
  onSelectActionType,
  selectedCard,
  selectedCalendarDate,
}) {
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveAttemptCount, setSaveAttemptCount] = useState(0);
  const [isProblemTypeDropdownOpen, setIsProblemTypeDropdownOpen] = useState(false);
  const [isRiskDropdownOpen, setIsRiskDropdownOpen] = useState(false);
  const seenAlertRef = useRef('');
  const saveGuardRef = useRef(createAsyncActionGuard());
  const activeProblemQuantity = getCardActiveProblemQuantity(selectedCard);
  const unisolatedProblemQuantity = getCardUnisolatedProblemQuantity(selectedCard);
  const canRecordProblemRecovery = activeProblemQuantity > 0 || actionType === 'problemRecovery';
  const canIsolateProblem = unisolatedProblemQuantity > 0 || actionType === 'problemIsolation';
  const displayedActionCommands = introActionCommands.flatMap((item) => {
    if (item[0] !== 'problem') {
      return [item];
    }

    return [
      item,
      ...(canRecordProblemRecovery ? [['problemRecovery', 'Выздоровление']] : []),
      ...(canIsolateProblem ? [['problemIsolation', 'Изолировать растения']] : []),
    ];
  });
  const selectedActionLabel =
    displayedActionCommands.find(([value]) => value === actionType)?.[1] ||
    {
      contamination: 'Контаминация',
      quarantine: 'Карантин',
    }[actionType] ||
    'Запись';
  const photoUris = (
    Array.isArray(actionForm.photoUris) && actionForm.photoUris.length > 0
      ? actionForm.photoUris
      : actionForm.photoUri
        ? [actionForm.photoUri]
        : []
  ).filter((uri) => isRenderablePhotoUri(uri));

  useEffect(() => {
    if (!error) {
      seenAlertRef.current = '';
      setIsAlertVisible(false);
      return;
    }

    const alertKey = `${saveAttemptCount}:${error}`;
    if (alertKey !== seenAlertRef.current) {
      seenAlertRef.current = alertKey;
      setIsAlertVisible(true);
    }
  }, [error, saveAttemptCount]);

  useEffect(() => {
    setIsProblemTypeDropdownOpen(false);
    setIsRiskDropdownOpen(false);
  }, [actionType]);

  useEffect(() => {
    if (
      actionType === 'problemIsolation' &&
      unisolatedProblemQuantity > 0 &&
      !`${actionForm.isolationQuantity || ''}`.trim()
    ) {
      onChangeActionForm('isolationQuantity', `${unisolatedProblemQuantity}`);
    }
  }, [actionType, unisolatedProblemQuantity, actionForm.isolationQuantity, onChangeActionForm]);

  async function handleSavePress() {
    if (isSaving) {
      return;
    }

    return saveGuardRef.current.run('save', async () => {
      setIsSaving(true);
      setSaveAttemptCount((current) => current + 1);
      try {
        await onSave();
      } finally {
        setIsSaving(false);
      }
    });
  }

  function selectProblemType(value) {
    onChangeActionForm('problemType', value);
    setIsProblemTypeDropdownOpen(false);
  }

  function selectRiskLevel(value) {
    onChangeActionForm('riskLevel', value);
    setIsRiskDropdownOpen(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <StageHeader
        onBack={onBack}
        subtitle={<Text style={styles.stageHeaderSubtitle}>{selectedCard.stage || INTRO_STAGE}</Text>}
        title={isEditing ? 'Редактировать действие' : 'Добавить действие'}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={localStyles.screen}>
          <View style={localStyles.fixedHeader}>
            <View style={styles.cardsHeader}>
              <Text style={styles.eventFormCardTitle}>
                {getCardDisplayName(selectedCard)}
              </Text>
              <View style={styles.cardsMetaRow}>
                <View style={styles.cardsMetaItem}>
                  <CalendarIcon color="#15863F" size={16} />
                  <Text style={styles.cardsMetaText}>
                    {selectedCalendarDate ? formatDisplayDate(selectedCalendarDate) : ''}
                  </Text>
                </View>
                <View style={styles.cardsMetaItem}>
                  <LeaveIcon color="#15863F" size={16} />
                  <Text style={styles.cardsMetaText}>
                    {formatActionCardQuantityDisplay(selectedCard)}
                  </Text>
                </View>
              </View>
            </View>

            {!isEditing && (
              <View style={localStyles.actionTabsWrap}>
                <StatusFilterTabs
                  activeValue={actionType}
                  items={displayedActionCommands}
                  onChange={onSelectActionType}
                />
              </View>
            )}
          </View>

          <View style={localStyles.contentArea}>
            <View style={[styles.surfacePanel, styles.formPanel, localStyles.whitePanel]}>
              <ScrollView
                bounces={false}
                contentContainerStyle={localStyles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {isEditing && (
                  <Text style={styles.editActionTitle}>{selectedActionLabel}</Text>
                )}

                {actionType === 'problem' && (
                  <>
                    <View style={styles.field}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setIsProblemTypeDropdownOpen((current) => !current)}
                        style={({ pressed }) => [
                          styles.selectButton,
                          pressed && styles.linkButtonPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.selectButtonText,
                            !actionForm.problemType && styles.selectPlaceholder,
                          ]}
                        >
                          {actionForm.problemType || 'Выберите тип проблемы'}
                        </Text>
                        <View style={styles.selectButtonArrow}>
                          <ChevronDownIcon />
                        </View>
                      </Pressable>

                      <SelectBottomSheet
                        onClose={() => setIsProblemTypeDropdownOpen(false)}
                        onSelect={selectProblemType}
                        options={problemTypeOptions}
                        title="Выберите тип проблемы"
                        visible={isProblemTypeDropdownOpen}
                      />
                    </View>

                    <View style={styles.field}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setIsRiskDropdownOpen((current) => !current)}
                        style={({ pressed }) => [
                          styles.selectButton,
                          pressed && styles.linkButtonPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.selectButtonText,
                            !actionForm.riskLevel && styles.selectPlaceholder,
                          ]}
                        >
                          {actionForm.riskLevel || 'Выберите уровень риска'}
                        </Text>
                        <View style={styles.selectButtonArrow}>
                          <ChevronDownIcon />
                        </View>
                      </Pressable>

                      <SelectBottomSheet
                        onClose={() => setIsRiskDropdownOpen(false)}
                        onSelect={selectRiskLevel}
                        options={riskLevelOptions}
                        title="Выберите уровень риска"
                        visible={isRiskDropdownOpen}
                      />
                    </View>

                    <View style={styles.field}>
                      <Text style={styles.label}>Количество растений с проблемой, шт. *</Text>
                      <TextInput
                        inputMode="numeric"
                        keyboardType="numeric"
                        onChangeText={(value) => onChangeActionForm('affectedQuantity', value)}
                        placeholder="0"
                        placeholderTextColor="#7C8A80"
                        style={styles.input}
                        value={actionForm.affectedQuantity}
                      />
                      <Text style={localStyles.fieldHint}>
                        {activeProblemQuantity > 0
                          ? `Сейчас с проблемой: ${activeProblemQuantity} шт. Действие «Выздоровление» доступно вверху формы.`
                          : 'После сохранения проблемы появится действие «Выздоровление».'}
                      </Text>
                    </View>

                    <View style={localStyles.commentField}>
                      <TextInput
                        multiline
                        onChangeText={(value) => onChangeActionForm('problemDescription', value)}
                        placeholder="Описание проблемы"
                        placeholderTextColor="#7C8A80"
                        style={[styles.input, styles.multilineInput]}
                        value={actionForm.problemDescription}
                      />
                    </View>

                  </>
                )}
                {actionType === 'problemRecovery' && (
                  <>
                    <View style={styles.field}>
                      <Text style={styles.label}>Количество выздоровевших, шт. *</Text>
                      <TextInput
                        inputMode="numeric"
                        keyboardType="numeric"
                        onChangeText={(value) => onChangeActionForm('recoveredQuantity', value)}
                        placeholder="0"
                        placeholderTextColor="#7C8A80"
                        style={styles.input}
                        value={actionForm.recoveredQuantity}
                      />
                      <Text style={localStyles.fieldHint}>
                        Сейчас с проблемой: {activeProblemQuantity} шт.
                      </Text>
                    </View>

                    <View style={styles.field}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setIsRiskDropdownOpen((current) => !current)}
                        style={({ pressed }) => [
                          styles.selectButton,
                          pressed && styles.linkButtonPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.selectButtonText,
                            !actionForm.riskLevel && styles.selectPlaceholder,
                          ]}
                        >
                          {actionForm.riskLevel || 'Выберите уровень риска после выздоровления'}
                        </Text>
                        <View style={styles.selectButtonArrow}>
                          <ChevronDownIcon />
                        </View>
                      </Pressable>

                      <SelectBottomSheet
                        onClose={() => setIsRiskDropdownOpen(false)}
                        onSelect={selectRiskLevel}
                        options={riskLevelOptions}
                        title="Выберите уровень риска"
                        visible={isRiskDropdownOpen}
                      />
                    </View>

                    <View style={styles.field}>
                      <Text style={styles.label}>Комментарий</Text>
                      <TextInput
                        multiline
                        onChangeText={(value) => onChangeActionForm('comment', value)}
                        placeholder="Комментарий"
                        placeholderTextColor="#7C8A80"
                        style={[styles.input, styles.multilineInput]}
                        value={actionForm.comment}
                      />
                    </View>
                  </>
                )}
                {actionType === 'problemIsolation' && (
                  <>
                    <View style={styles.field}>
                      <Text style={styles.label}>Количество для изоляции, шт. *</Text>
                      <TextInput
                        inputMode="numeric"
                        keyboardType="numeric"
                        onChangeText={(value) => onChangeActionForm('isolationQuantity', value)}
                        placeholder={`${unisolatedProblemQuantity || 0}`}
                        placeholderTextColor="#7C8A80"
                        style={styles.input}
                        value={actionForm.isolationQuantity}
                      />
                      <Text style={localStyles.fieldHint}>
                        Необходимо изолировать: {unisolatedProblemQuantity} шт.
                      </Text>
                    </View>

                    <View style={styles.field}>
                      <Text style={styles.label}>Новое местоположение *</Text>
                      <TextInput
                        onChangeText={(value) => onChangeActionForm('isolationLocation', value)}
                        placeholder="Например: Изолятор 1, стеллаж B, полка 3"
                        placeholderTextColor="#7C8A80"
                        style={styles.input}
                        value={actionForm.isolationLocation}
                      />
                    </View>

                    <View style={styles.field}>
                      <Text style={styles.label}>Итог разделения</Text>
                      <Text style={localStyles.fieldHint}>
                        Исходная партия: {Math.max(getCardCurrentQuantity(selectedCard) - (Number(actionForm.isolationQuantity) || 0), 0)} шт.
                      </Text>
                      <Text style={localStyles.fieldHint}>
                        Новая изолированная партия: {Number(actionForm.isolationQuantity) || 0} шт. QR ожидает печати.
                      </Text>
                    </View>

                    <View style={styles.field}>
                      <Text style={styles.label}>Комментарий</Text>
                      <TextInput
                        multiline
                        onChangeText={(value) => onChangeActionForm('isolationComment', value)}
                        placeholder="Комментарий"
                        placeholderTextColor="#7C8A80"
                        style={[styles.input, styles.multilineInput]}
                        value={actionForm.isolationComment}
                      />
                    </View>
                  </>
                )}
                {actionType === 'contamination' && (
                  <TextInput
                    multiline
                    onChangeText={(value) => onChangeActionForm('contaminationNote', value)}
                    placeholder="Описание контаминации"
                    placeholderTextColor="#7C8A80"
                    style={[styles.input, styles.multilineInput]}
                    value={actionForm.contaminationNote}
                  />
                )}
                {actionType === 'introLoss' && (
                  <>
                    <View style={styles.field}>
                      <Text style={styles.label}>Количество потерь *</Text>
                      <TextInput
                        inputMode="numeric"
                        keyboardType="numeric"
                        onChangeText={(value) => onChangeActionForm('lossCount', value)}
                        placeholderTextColor="#7C8A80"
                        style={styles.input}
                        value={actionForm.lossCount}
                      />
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.label}>Причина *</Text>
                      <TextInput
                        multiline
                        onChangeText={(value) => onChangeActionForm('lossReason', value)}
                        placeholderTextColor="#7C8A80"
                        style={[styles.input, styles.multilineInput]}
                        value={actionForm.lossReason}
                      />
                    </View>
                  </>
                )}
                {actionType === 'quarantine' && (
                  <TextInput
                    multiline
                    onChangeText={(value) => onChangeActionForm('quarantineReason', value)}
                    placeholder="Причина карантина"
                    placeholderTextColor="#7C8A80"
                    style={[styles.input, styles.multilineInput]}
                    value={actionForm.quarantineReason}
                  />
                )}
                {actionType === 'movement' && (
                  <>
                    <View style={styles.field}>
                      <Text style={styles.label}>Теплица</Text>
                      <TextInput
                        onChangeText={(value) => onChangeActionForm('greenhouseName', value)}
                        placeholder="Например: 1"
                        placeholderTextColor="#7C8A80"
                        style={styles.input}
                        value={actionForm.greenhouseName}
                      />
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.label}>Стеллаж</Text>
                      <TextInput
                        onChangeText={(value) => onChangeActionForm('rackName', value)}
                        placeholder="Например: B"
                        placeholderTextColor="#7C8A80"
                        style={styles.input}
                        value={actionForm.rackName}
                      />
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.label}>Полка</Text>
                      <TextInput
                        onChangeText={(value) => onChangeActionForm('shelfName', value)}
                        placeholder="Например: 3"
                        placeholderTextColor="#7C8A80"
                        style={styles.input}
                        value={actionForm.shelfName}
                      />
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.label}>Комментарий</Text>
                      <TextInput
                        multiline
                        onChangeText={(value) => onChangeActionForm('movementComment', value)}
                        placeholder="Комментарий"
                        placeholderTextColor="#7C8A80"
                        style={[styles.input, styles.multilineInput]}
                        value={actionForm.movementComment}
                      />
                    </View>
                  </>
                )}
                <View style={localStyles.photoField}>
                  <PhotoGallery
                    addLabel="Добавить фото"
                    addMoreLabel="Добавить еще фото"
                    editable
                    onAdd={onPickActionPhoto}
                    onRemove={onRemoveActionPhoto}
                    onReplace={onReplaceActionPhoto}
                    uris={photoUris}
                  />
                </View>
              </ScrollView>
            </View>
          </View>

          <View style={localStyles.footer}>
            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={handleSavePress}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressedButton,
              ]}
            >
              <Text style={styles.primaryButtonText}>Сохранить</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsAlertVisible(false)}
        transparent
        visible={isAlertVisible}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => setIsAlertVisible(false)}
          style={StyleSheet.absoluteFill}
        />
        <View style={localStyles.alertOverlay}>
          <View style={localStyles.alertCard}>
            <Text style={localStyles.alertTitle}>Внимание</Text>
            <Text style={localStyles.alertMessage}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsAlertVisible(false)}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressedButton,
                localStyles.alertButton,
              ]}
            >
              <Text style={styles.primaryButtonText}>Закрыть</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const localStyles = {
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  fixedHeader: {
    flexShrink: 0,
  },
  contentArea: {
    flex: 1,
    minHeight: 0,
  },
  whitePanel: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  actionTabsWrap: {
    marginBottom: 12,
  },
  scrollContent: {
    flexGrow: 1,
    gap: 14,
    paddingBottom: 2,
  },
  commentField: {
    gap: 12,
  },
  photoField: {
    gap: 12,
  },
  fieldHint: {
    color: '#65756B',
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    paddingBottom: 16,
    paddingTop: 18,
  },
  alertOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    gap: 14,
  },
  alertTitle: {
    color: '#1E3B2B',
    fontSize: 24,
    lineHeight: 30,
    fontFamily: 'Nunito_800ExtraBold',
  },
  alertMessage: {
    color: '#71837B',
    fontSize: 17,
    lineHeight: 24,
    fontFamily: 'Nunito_400Regular',
  },
  alertButton: {
    marginTop: 2,
  },
};

