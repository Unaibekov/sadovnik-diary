import { StatusBar } from 'expo-status-bar';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from '../../styles';
import { formatDisplayDate } from '../domain/dates';
import { getCardDisplayName } from '../domain/batch';
import StageHeader from '../components/StageHeader';

const countFieldByType = {
  rooting: 'rootedCount',
  death: 'deathCount',
  discard: 'discardCount',
  sale: 'saleCount',
  propagation: 'propagationCount',
};

// Экран добавления и редактирования производственного события по выбранной дате.
export default function StatusChangeFormScreen({
  eventType,
  form,
  formError,
  formNotice,
  isEditing,
  onBack,
  onChangeField,
  onSave,
  onSelectEventType,
  selectedCard,
  selectedDate,
}) {
  const eventOptions = selectedCard.stage === 'Адаптация'
    ? [
      ['adaptationStress', 'Стресс'],
      ['adaptationEnvironment', 'Среда'],
      ['adaptationHumidityReduction', 'Снижение влажности'],
      ['adaptationCare', 'Уход'],
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <StageHeader
        onBack={onBack}
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
            </View>

            <View style={[styles.surfacePanel, styles.formPanel]}>
              {/* Выбор типа события определяет набор полей ниже. */}
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

              {![
                'adaptationStress',
                'adaptationEnvironment',
                'adaptationHumidityReduction',
                'adaptationCare',
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

              {/* Поля стресс-события на адаптации. */}
              {eventType === 'adaptationStress' && (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Уровень стресса *</Text>
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
                    <Text style={styles.label}>Описание состояния</Text>
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
                    <Text style={styles.label}>Причина</Text>
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
                  <View style={styles.actionGrid}>
                    {['Полив', 'Подкормка', 'Стимуляция', 'Профилактика', 'Лечение'].map((value) => (
                      <Pressable
                        accessibilityRole="button"
                        key={value}
                        onPress={() => onChangeField('careType', value)}
                        style={[
                          styles.actionChip,
                          form.careType === value && styles.actionChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.actionChipText,
                            form.careType === value && styles.actionChipTextActive,
                          ]}
                        >
                          {value}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
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
                  {isEditing ? 'Сохранить правку' : 'Сохранить и добавить ещё'}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={onBack}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressedButton,
                ]}
              >
                <Text style={styles.primaryButtonText}>Готово</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
