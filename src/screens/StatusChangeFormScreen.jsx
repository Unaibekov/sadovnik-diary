import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from '../../styles';
import { formatDisplayDate } from '../domain/dates';
import { getCardCurrentQuantity, getCardDisplayName } from '../domain/batch';
import StageHeader from '../components/StageHeader';
import { ChevronDownIcon } from '../components/icons';

const countFieldByType = {
  rooting: 'rootedCount',
  death: 'deathCount',
  discard: 'discardCount',
  sale: 'saleCount',
  propagation: 'propagationCount',
  transplant: 'transplantCount',
};

const adaptationCareOptions = ['Полив', 'Подкормка', 'Стимуляция', 'Профилактика', 'Лечение'];
const greenhouseCareOptions = ['Полив', 'Подкормка', 'Профилактика', 'Лечение'];

// Экран добавления и редактирования производственного события по выбранной дате.
export default function StatusChangeFormScreen({
  eventType,
  form,
  formError,
  formNotice,
  isEditing,
  onBack,
  onChangeField,
  onOpenRecommendations,
  onSave,
  onSelectEventType,
  selectedCard,
  selectedDate,
}) {
  const [isCareDropdownOpen, setIsCareDropdownOpen] = useState(false);
  const eventOptions = selectedCard.stage === 'Адаптация'
    ? [
      ['adaptationStress', 'Наблюдение'],
      ['adaptationEnvironment', 'Среда'],
      ['adaptationCare', 'Уход'],
      ['quarantine', 'Карантин'],
      ...((selectedCard.batchStatus || 'active') === 'quarantine'
        ? [['quarantineReleased', 'Снять карантин']]
        : []),
      ['death', 'Гибель'],
      ['discard', 'Выбраковка'],
      ['sale', 'Продажа'],
    ]
    : selectedCard.stage === 'Теплица'
      ? [
        ['greenhouseObservation', 'Наблюдение'],
        ['greenhouseCare', 'Уход'],
        ['greenhouseEnvironment', 'Среда'],
        ['greenhouseDisease', 'Болезни/вредители'],
        ['transplant', 'Пересадка'],
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
    ];
  const countField = countFieldByType[eventType || 'rooting'];
  const selectedEventLabel = eventOptions.find(([value]) => value === eventType)?.[1] ||
    {
      adaptationHumidityReduction: 'Снижение влажности',
    }[eventType] ||
    'Событие';
  const careOptions = eventType === 'greenhouseCare'
    ? greenhouseCareOptions
    : adaptationCareOptions;

  useEffect(() => {
    setIsCareDropdownOpen(false);
  }, [eventType]);

  function selectCareType(value) {
    onChangeField('careType', value);
    setIsCareDropdownOpen(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <StageHeader
        onBack={onBack}
        onOpenRecommendations={onOpenRecommendations}
        title={isEditing ? 'Редактировать событие' : 'Добавить событие'}
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
            {/* Контекст события: к какой карточке и дате относится форма. */}
            <View style={styles.cardsHeader}>
              <Text style={styles.eventFormCardTitle}>
                {getCardDisplayName(selectedCard)}
              </Text>
              <Text style={styles.cardsSubtitle}>
                {formatDisplayDate(selectedDate)}
              </Text>
              <Text style={styles.cardsSubtitle}>
                Текущее количество: {getCardCurrentQuantity(selectedCard)} шт.
              </Text>
            </View>

            <View style={[styles.surfacePanel, styles.formPanel]}>
              {/* Выбор типа события определяет набор полей ниже. */}
              {isEditing ? (
                <Text style={styles.editActionTitle}>{selectedEventLabel}</Text>
              ) : (
                <View style={styles.actionGrid}>
                  {eventOptions.map(([value, label]) => (
                    <Pressable
                      accessibilityRole="button"
                      key={value}
                      onPress={() => onSelectEventType(value)}
                      style={[
                        styles.actionChip,
                        eventType === value && styles.actionChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.actionChipText,
                          eventType === value && styles.actionChipTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
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
                'quarantine',
                'quarantineReleased',
              ].includes(eventType) && (
                <View style={styles.field}>
                  <Text style={styles.label}>Количество, шт. *</Text>
                  <TextInput
                    inputMode="numeric"
                    keyboardType="numeric"
                    onChangeText={(value) => onChangeField(countField, value)}
                    placeholder="0"
                    placeholderTextColor="#7C8A80"
                    style={styles.input}
                    value={form[countField]}
                  />
                </View>
              )}

              {/* Наблюдение на адаптации: реакция растения, стресс и стабильность. */}
              {eventType === 'adaptationStress' && (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Уровень стресса</Text>
                    <View style={styles.toggleRow}>
                      {['Низкий', 'Средний', 'Высокий', 'Критический'].map((value) => (
                        <Pressable
                          accessibilityRole="button"
                          key={value}
                          onPress={() => onChangeField('stressLevel', value)}
                          style={[
                            styles.toggleButton,
                            form.stressLevel === value && styles.toggleButtonActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.toggleButtonText,
                              form.stressLevel === value && styles.toggleButtonTextActive,
                            ]}
                          >
                            {value}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Описание состояния *</Text>
                    <TextInput
                      multiline
                      onChangeText={(value) => onChangeField('conditionDescription', value)}
                      placeholder="Тургор, увядание, остановка развития"
                      placeholderTextColor="#7C8A80"
                      style={[styles.input, styles.multilineInput]}
                      value={form.conditionDescription}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Возможная причина</Text>
                    <TextInput
                      onChangeText={(value) => onChangeField('reason', value)}
                      placeholder="Причина, если известна"
                      placeholderTextColor="#7C8A80"
                      style={styles.input}
                      value={form.reason}
                    />
                  </View>
                </>
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

              {['adaptationStress', 'adaptationEnvironment', 'adaptationHumidityReduction'].includes(eventType) && (
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
                  <Text style={styles.label}>Тип ухода *</Text>
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

                  {isCareDropdownOpen && (
                    <View style={styles.dropdownList}>
                      {careOptions.map((value) => (
                        <Pressable
                          accessibilityRole="button"
                          key={value}
                          onPress={() => selectCareType(value)}
                          style={({ pressed }) => [
                            styles.dropdownItem,
                            pressed && styles.linkButtonPressed,
                          ]}
                        >
                          <Text style={styles.dropdownItemText}>{value}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
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
                  <Text style={styles.label}>Уровень риска</Text>
                  <View style={styles.toggleRow}>
                    {['Низкий', 'Средний', 'Высокий', 'Критический'].map((value) => (
                      <Pressable
                        accessibilityRole="button"
                        key={value}
                        onPress={() => onChangeField('riskLevel', value)}
                        style={[
                          styles.toggleButton,
                          form.riskLevel === value && styles.toggleButtonActive,
                        ]}
                      >
                        <Text style={[
                          styles.toggleButtonText,
                          form.riskLevel === value && styles.toggleButtonTextActive,
                        ]}>
                          {value}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {eventType === 'greenhouseObservation' && (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Уровень стресса</Text>
                    <View style={styles.toggleRow}>
                      {['Низкий', 'Средний', 'Высокий', 'Критический'].map((value) => (
                        <Pressable
                          accessibilityRole="button"
                          key={value}
                          onPress={() => onChangeField('stressLevel', value)}
                          style={[
                            styles.toggleButton,
                            form.stressLevel === value && styles.toggleButtonActive,
                          ]}
                        >
                          <Text style={[
                            styles.toggleButtonText,
                            form.stressLevel === value && styles.toggleButtonTextActive,
                          ]}>
                            {value}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Стабильность</Text>
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
                          <Text style={[
                            styles.toggleButtonText,
                            form.stability === value && styles.toggleButtonTextActive,
                          ]}>
                            {value}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </>
              )}

              {eventType === 'greenhouseCare' && (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Тип ухода *</Text>
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

                    {isCareDropdownOpen && (
                      <View style={styles.dropdownList}>
                        {careOptions.map((value) => (
                          <Pressable
                            accessibilityRole="button"
                            key={value}
                            onPress={() => selectCareType(value)}
                            style={({ pressed }) => [
                              styles.dropdownItem,
                              pressed && styles.linkButtonPressed,
                            ]}
                          >
                            <Text style={styles.dropdownItemText}>{value}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
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
                    <Text style={styles.label}>Степень поражения</Text>
                    <View style={styles.toggleRow}>
                      {['Легкая', 'Средняя', 'Тяжелая', 'Критическая'].map((value) => (
                        <Pressable
                          accessibilityRole="button"
                          key={value}
                          onPress={() => onChangeField('diseaseSeverity', value)}
                          style={[
                            styles.toggleButton,
                            form.diseaseSeverity === value && styles.toggleButtonActive,
                          ]}
                        >
                          <Text style={[
                            styles.toggleButtonText,
                            form.diseaseSeverity === value && styles.toggleButtonTextActive,
                          ]}>
                            {value}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
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

              {['death', 'discard', 'quarantine', 'quarantineReleased'].includes(eventType) && (
                <View style={styles.field}>
                  <Text style={styles.label}>
                    {eventType === 'quarantine'
                      ? 'Причина карантина *'
                      : eventType === 'quarantineReleased'
                        ? 'Причина снятия карантина *'
                        : 'Причина *'}
                  </Text>
                  <TextInput
                    onChangeText={(value) => onChangeField('reason', value)}
                    placeholder={eventType === 'quarantine'
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

              <View style={styles.field}>
                <Text style={styles.label}>Фото</Text>
                <TextInput
                  onChangeText={(value) => onChangeField('photoNote', value)}
                  placeholder="Описание фото или ссылка"
                  placeholderTextColor="#7C8A80"
                  style={styles.input}
                  value={form.photoNote}
                />
              </View>

              {!!formError && <Text style={styles.errorText}>{formError}</Text>}
              {!!formNotice && <Text style={styles.noticeText}>{formNotice}</Text>}

              {!isEditing && (
                <Pressable
                  accessibilityRole="button"
                  onPress={onSave}
                  style={({ pressed }) => [
                    styles.secondaryOutlineButton,
                    styles.transparentOutlineButton,
                    pressed && styles.linkButtonPressed,
                  ]}
                >
                  <Text style={styles.secondaryOutlineButtonText}>
                    Сохранить и добавить ещё
                  </Text>
                </Pressable>
              )}

            </View>

            <View style={styles.cultureFormFooter}>
              <Pressable
                accessibilityRole="button"
                onPress={isEditing ? onSave : onBack}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressedButton,
                ]}
              >
                <Text style={styles.primaryButtonText}>{isEditing ? 'Сохранить правку' : 'Готово'}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
