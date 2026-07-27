// Экран формы изменения статуса партии.
import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from '../../styles';
import PhotoGallery from '../components/PhotoGallery';
import { formatDisplayDate } from '../domain/dates';
import {
  getCardActiveProblemQuantity,
  getCardCurrentQuantity,
  getCardDisplayName,
  getCardUnisolatedProblemQuantity,
} from '../domain/batch';
import StageHeader from '../components/StageHeader';
import StatusFilterTabs from '../components/StatusFilterTabs';
import SelectBottomSheet from '../components/SelectBottomSheet';
import { CalendarIcon, ChevronDownIcon, LeaveIcon } from '../components/icons';
import { INTRO_STAGE, stages } from '../domain/constants';

const countFieldByType = {
  rooting: 'rootedCount',
  death: 'deathCount',
  discard: 'discardCount',
  introLoss: 'lossCount',
  sale: 'saleCount',
  propagation: 'propagationCount',
  transplant: 'transplantCount',
};

const adaptationCareOptions = ['Полив', 'Подкормка', 'Стимуляция', 'Профилактика', 'Лечение'];
const greenhouseCareOptions = ['Полив', 'Подкормка', 'Стимуляция', 'Профилактика', 'Лечение'];
const genericProblemTypeOptions = ['Контаминация', 'Карантин', 'Болезнь', 'Вредители', 'Другое'];
const hardeningProblemTypeOptions = ['Ожоги', 'Увядание', 'Болезнь', 'Вредители', 'Карантин', 'Другое'];
const plantingProblemTypeOptions = ['Увядание', 'Ожоги', 'Болезнь', 'Вредители', 'Погодный стресс', 'Карантин', 'Другое'];
const riskLevelOptions = ['Низкий', 'Средний', 'Высокий', 'Критический'];
const turgorOptions = ['Нормальный', 'Снижен', 'Критически снижен'];
const readinessOptions = ['Не готова', 'Частично готова', 'Готова'];
const survivalRateOptions = ['Низкая', 'Средняя', 'Хорошая', 'Отличная'];
const completionResultOptions = ['Прижилась', 'Частично прижилась', 'Не прижилась', 'Завершена вручную'];

function getProblemTypeOptions(stage) {
  if (stage === stages[4]) {
    return hardeningProblemTypeOptions;
  }

  if (stage === stages[5]) {
    return plantingProblemTypeOptions;
  }

  return genericProblemTypeOptions;
}

// Экран добавления и редактирования производственного события по выбранной дате.
export default function StatusChangeFormScreen({
  eventType,
  form,
  formError,
  formNotice,
  isEditing,
  onBack,
  onChangeField,
  onAddPhoto,
  onRemovePhoto,
  onReplacePhoto,
  onSave,
  onSelectEventType,
  selectedCard,
  selectedDate,
}) {
  const [isCareDropdownOpen, setIsCareDropdownOpen] = useState(false);
  const [isProblemTypeDropdownOpen, setIsProblemTypeDropdownOpen] = useState(false);
  const [isRiskDropdownOpen, setIsRiskDropdownOpen] = useState(false);
  const [isStressDropdownOpen, setIsStressDropdownOpen] = useState(false);
  const [isStabilityDropdownOpen, setIsStabilityDropdownOpen] = useState(false);
  const [isTurgorDropdownOpen, setIsTurgorDropdownOpen] = useState(false);
  const [isReadinessDropdownOpen, setIsReadinessDropdownOpen] = useState(false);
  const [isSurvivalDropdownOpen, setIsSurvivalDropdownOpen] = useState(false);
  const [isCompletionDropdownOpen, setIsCompletionDropdownOpen] = useState(false);
  const [isNoticeVisible, setIsNoticeVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveAttemptCount, setSaveAttemptCount] = useState(0);
  const seenAlertRef = useRef('');
  const isMovementEvent = eventType === 'movement';
  const alertMessage = formError || formNotice || '';
  const activeProblemQuantity = getCardActiveProblemQuantity(selectedCard);
  const unisolatedProblemQuantity = getCardUnisolatedProblemQuantity(selectedCard);
  const canRecordProblemRecovery = activeProblemQuantity > 0 || eventType === 'problemRecovery';
  const canIsolateProblem = unisolatedProblemQuantity > 0 || eventType === 'problemIsolation';
  const eventOptions = selectedCard.stage === INTRO_STAGE
    ? [
      ['rooting', 'Укоренение'],
      ['propagation', 'Размножение'],
      ['movement', 'Перемещение'],
      ['problem', 'Проблема'],
      ['death', 'Гибель'],
      ['discard', 'Выбраковка'],
      ['sale', 'Продажа'],
    ]
    : selectedCard.stage === 'Клонирование'
      ? [
        ['rooting', 'Укоренение'],
        ['propagation', 'Размножение'],
        ['problem', 'Проблема'],
        ['movement', 'Перемещение'],
        ['introLoss', 'Потери'],
        ['sale', 'Продажа'],
      ]
    : selectedCard.stage === 'Адаптация'
      ? [
        ['adaptationStress', 'Наблюдение'],
        ['adaptationCare', 'Уход'],
        ['problem', 'Проблема'],
        ['movement', 'Перемещение'],
        ['introLoss', 'Потери'],
        ['sale', 'Продажа'],
      ]
    : selectedCard.stage === 'Теплица'
      ? [
        ['greenhouseObservation', 'Наблюдение'],
        ['greenhouseCare', 'Уход'],
        ['problem', 'Проблема'],
        ['transplant', 'Пересадка'],
        ['movement', 'Перемещение'],
        ['introLoss', 'Потери'],
        ['sale', 'Продажа'],
      ]
    : selectedCard.stage === stages[4]
      ? [
        ['hardeningObservation', 'Наблюдение'],
        ['hardeningCare', 'Уход'],
        ['problem', 'Проблема'],
        ['movement', 'Перемещение'],
        ['introLoss', 'Потери'],
        ['sale', 'Продажа'],
      ]
      : selectedCard.stage === stages[5]
        ? [
          ['planting', 'Высадка'],
          ['plantingObservation', 'Наблюдение'],
          ['plantingCare', 'Уход'],
          ['problem', 'Проблема'],
          ['introLoss', 'Потери'],
          ['sale', 'Продажа'],
          ['plantingCompletion', 'Завершение'],
        ]
      : [
      ['rooting', 'Укоренение'],
      ['propagation', 'Размножение'],
      ['movement', 'Перемещение'],
      ['problem', 'Проблема'],
      ['introLoss', 'Потери'],
      ['sale', 'Продажа'],
    ];
  const displayedEventOptions = eventOptions.flatMap((item) => {
    if (item[0] !== 'problem') {
      return [item];
    }

    return [
      item,
      ...(canRecordProblemRecovery ? [['problemRecovery', 'Выздоровление']] : []),
      ...(canIsolateProblem ? [['problemIsolation', 'Изолировать растения']] : []),
    ];
  });
  const countField = countFieldByType[eventType || 'rooting'];
  const selectedEventLabel = displayedEventOptions.find(([value]) => value === eventType)?.[1] ||
    {
      quarantine: 'Карантин',
      hardeningObservation: 'Наблюдение',
      hardeningCare: 'Уход',
      planting: 'Высадка',
      plantingObservation: 'Наблюдение',
      plantingCare: 'Уход',
      plantingCompletion: 'Завершение',
    }[eventType] ||
    'Событие';
  const careOptions = ['greenhouseCare', 'hardeningCare', 'plantingCare'].includes(eventType)
    ? greenhouseCareOptions
    : adaptationCareOptions;

  useEffect(() => {
    setIsCareDropdownOpen(false);
    setIsProblemTypeDropdownOpen(false);
    setIsRiskDropdownOpen(false);
    setIsStressDropdownOpen(false);
    setIsStabilityDropdownOpen(false);
    setIsTurgorDropdownOpen(false);
    setIsReadinessDropdownOpen(false);
    setIsSurvivalDropdownOpen(false);
    setIsCompletionDropdownOpen(false);
  }, [eventType]);

  useEffect(() => {
    if (
      eventType === 'problemIsolation' &&
      unisolatedProblemQuantity > 0 &&
      !`${form.isolationQuantity || ''}`.trim()
    ) {
      onChangeField('isolationQuantity', `${unisolatedProblemQuantity}`);
    }
  }, [eventType, unisolatedProblemQuantity, form.isolationQuantity, onChangeField]);

  useEffect(() => {
    if (!alertMessage) {
      seenAlertRef.current = '';
      setIsNoticeVisible(false);
      return;
    }

    const alertKey = `${saveAttemptCount}:${alertMessage}`;

    if (alertKey !== seenAlertRef.current) {
      seenAlertRef.current = alertKey;
      setIsNoticeVisible(true);
    }
  }, [alertMessage, saveAttemptCount]);

  async function handleSavePress() {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveAttemptCount((current) => current + 1);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  }

  function selectCareType(value) {
    onChangeField('careType', value);
    setIsCareDropdownOpen(false);
  }

  function selectRiskLevel(value) {
    onChangeField('riskLevel', value);
    setIsRiskDropdownOpen(false);
  }

  function selectProblemType(value) {
    onChangeField('problemType', value);
    setIsProblemTypeDropdownOpen(false);
  }

  function selectStressLevel(value) {
    onChangeField('stressLevel', value);
    setIsStressDropdownOpen(false);
  }

  function selectStability(value) {
    onChangeField('stability', value);
    setIsStabilityDropdownOpen(false);
  }

  function selectTurgor(value) {
    onChangeField('turgor', value);
    setIsTurgorDropdownOpen(false);
  }

  function selectReadiness(value) {
    onChangeField('readinessForPlanting', value);
    setIsReadinessDropdownOpen(false);
  }

  function selectSurvivalRate(value) {
    onChangeField('survivalRate', value);
    setIsSurvivalDropdownOpen(false);
  }

  function selectCompletionResult(value) {
    onChangeField('completionResult', value);
    setIsCompletionDropdownOpen(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <StageHeader
        onBack={onBack}
        subtitle={<Text style={styles.stageHeaderSubtitle}>{selectedCard.stage || INTRO_STAGE}</Text>}
        title={isEditing ? 'Редактировать событие' : 'Добавить событие'}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={localStyles.screen}>
          <View style={localStyles.fixedHeader}>
            {/* Контекст события: к какой карточке и дате относится форма. */}
            <View style={styles.cardsHeader}>
              <Text style={styles.eventFormCardTitle}>
                {getCardDisplayName(selectedCard)}
              </Text>
              <View style={styles.cardsMetaRow}>
                <View style={styles.cardsMetaItem}>
                  <CalendarIcon color="#15863F" size={16} />
                  <Text style={styles.cardsMetaText}>
                    {formatDisplayDate(selectedDate)}
                  </Text>
                </View>
                <View style={styles.cardsMetaItem}>
                  <LeaveIcon color="#15863F" size={16} />
                  <Text style={styles.cardsMetaText}>
                    {getCardCurrentQuantity(selectedCard)} шт.
                  </Text>
                </View>
              </View>
            </View>

            {!isEditing && (
              <View style={localStyles.actionTabsWrap}>
                <StatusFilterTabs
                  activeValue={eventType}
                  items={displayedEventOptions}
                  onChange={onSelectEventType}
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
              {/* Выбор типа события определяет набор полей ниже. */}
              {isEditing && (
                <Text style={styles.editActionTitle}>{selectedEventLabel}</Text>
              )}

              {![
                'adaptationStress',
                'adaptationCare',
                'greenhouseObservation',
                'greenhouseCare',
                'hardeningObservation',
                'hardeningCare',
                'planting',
                'plantingObservation',
                'plantingCare',
                'plantingCompletion',
                'problem',
                'problemRecovery',
                'problemIsolation',
                'movement',
                'quarantine',
              ].includes(eventType) && (
                <View style={styles.field}>
                  <Text style={styles.label}>
                    {eventType === 'introLoss' ? 'Количество потерь *' : 'Количество, шт. *'}
                  </Text>
                  <TextInput
                    inputMode="numeric"
                    keyboardType="numeric"
                    onChangeText={(value) => onChangeField(countField, value)}
                    placeholder={eventType === 'introLoss' ? '0' : '0'}
                    placeholderTextColor="#7C8A80"
                    style={styles.input}
                    value={form[countField]}
                  />
                </View>
              )}

              {/* Наблюдение на адаптации: стресс и тургор. */}
              {eventType === 'adaptationStress' && (
                <>
                  <View style={styles.field}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setIsStressDropdownOpen((current) => !current)}
                      style={({ pressed }) => [
                        styles.selectButton,
                        pressed && styles.linkButtonPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectButtonText,
                          !form.stressLevel && styles.selectPlaceholder,
                        ]}
                      >
                        {form.stressLevel || 'Выберите уровень стресса'}
                      </Text>
                      <View style={styles.selectButtonArrow}>
                        <ChevronDownIcon />
                      </View>
                    </Pressable>

                    <SelectBottomSheet
                      onClose={() => setIsStressDropdownOpen(false)}
                      onSelect={selectStressLevel}
                      options={['Низкий', 'Средний', 'Высокий', 'Критический']}
                      title="Выберите уровень стресса"
                      visible={isStressDropdownOpen}
                      />
                    </View>
                  <View style={styles.field}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setIsTurgorDropdownOpen((current) => !current)}
                      style={({ pressed }) => [
                        styles.selectButton,
                        pressed && styles.linkButtonPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectButtonText,
                          !form.turgor && styles.selectPlaceholder,
                        ]}
                      >
                        {form.turgor || 'Выберите тургор'}
                      </Text>
                      <View style={styles.selectButtonArrow}>
                        <ChevronDownIcon />
                      </View>
                    </Pressable>

                    <SelectBottomSheet
                      onClose={() => setIsTurgorDropdownOpen(false)}
                      onSelect={selectTurgor}
                      options={turgorOptions}
                      title="Выберите тургор"
                      visible={isTurgorDropdownOpen}
                    />
                  </View>
                </>
              )}

              {eventType === 'adaptationCare' && (
                <View style={styles.field}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setIsCareDropdownOpen((current) => !current)}
                    style={({ pressed }) => [
                      styles.selectButton,
                      pressed && styles.linkButtonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.selectButtonText,
                        !form.careType && styles.selectPlaceholder,
                      ]}
                    >
                      {form.careType || 'Выберите тип ухода'}
                    </Text>
                    <View style={styles.selectButtonArrow}>
                      <ChevronDownIcon />
                    </View>
                  </Pressable>

                  <SelectBottomSheet
                    onClose={() => setIsCareDropdownOpen(false)}
                    onSelect={selectCareType}
                    options={careOptions}
                    title="Выберите тип ухода"
                    visible={isCareDropdownOpen}
                  />
                </View>
              )}

              {eventType === 'greenhouseObservation' && (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Скорость роста</Text>
                    <TextInput onChangeText={(value) => onChangeField('growthRate', value)} placeholder="Например: активный рост, замедление" placeholderTextColor="#7C8A80" style={styles.input} value={form.growthRate} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Состояние</Text>
                    <TextInput multiline onChangeText={(value) => onChangeField('conditionDescription', value)} placeholder="Листья, тургор, прирост, общее состояние" placeholderTextColor="#7C8A80" style={[styles.input, styles.multilineInput]} value={form.conditionDescription} />
                  </View>
                  <View style={styles.field}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setIsStressDropdownOpen((current) => !current)}
                      style={({ pressed }) => [
                        styles.selectButton,
                        pressed && styles.linkButtonPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectButtonText,
                          !form.stressLevel && styles.selectPlaceholder,
                        ]}
                      >
                        {form.stressLevel || 'Выберите уровень стресса'}
                      </Text>
                      <View style={styles.selectButtonArrow}>
                        <ChevronDownIcon />
                      </View>
                    </Pressable>

                    <SelectBottomSheet
                      onClose={() => setIsStressDropdownOpen(false)}
                      onSelect={selectStressLevel}
                      options={['Низкий', 'Средний', 'Высокий', 'Критический']}
                      title="Выберите уровень стресса"
                      visible={isStressDropdownOpen}
                    />
                  </View>
                </>
              )}

              {['greenhouseCare', 'hardeningCare'].includes(eventType) && (
                <>
                  <View style={styles.field}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setIsCareDropdownOpen((current) => !current)}
                      style={({ pressed }) => [
                        styles.selectButton,
                        pressed && styles.linkButtonPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectButtonText,
                          !form.careType && styles.selectPlaceholder,
                        ]}
                      >
                        {form.careType || 'Выберите тип ухода'}
                      </Text>
                      <View style={styles.selectButtonArrow}>
                        <ChevronDownIcon />
                      </View>
                    </Pressable>

                    <SelectBottomSheet
                      onClose={() => setIsCareDropdownOpen(false)}
                      onSelect={selectCareType}
                      options={careOptions}
                      title="Выберите тип ухода"
                      visible={isCareDropdownOpen}
                    />
                  </View>
                </>
              )}

              {eventType === 'planting' && (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Место высадки</Text>
                    <TextInput onChangeText={(value) => onChangeField('plantingLocation', value)} placeholder="Грядка, кассета, контейнер" placeholderTextColor="#7C8A80" style={styles.input} value={form.plantingLocation} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Схема посадки</Text>
                    <TextInput onChangeText={(value) => onChangeField('plantingScheme', value)} placeholder="Например: 30x40 см" placeholderTextColor="#7C8A80" style={styles.input} value={form.plantingScheme} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Площадь / участок</Text>
                    <TextInput onChangeText={(value) => onChangeField('plotArea', value)} placeholder="Например: участок 2, 12 м2" placeholderTextColor="#7C8A80" style={styles.input} value={form.plotArea} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Тип грунта</Text>
                    <TextInput onChangeText={(value) => onChangeField('soilType', value)} placeholder="Грунт, субстрат, смесь" placeholderTextColor="#7C8A80" style={styles.input} value={form.soilType} />
                  </View>
                </>
              )}

              {eventType === 'plantingObservation' && (
                <>
                  <View style={styles.field}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setIsSurvivalDropdownOpen((current) => !current)}
                      style={({ pressed }) => [
                        styles.selectButton,
                        pressed && styles.linkButtonPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectButtonText,
                          !form.survivalRate && styles.selectPlaceholder,
                        ]}
                      >
                        {form.survivalRate || 'Выберите приживаемость'}
                      </Text>
                      <View style={styles.selectButtonArrow}>
                        <ChevronDownIcon />
                      </View>
                    </Pressable>

                    <SelectBottomSheet
                      onClose={() => setIsSurvivalDropdownOpen(false)}
                      onSelect={selectSurvivalRate}
                      options={survivalRateOptions}
                      title="Выберите приживаемость"
                      visible={isSurvivalDropdownOpen}
                    />
                  </View>
                  <View style={styles.field}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setIsStressDropdownOpen((current) => !current)}
                      style={({ pressed }) => [
                        styles.selectButton,
                        pressed && styles.linkButtonPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectButtonText,
                          !form.stressLevel && styles.selectPlaceholder,
                        ]}
                      >
                        {form.stressLevel || 'Выберите уровень стресса'}
                      </Text>
                      <View style={styles.selectButtonArrow}>
                        <ChevronDownIcon />
                      </View>
                    </Pressable>

                    <SelectBottomSheet
                      onClose={() => setIsStressDropdownOpen(false)}
                      onSelect={selectStressLevel}
                      options={['Низкий', 'Средний', 'Высокий', 'Критический']}
                      title="Выберите уровень стресса"
                      visible={isStressDropdownOpen}
                    />
                  </View>
                  <View style={styles.field}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setIsTurgorDropdownOpen((current) => !current)}
                      style={({ pressed }) => [
                        styles.selectButton,
                        pressed && styles.linkButtonPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectButtonText,
                          !form.turgor && styles.selectPlaceholder,
                        ]}
                      >
                        {form.turgor || 'Выберите тургор'}
                      </Text>
                      <View style={styles.selectButtonArrow}>
                        <ChevronDownIcon />
                      </View>
                    </Pressable>

                    <SelectBottomSheet
                      onClose={() => setIsTurgorDropdownOpen(false)}
                      onSelect={selectTurgor}
                      options={turgorOptions}
                      title="Выберите тургор"
                      visible={isTurgorDropdownOpen}
                    />
                  </View>
                </>
              )}

              {eventType === 'plantingCare' && (
                <>
                  <View style={styles.field}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setIsCareDropdownOpen((current) => !current)}
                      style={({ pressed }) => [
                        styles.selectButton,
                        pressed && styles.linkButtonPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectButtonText,
                          !form.careType && styles.selectPlaceholder,
                        ]}
                      >
                        {form.careType || 'Выберите тип ухода'}
                      </Text>
                      <View style={styles.selectButtonArrow}>
                        <ChevronDownIcon />
                      </View>
                    </Pressable>

                    <SelectBottomSheet
                      onClose={() => setIsCareDropdownOpen(false)}
                      onSelect={selectCareType}
                      options={careOptions}
                      title="Выберите тип ухода"
                      visible={isCareDropdownOpen}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Препарат</Text>
                    <TextInput onChangeText={(value) => onChangeField('productName', value)} placeholder="Препарат" placeholderTextColor="#7C8A80" style={styles.input} value={form.productName} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Дозировка</Text>
                    <TextInput onChangeText={(value) => onChangeField('dosage', value)} placeholder="Дозировка" placeholderTextColor="#7C8A80" style={styles.input} value={form.dosage} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Способ внесения</Text>
                    <TextInput onChangeText={(value) => onChangeField('applicationMethod', value)} placeholder="Способ внесения" placeholderTextColor="#7C8A80" style={styles.input} value={form.applicationMethod} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Реакция растений</Text>
                    <TextInput onChangeText={(value) => onChangeField('plantReaction', value)} placeholder="Реакция растений" placeholderTextColor="#7C8A80" style={styles.input} value={form.plantReaction} />
                  </View>
                </>
              )}

              {eventType === 'plantingCompletion' && (
                <View style={styles.field}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setIsCompletionDropdownOpen((current) => !current)}
                    style={({ pressed }) => [
                      styles.selectButton,
                      pressed && styles.linkButtonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.selectButtonText,
                        !form.completionResult && styles.selectPlaceholder,
                      ]}
                    >
                      {form.completionResult || 'Выберите итог высадки'}
                    </Text>
                    <View style={styles.selectButtonArrow}>
                      <ChevronDownIcon />
                    </View>
                  </Pressable>

                  <SelectBottomSheet
                    onClose={() => setIsCompletionDropdownOpen(false)}
                    onSelect={selectCompletionResult}
                    options={completionResultOptions}
                    title="Выберите итог высадки"
                    visible={isCompletionDropdownOpen}
                  />
                </View>
              )}

              {eventType === 'hardeningObservation' && (
                <>
                  <View style={styles.field}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setIsStressDropdownOpen((current) => !current)}
                      style={({ pressed }) => [
                        styles.selectButton,
                        pressed && styles.linkButtonPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectButtonText,
                          !form.stressLevel && styles.selectPlaceholder,
                        ]}
                      >
                        {form.stressLevel || 'Выберите уровень стресса'}
                      </Text>
                      <View style={styles.selectButtonArrow}>
                        <ChevronDownIcon />
                      </View>
                    </Pressable>

                    <SelectBottomSheet
                      onClose={() => setIsStressDropdownOpen(false)}
                      onSelect={selectStressLevel}
                      options={['Низкий', 'Средний', 'Высокий', 'Критический']}
                      title="Выберите уровень стресса"
                      visible={isStressDropdownOpen}
                    />
                  </View>
                  <View style={styles.field}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setIsTurgorDropdownOpen((current) => !current)}
                      style={({ pressed }) => [
                        styles.selectButton,
                        pressed && styles.linkButtonPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectButtonText,
                          !form.turgor && styles.selectPlaceholder,
                        ]}
                      >
                        {form.turgor || 'Выберите тургор'}
                      </Text>
                      <View style={styles.selectButtonArrow}>
                        <ChevronDownIcon />
                      </View>
                    </Pressable>

                    <SelectBottomSheet
                      onClose={() => setIsTurgorDropdownOpen(false)}
                      onSelect={selectTurgor}
                      options={turgorOptions}
                      title="Выберите тургор"
                      visible={isTurgorDropdownOpen}
                    />
                  </View>
                  <View style={styles.field}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setIsReadinessDropdownOpen((current) => !current)}
                      style={({ pressed }) => [
                        styles.selectButton,
                        pressed && styles.linkButtonPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectButtonText,
                          !form.readinessForPlanting && styles.selectPlaceholder,
                        ]}
                      >
                        {form.readinessForPlanting || 'Выберите готовность к высадке'}
                      </Text>
                      <View style={styles.selectButtonArrow}>
                        <ChevronDownIcon />
                      </View>
                    </Pressable>

                    <SelectBottomSheet
                      onClose={() => setIsReadinessDropdownOpen(false)}
                      onSelect={selectReadiness}
                      options={readinessOptions}
                      title="Выберите готовность к высадке"
                      visible={isReadinessDropdownOpen}
                    />
                  </View>
                </>
              )}

              {eventType === 'problem' && (
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
                          !form.problemType && styles.selectPlaceholder,
                        ]}
                      >
                        {form.problemType || 'Выберите тип проблемы'}
                      </Text>
                      <View style={styles.selectButtonArrow}>
                        <ChevronDownIcon />
                      </View>
                    </Pressable>

                    <SelectBottomSheet
                      onClose={() => setIsProblemTypeDropdownOpen(false)}
                      onSelect={selectProblemType}
                      options={getProblemTypeOptions(selectedCard.stage)}
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
                          !form.riskLevel && styles.selectPlaceholder,
                        ]}
                      >
                        {form.riskLevel || 'Выберите уровень риска'}
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
                      onChangeText={(value) => onChangeField('affectedQuantity', value)}
                      placeholder="0"
                      placeholderTextColor="#7C8A80"
                      style={styles.input}
                      value={form.affectedQuantity}
                    />
                    <Text style={localStyles.fieldHint}>
                      {activeProblemQuantity > 0
                        ? `Сейчас с проблемой: ${activeProblemQuantity} шт. Действие «Выздоровление» доступно вверху формы.`
                        : 'После сохранения проблемы появится действие «Выздоровление».'}
                    </Text>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>Описание проблемы</Text>
                    <TextInput
                      multiline
                      onChangeText={(value) => onChangeField('problemDescription', value)}
                      placeholder="Опишите проблему"
                      placeholderTextColor="#7C8A80"
                      style={[styles.input, styles.multilineInput]}
                      value={form.problemDescription}
                    />
                  </View>

                </>
              )}

              {eventType === 'problemRecovery' && (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Количество выздоровевших, шт. *</Text>
                    <TextInput
                      inputMode="numeric"
                      keyboardType="numeric"
                      onChangeText={(value) => onChangeField('recoveredQuantity', value)}
                      placeholder="0"
                      placeholderTextColor="#7C8A80"
                      style={styles.input}
                      value={form.recoveredQuantity}
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
                          !form.riskLevel && styles.selectPlaceholder,
                        ]}
                      >
                        {form.riskLevel || 'Выберите уровень риска после выздоровления'}
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
                      onChangeText={(value) => onChangeField('comment', value)}
                      placeholder={`Сейчас с проблемой: ${activeProblemQuantity} шт.`}
                      placeholderTextColor="#7C8A80"
                      style={[styles.input, styles.multilineInput]}
                      value={form.comment}
                    />
                  </View>
                </>
              )}

              {eventType === 'problemIsolation' && (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Количество для изоляции, шт. *</Text>
                    <TextInput
                      inputMode="numeric"
                      keyboardType="numeric"
                      onChangeText={(value) => onChangeField('isolationQuantity', value)}
                      placeholder={`${unisolatedProblemQuantity || 0}`}
                      placeholderTextColor="#7C8A80"
                      style={styles.input}
                      value={form.isolationQuantity}
                    />
                    <Text style={localStyles.fieldHint}>
                      Необходимо изолировать: {unisolatedProblemQuantity} шт.
                    </Text>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>Новое местоположение *</Text>
                    <TextInput
                      onChangeText={(value) => onChangeField('isolationLocation', value)}
                      placeholder="Например: Изолятор 1, стеллаж B, полка 3"
                      placeholderTextColor="#7C8A80"
                      style={styles.input}
                      value={form.isolationLocation}
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>Итог разделения</Text>
                    <Text style={localStyles.fieldHint}>
                      Исходная партия: {Math.max(getCardCurrentQuantity(selectedCard) - (Number(form.isolationQuantity) || 0), 0)} шт.
                    </Text>
                    <Text style={localStyles.fieldHint}>
                      Новая изолированная партия: {Number(form.isolationQuantity) || 0} шт. QR ожидает печати.
                    </Text>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>Комментарий</Text>
                    <TextInput
                      multiline
                      onChangeText={(value) => onChangeField('isolationComment', value)}
                      placeholder="Комментарий"
                      placeholderTextColor="#7C8A80"
                      style={[styles.input, styles.multilineInput]}
                      value={form.isolationComment}
                    />
                  </View>
                </>
              )}

              {eventType === 'transplant' && (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Размещение</Text>
                    <TextInput onChangeText={(value) => onChangeField('placement', value)} placeholder="Куда пересажено" placeholderTextColor="#7C8A80" style={styles.input} value={form.placement} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Изменение плотности</Text>
                    <TextInput onChangeText={(value) => onChangeField('densityChange', value)} placeholder="Например: 40 -> 24 шт./м2" placeholderTextColor="#7C8A80" style={styles.input} value={form.densityChange} />
                  </View>
                </>
              )}

              {isMovementEvent && (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Теплица</Text>
                    <TextInput
                      onChangeText={(value) => onChangeField('greenhouseName', value)}
                      placeholder="Например: 1"
                      placeholderTextColor="#7C8A80"
                      style={styles.input}
                      value={form.greenhouseName}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Стеллаж</Text>
                    <TextInput
                      onChangeText={(value) => onChangeField('rackName', value)}
                      placeholder="Например: B"
                      placeholderTextColor="#7C8A80"
                      style={styles.input}
                      value={form.rackName}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Полка</Text>
                    <TextInput
                      onChangeText={(value) => onChangeField('shelfName', value)}
                      placeholder="Например: 3"
                      placeholderTextColor="#7C8A80"
                      style={styles.input}
                      value={form.shelfName}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Комментарий</Text>
                    <TextInput
                      multiline
                      onChangeText={(value) => onChangeField('movementComment', value)}
                      placeholder="Комментарий"
                      placeholderTextColor="#7C8A80"
                      style={[styles.input, styles.multilineInput]}
                      value={form.movementComment}
                    />
                  </View>
                  <View style={localStyles.photoField}>
                    <PhotoGallery
                      addLabel="Добавить фото"
                      addMoreLabel="Добавить еще фото"
                      editable
                      onAdd={onAddPhoto}
                      onRemove={onRemovePhoto}
                      onReplace={onReplacePhoto}
                      uris={Array.isArray(form.photoUris) && form.photoUris.length > 0
                        ? form.photoUris
                        : form.photoUri
                          ? [form.photoUri]
                          : []}
                    />
                  </View>
                </>
              )}

              {['death', 'discard', 'introLoss', 'quarantine'].includes(eventType) && (
                <View style={styles.field}>
                  <Text style={styles.label}>
                    {eventType === 'introLoss'
                      ? 'Причина потерь *'
                      : eventType === 'quarantine'
                      ? 'Причина карантина *'
                      : 'Причина *'}
                  </Text>
                  <TextInput
                    multiline={eventType === 'introLoss'}
                    onChangeText={(value) => onChangeField('reason', value)}
                    placeholder={eventType === 'introLoss'
                      ? 'Укажите причину потерь'
                      : eventType === 'quarantine'
                      ? 'Укажите причину карантина'
                      : 'Укажите причину'}
                    placeholderTextColor="#7C8A80"
                    style={[
                      styles.input,
                      eventType === 'introLoss' && styles.multilineInput,
                    ]}
                    value={form.reason}
                  />
                </View>
              )}

              {eventType === 'sale' && (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Тип реализации</Text>
                    <TextInput
                      onChangeText={(value) => onChangeField('saleType', value)}
                      placeholder="Например: розница, опт, бронь"
                      placeholderTextColor="#7C8A80"
                      style={styles.input}
                      value={form.saleType}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Получатель</Text>
                    <TextInput
                      onChangeText={(value) => onChangeField('recipient', value)}
                      placeholder="Получатель, если нужно"
                      placeholderTextColor="#7C8A80"
                      style={styles.input}
                      value={form.recipient}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Стоимость</Text>
                    <TextInput
                      inputMode="decimal"
                      keyboardType="decimal-pad"
                      onChangeText={(value) => onChangeField('saleAmount', value)}
                      placeholder="Сумма, если нужно"
                      placeholderTextColor="#7C8A80"
                      style={styles.input}
                      value={form.saleAmount}
                    />
                  </View>
                </>
              )}

              {eventType === 'propagation' && (
                <View style={styles.field}>
                  <Text style={styles.label}>Способ размножения</Text>
                  <TextInput
                    onChangeText={(value) => onChangeField('propagationMethod', value)}
                    placeholder="Укажите способ"
                    placeholderTextColor="#7C8A80"
                    style={styles.input}
                    value={form.propagationMethod}
                  />
                </View>
              )}

              {!isMovementEvent && eventType !== 'problem' && eventType !== 'problemRecovery' && eventType !== 'problemIsolation' && eventType !== 'greenhouseObservation' && eventType !== 'introLoss' && (
                <>
                  {/* Общие поля есть у всех событий. */}
                  <View style={styles.field}>
                    <Text style={styles.label}>Комментарий</Text>
                    <TextInput
                      multiline
                      onChangeText={(value) => onChangeField('comment', value)}
                      placeholder="Комментарий"
                      placeholderTextColor="#7C8A80"
                      style={[styles.input, styles.multilineInput]}
                      value={form.comment}
                    />
                  </View>
                </>
              )}

              {Boolean(eventType) && !isMovementEvent && (
                <>
                  <View style={localStyles.photoField}>
                    <PhotoGallery
                      addLabel="Добавить фото"
                      addMoreLabel="Добавить еще фото"
                      editable
                      onAdd={onAddPhoto}
                      onRemove={onRemovePhoto}
                      onReplace={onReplacePhoto}
                      uris={Array.isArray(form.photoUris) && form.photoUris.length > 0
                        ? form.photoUris
                        : form.photoUri
                          ? [form.photoUri]
                          : []}
                    />
                  </View>
                </>
              )}

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
        onRequestClose={() => setIsNoticeVisible(false)}
        transparent
        visible={isNoticeVisible}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsNoticeVisible(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.confirmModal}>
            <Text style={styles.confirmModalTitle}>{formError ? 'Внимание' : 'Сообщение'}</Text>
            <Text style={styles.confirmModalText}>{alertMessage}</Text>
            <View style={styles.confirmModalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsNoticeVisible(false)}
                style={({ pressed }) => [
                  styles.primaryButton,
                  styles.confirmModalButton,
                  pressed && styles.pressedButton,
                ]}
              >
                <Text style={styles.primaryButtonText}>Закрыть</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}


const localStyles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  fixedHeader: {
    flexShrink: 0,
  },
  actionTabsWrap: {
    marginBottom: 12,
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
  scrollContent: {
    flexGrow: 1,
    gap: 14,
  },
  footer: {
    flexShrink: 0,
    paddingTop: 16,
    paddingBottom: 16,
  },
  scrollContentCompact: {
    paddingTop: 0,
  },
  photoField: {
    gap: 12,
  },
  fieldHint: {
    color: '#65756B',
    fontSize: 12,
    lineHeight: 16,
  },
});

