// Экран формы изменения статуса партии.
import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from '../../styles';
import PhotoGallery from '../components/PhotoGallery';
import { formatDisplayDate } from '../domain/dates';
import { getCardCurrentQuantity, getCardDisplayName } from '../domain/batch';
import StageHeader from '../components/StageHeader';
import StatusFilterTabs from '../components/StatusFilterTabs';
import SelectBottomSheet from '../components/SelectBottomSheet';
import { CalendarIcon, ChevronDownIcon, LeaveIcon } from '../components/icons';
import { INTRO_STAGE } from '../domain/constants';

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
const greenhouseCareOptions = ['Полив', 'Подкормка', 'Профилактика', 'Лечение'];
const problemTypeOptions = ['Контаминация', 'Карантин', 'Болезнь', 'Вредители', 'Стресс', 'Другое'];
const riskLevelOptions = ['Низкий', 'Средний', 'Высокий', 'Критический'];

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
  const [isDiseaseSeverityDropdownOpen, setIsDiseaseSeverityDropdownOpen] = useState(false);
  const [isProblemTypeDropdownOpen, setIsProblemTypeDropdownOpen] = useState(false);
  const [isRiskDropdownOpen, setIsRiskDropdownOpen] = useState(false);
  const [isStressDropdownOpen, setIsStressDropdownOpen] = useState(false);
  const [isStabilityDropdownOpen, setIsStabilityDropdownOpen] = useState(false);
  const [isNoticeVisible, setIsNoticeVisible] = useState(false);
  const [saveAttemptCount, setSaveAttemptCount] = useState(0);
  const seenAlertRef = useRef('');
  const isMovementEvent = eventType === 'movement';
  const alertMessage = formError || formNotice || '';
  const eventOptions = selectedCard.stage === INTRO_STAGE
    ? [
      ['rooting', 'Укоренение'],
      ['death', 'Гибель'],
      ['discard', 'Выбраковка'],
      ['sale', 'Продажа'],
      ['propagation', 'Размножение'],
      ['movement', 'Перемещение'],
      ['problem', 'Проблема'],
    ]
    : selectedCard.stage === 'Клонирование'
    ? [
      ['rooting', 'Укоренение'],
      ['propagation', 'Размножение'],
      ['movement', 'Перемещение'],
      ['introLoss', 'Потери'],
      ['sale', 'Продажа'],
      ['problem', 'Проблема'],
    ]
    : selectedCard.stage === 'Адаптация'
    ? [
      ['adaptationStress', 'Наблюдение'],
      ['adaptationEnvironment', 'Среда'],
      ['adaptationCare', 'Уход'],
      ['movement', 'Перемещение'],
      ['problem', 'Проблема'],
      ...((selectedCard.batchStatus || 'active') === 'quarantine'
        ? [['quarantineReleased', 'Снять карантин']]
        : []),
      ['introLoss', 'Потери'],
      ['sale', 'Продажа'],
    ]
    : selectedCard.stage === 'Теплица'
      ? [
        ['greenhouseObservation', 'Наблюдение'],
        ['greenhouseCare', 'Уход'],
        ['greenhouseEnvironment', 'Среда'],
        ['problem', 'Проблема'],
      ['transplant', 'Пересадка'],
      ['movement', 'Перемещение'],
        ...((selectedCard.batchStatus || 'active') === 'quarantine'
          ? [['quarantineReleased', 'Снять карантин']]
          : []),
        ['introLoss', 'Потери'],
        ['sale', 'Продажа'],
      ]
      : [
      ['rooting', 'Укоренение'],
      ['introLoss', 'Потери'],
      ['sale', 'Продажа'],
      ['propagation', 'Размножение'],
      ['movement', 'Перемещение'],
      ['problem', 'Проблема'],
    ];
  const countField = countFieldByType[eventType || 'rooting'];
  const selectedEventLabel = eventOptions.find(([value]) => value === eventType)?.[1] ||
    {
      greenhouseDisease: 'Болезни/вредители',
      quarantine: 'Карантин',
      adaptationHumidityReduction: 'Снижение влажности',
    }[eventType] ||
    'Событие';
  const careOptions = eventType === 'greenhouseCare'
    ? greenhouseCareOptions
    : adaptationCareOptions;

  useEffect(() => {
    setIsCareDropdownOpen(false);
    setIsDiseaseSeverityDropdownOpen(false);
    setIsProblemTypeDropdownOpen(false);
    setIsRiskDropdownOpen(false);
    setIsStressDropdownOpen(false);
    setIsStabilityDropdownOpen(false);
  }, [eventType]);

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

  function handleSavePress() {
    setSaveAttemptCount((current) => current + 1);
    onSave();
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

  function selectDiseaseSeverity(value) {
    onChangeField('diseaseSeverity', value);
    setIsDiseaseSeverityDropdownOpen(false);
  }

  function selectStressLevel(value) {
    onChangeField('stressLevel', value);
    setIsStressDropdownOpen(false);
  }

  function selectStability(value) {
    onChangeField('stability', value);
    setIsStabilityDropdownOpen(false);
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
                  items={eventOptions}
                  onChange={onSelectEventType}
                  showDots={false}
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
                'adaptationEnvironment',
                'adaptationHumidityReduction',
                'adaptationCare',
                'greenhouseObservation',
                'greenhouseCare',
                'greenhouseEnvironment',
                'greenhouseDisease',
                'problem',
                'movement',
                'quarantine',
                'quarantineReleased',
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

              {/* Наблюдение на адаптации: стресс и стабильность, детали в общем комментарии. */}
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
                </>
              )}

              {eventType === 'adaptationStress' && (
                <View style={styles.field}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setIsStabilityDropdownOpen((current) => !current)}
                    style={({ pressed }) => [
                      styles.selectButton,
                      pressed && styles.linkButtonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.selectButtonText,
                        !form.stability && styles.selectPlaceholder,
                      ]}
                    >
                      {form.stability || 'Выберите стабильность партии'}
                    </Text>
                    <View style={styles.selectButtonArrow}>
                      <ChevronDownIcon />
                    </View>
                  </Pressable>

                  <SelectBottomSheet
                    onClose={() => setIsStabilityDropdownOpen(false)}
                    onSelect={selectStability}
                    options={['Стабильна', 'Нестабильна']}
                    title="Выберите стабильность партии"
                    visible={isStabilityDropdownOpen}
                  />
                </View>
              )}

              {/* Фактические параметры среды на адаптации. */}
              {eventType === 'adaptationEnvironment' && (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Фактическая температура</Text>
                    <TextInput onChangeText={(value) => onChangeField('environmentTemperature', value)} placeholder="Например: 24 °C" placeholderTextColor="#7C8A80" style={styles.input} value={form.environmentTemperature} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Влажность воздуха</Text>
                    <TextInput onChangeText={(value) => onChangeField('environmentAirHumidity', value)} placeholder="Например: 75%" placeholderTextColor="#7C8A80" style={styles.input} value={form.environmentAirHumidity} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Влажность субстрата</Text>
                    <TextInput onChangeText={(value) => onChangeField('substrateHumidity', value)} placeholder="Например: умеренная или 45%" placeholderTextColor="#7C8A80" style={styles.input} value={form.substrateHumidity} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Освещение</Text>
                    <TextInput onChangeText={(value) => onChangeField('environmentLight', value)} placeholder="Фактическое освещение" placeholderTextColor="#7C8A80" style={styles.input} value={form.environmentLight} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Проветривание</Text>
                    <TextInput onChangeText={(value) => onChangeField('ventilation', value)} placeholder="Режим проветривания" placeholderTextColor="#7C8A80" style={styles.input} value={form.ventilation} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>План снижения влажности</Text>
                    <TextInput onChangeText={(value) => onChangeField('humidityReduction', value)} placeholder="Например: снизить до 75% за 3 дня" placeholderTextColor="#7C8A80" style={styles.input} value={form.humidityReduction} />
                  </View>
                </>
              )}

              {eventType === 'adaptationHumidityReduction' && (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Новое целевое снижение влажности</Text>
                    <TextInput onChangeText={(value) => onChangeField('humidityReduction', value)} placeholder="Например: снизить до 75% за 3 дня" placeholderTextColor="#7C8A80" style={styles.input} value={form.humidityReduction} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Влажность воздуха</Text>
                    <TextInput onChangeText={(value) => onChangeField('environmentAirHumidity', value)} placeholder="Например: 75%" placeholderTextColor="#7C8A80" style={styles.input} value={form.environmentAirHumidity} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Влажность субстрата</Text>
                    <TextInput onChangeText={(value) => onChangeField('substrateHumidity', value)} placeholder="Например: умеренная или 45%" placeholderTextColor="#7C8A80" style={styles.input} value={form.substrateHumidity} />
                  </View>
                </>
              )}

              {['adaptationEnvironment', 'adaptationHumidityReduction'].includes(eventType) && (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Тургор</Text>
                    <TextInput onChangeText={(value) => onChangeField('turgor', value)} placeholder="Например: нормальный, снижен" placeholderTextColor="#7C8A80" style={styles.input} value={form.turgor} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Стабильность партии</Text>
                    <View style={styles.toggleRow}>
                      {['Стабильна', 'Нестабильна'].map((value) => (
                        <Pressable
                          accessibilityRole="button"
                          key={value}
                          onPress={() => onChangeField('stability', value)}
                          style={[
                            styles.toggleButton,
                            form.stability === value && styles.toggleButtonActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.toggleButtonText,
                              form.stability === value && styles.toggleButtonTextActive,
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
                </>
              )}

              {['greenhouseObservation', 'greenhouseDisease', 'greenhouseCare', 'greenhouseEnvironment'].includes(eventType) && (
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
                    options={['Низкий', 'Средний', 'Высокий', 'Критический']}
                    title="Выберите уровень риска"
                    visible={isRiskDropdownOpen}
                  />
                </View>
              )}

              {eventType === 'greenhouseObservation' && (
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
                      onPress={() => setIsStabilityDropdownOpen((current) => !current)}
                      style={({ pressed }) => [
                        styles.selectButton,
                        pressed && styles.linkButtonPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectButtonText,
                          !form.stability && styles.selectPlaceholder,
                        ]}
                      >
                        {form.stability || 'Выберите стабильность'}
                      </Text>
                      <View style={styles.selectButtonArrow}>
                        <ChevronDownIcon />
                      </View>
                    </Pressable>

                    <SelectBottomSheet
                      onClose={() => setIsStabilityDropdownOpen(false)}
                      onSelect={selectStability}
                      options={['Стабильна', 'Нестабильна']}
                      title="Выберите стабильность"
                      visible={isStabilityDropdownOpen}
                    />
                  </View>
                </>
              )}

              {eventType === 'greenhouseCare' && (
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
                    <Text style={styles.label}>Интервал ухода, дней</Text>
                    <TextInput inputMode="numeric" keyboardType="numeric" onChangeText={(value) => onChangeField('careIntervalDays', value)} placeholder="Например: 2" placeholderTextColor="#7C8A80" style={styles.input} value={form.careIntervalDays} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Объем / препарат / дозировка</Text>
                    <TextInput onChangeText={(value) => onChangeField('waterVolume', value)} placeholder="Объем полива, если нужен" placeholderTextColor="#7C8A80" style={styles.input} value={form.waterVolume} />
                  </View>
                  <View style={styles.field}>
                    <TextInput onChangeText={(value) => onChangeField('productName', value)} placeholder="Препарат" placeholderTextColor="#7C8A80" style={styles.input} value={form.productName} />
                  </View>
                  <View style={styles.field}>
                    <TextInput onChangeText={(value) => onChangeField('dosage', value)} placeholder="Дозировка" placeholderTextColor="#7C8A80" style={styles.input} value={form.dosage} />
                  </View>
                  <View style={styles.field}>
                    <TextInput onChangeText={(value) => onChangeField('applicationMethod', value)} placeholder="Способ внесения" placeholderTextColor="#7C8A80" style={styles.input} value={form.applicationMethod} />
                  </View>
                  <View style={styles.field}>
                    <TextInput onChangeText={(value) => onChangeField('plantReaction', value)} placeholder="Реакция растений" placeholderTextColor="#7C8A80" style={styles.input} value={form.plantReaction} />
                  </View>
                </>
              )}

              {eventType === 'greenhouseEnvironment' && (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Температура</Text>
                    <TextInput onChangeText={(value) => onChangeField('environmentTemperature', value)} placeholder="Например: 24 °C" placeholderTextColor="#7C8A80" style={styles.input} value={form.environmentTemperature} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Влажность воздуха</Text>
                    <TextInput onChangeText={(value) => onChangeField('environmentAirHumidity', value)} placeholder="Например: 65%" placeholderTextColor="#7C8A80" style={styles.input} value={form.environmentAirHumidity} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Освещение</Text>
                    <TextInput onChangeText={(value) => onChangeField('environmentLight', value)} placeholder="Фактическое освещение" placeholderTextColor="#7C8A80" style={styles.input} value={form.environmentLight} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Проветривание</Text>
                    <TextInput onChangeText={(value) => onChangeField('ventilation', value)} placeholder="Режим проветривания" placeholderTextColor="#7C8A80" style={styles.input} value={form.ventilation} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Размещение</Text>
                    <TextInput onChangeText={(value) => onChangeField('placement', value)} placeholder="Стеллаж, зона, кассеты" placeholderTextColor="#7C8A80" style={styles.input} value={form.placement} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Плотность</Text>
                    <TextInput onChangeText={(value) => onChangeField('densityChange', value)} placeholder="Изменение плотности" placeholderTextColor="#7C8A80" style={styles.input} value={form.densityChange} />
                  </View>
                </>
              )}

              {eventType === 'greenhouseDisease' && (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Болезнь</Text>
                    <TextInput onChangeText={(value) => onChangeField('diseaseName', value)} placeholder="Название болезни" placeholderTextColor="#7C8A80" style={styles.input} value={form.diseaseName} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Вредитель</Text>
                    <TextInput onChangeText={(value) => onChangeField('pestName', value)} placeholder="Название вредителя" placeholderTextColor="#7C8A80" style={styles.input} value={form.pestName} />
                  </View>
                  <View style={styles.field}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setIsDiseaseSeverityDropdownOpen((current) => !current)}
                      style={({ pressed }) => [
                        styles.selectButton,
                        pressed && styles.linkButtonPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectButtonText,
                          !form.diseaseSeverity && styles.selectPlaceholder,
                        ]}
                      >
                        {form.diseaseSeverity || 'Выберите степень поражения'}
                      </Text>
                      <View style={styles.selectButtonArrow}>
                        <ChevronDownIcon />
                      </View>
                    </Pressable>

                    <SelectBottomSheet
                      onClose={() => setIsDiseaseSeverityDropdownOpen(false)}
                      onSelect={selectDiseaseSeverity}
                      options={['Легкая', 'Средняя', 'Тяжелая', 'Критическая']}
                      title="Выберите степень поражения"
                      visible={isDiseaseSeverityDropdownOpen}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Препарат / дозировка / способ</Text>
                    <TextInput onChangeText={(value) => onChangeField('productName', value)} placeholder="Препарат" placeholderTextColor="#7C8A80" style={styles.input} value={form.productName} />
                  </View>
                  <View style={styles.field}>
                    <TextInput onChangeText={(value) => onChangeField('dosage', value)} placeholder="Дозировка" placeholderTextColor="#7C8A80" style={styles.input} value={form.dosage} />
                  </View>
                  <View style={styles.field}>
                    <TextInput onChangeText={(value) => onChangeField('applicationMethod', value)} placeholder="Способ обработки" placeholderTextColor="#7C8A80" style={styles.input} value={form.applicationMethod} />
                  </View>
                  <View style={styles.field}>
                    <TextInput onChangeText={(value) => onChangeField('plantReaction', value)} placeholder="Реакция растений" placeholderTextColor="#7C8A80" style={styles.input} value={form.plantReaction} />
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
                </>
              )}

              {['death', 'discard', 'introLoss', 'quarantine', 'quarantineReleased'].includes(eventType) && (
                <View style={styles.field}>
                  <Text style={styles.label}>
                    {eventType === 'introLoss'
                      ? 'Причина потерь *'
                      : eventType === 'quarantine'
                      ? 'Причина карантина *'
                      : eventType === 'quarantineReleased'
                        ? 'Причина снятия карантина *'
                        : 'Причина *'}
                  </Text>
                  <TextInput
                    onChangeText={(value) => onChangeField('reason', value)}
                    placeholder={eventType === 'introLoss'
                      ? 'Укажите причину потерь'
                      : eventType === 'quarantine'
                      ? 'Укажите причину карантина'
                      : eventType === 'quarantineReleased'
                        ? 'Укажите основание для снятия карантина'
                        : 'Укажите причину'}
                    placeholderTextColor="#7C8A80"
                    style={styles.input}
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

              {!isMovementEvent && eventType !== 'problem' && (
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
});

