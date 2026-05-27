import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import styles from '../../styles';
import { INTRO_STAGE } from '../domain/constants';
import { formatDisplayDate, formatDisplayTime } from '../domain/dates';
import { getOperationSummaryItems } from '../domain/batch';
import StageCalendar from './StageCalendar';
import { ChevronDownIcon, EditIcon, TrashIcon } from './icons';

const introActionCommands = [
  ['comment', 'Комментарий'],
  ['photo', 'Фото'],
  ['contamination', 'Контаминация'],
  ['quarantine', 'Карантин'],
];

export default function CultureCalendarTab({
  calendarDays,
  calendarMonth,
  canDeleteOperation,
  canEditOperation,
  card,
  hasRecommendations,
  introActionForm,
  introActionType,
  isDateEntryExpanded,
  isRecommendationsExpanded,
  onCancelIntroAction,
  onChangeIntroActionForm,
  onChangeMonth,
  onDeleteOperation,
  onEditOperation,
  onSaveIntroAction,
  onSelectDate,
  onSelectIntroActionType,
  onToggleRecommendations,
  operationDates,
  selectedDate,
  selectedDateOperations,
  stageActionError,
  stageMoveBlockedMessage,
  stageMoveTarget,
}) {
  return (
    <>
      {!!stageMoveTarget && !!stageMoveBlockedMessage && (
        <View style={styles.blockedNotice}>
          <View style={styles.blockedNoticeIcon}>
            <Text style={styles.blockedNoticeIconText}>!</Text>
          </View>
          <Text style={styles.blockedNoticeText}>{stageMoveBlockedMessage}</Text>
        </View>
      )}

      {hasRecommendations && (
        <View style={[styles.surfacePanel, styles.recommendationsPanel]}>
          <Pressable
            accessibilityRole="button"
            onPress={onToggleRecommendations}
            style={({ pressed }) => [
              styles.recommendationsHeader,
              pressed && styles.linkButtonPressed,
            ]}
          >
            <Text style={styles.recommendationsTitle}>Рекомендации</Text>
            <View style={[
              styles.recommendationsArrow,
              isRecommendationsExpanded && styles.recommendationsArrowExpanded,
            ]}>
              <ChevronDownIcon color="#15863F" size={20} />
            </View>
          </Pressable>

          {isRecommendationsExpanded && (
            <View style={styles.recommendationsBody}>
              {!!card.temperatureRequirement && (
                <View style={[styles.passportRow, styles.passportRowFirst]}>
                  <Text style={styles.passportLabel}>Температура</Text>
                  <Text style={styles.passportValue}>{card.temperatureRequirement}</Text>
                </View>
              )}
              {!!card.lightRequirement && (
                <View style={[
                  styles.passportRow,
                  !card.temperatureRequirement && styles.passportRowFirst,
                ]}>
                  <Text style={styles.passportLabel}>Освещенность</Text>
                  <Text style={styles.passportValue}>{card.lightRequirement}</Text>
                </View>
              )}
              {!!card.humidityRequirement && (
                <View style={[
                  styles.passportRow,
                  !card.temperatureRequirement &&
                    !card.lightRequirement &&
                    styles.passportRowFirst,
                ]}>
                  <Text style={styles.passportLabel}>Влажность</Text>
                  <Text style={styles.passportValue}>{card.humidityRequirement}</Text>
                </View>
              )}
              {(card.preventionItems || []).map((item, index) => (
                <View
                  key={`${item.name}-${index}`}
                  style={[
                    styles.passportRow,
                    !card.temperatureRequirement &&
                      !card.lightRequirement &&
                      !card.humidityRequirement &&
                      index === 0 &&
                      styles.passportRowFirst,
                  ]}
                >
                  <Text style={styles.passportLabel}>
                    {card.stage === 'Клонирование' ? 'Препарат' : 'Профилактика'}
                  </Text>
                  <Text style={styles.passportValue}>
                    {[item.name, item.applicationRate, item.frequency].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <View style={[styles.surfacePanel, styles.calendarRecordsPanel]}>
        <StageCalendar
          days={calendarDays.filter(Boolean)}
          embedded
          month={calendarMonth}
          operationDates={operationDates}
          selectedDate={selectedDate}
          onChangeMonth={onChangeMonth}
          onSelectDate={onSelectDate}
        />

        <View style={styles.calendarRecordsDivider} />

        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          style={styles.dateRecordsScroll}
          contentContainerStyle={styles.dateRecordsContent}
        >
          <View style={styles.dateActionHeader}>
            <Text style={styles.dateActionTitle}>{formatDisplayDate(selectedDate)}</Text>
          </View>

          {isDateEntryExpanded && (
            <>
              {card.stage === INTRO_STAGE && (
                <View style={styles.actionGrid}>
                  {introActionCommands.map(([value, label]) => (
                    <Pressable
                      accessibilityRole="button"
                      key={value}
                      onPress={() => onSelectIntroActionType(value)}
                      style={[
                        styles.actionChip,
                        introActionType === value && styles.actionChipActive,
                      ]}
                    >
                      <Text style={[
                        styles.actionChipText,
                        introActionType === value && styles.actionChipTextActive,
                      ]}>
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {card.stage === INTRO_STAGE && !!introActionType && introActionType !== 'death' && (
                <View style={styles.inlineForm}>
                  {introActionType === 'comment' && (
                    <TextInput
                      multiline
                      onChangeText={(value) => onChangeIntroActionForm('comment', value)}
                      placeholder="Комментарий"
                      placeholderTextColor="#7C8A80"
                      style={[styles.input, styles.multilineInput]}
                      value={introActionForm.comment}
                    />
                  )}
                  {introActionType === 'photo' && (
                    <TextInput
                      multiline
                      onChangeText={(value) => onChangeIntroActionForm('photoNote', value)}
                      placeholder="Описание фото или ссылка"
                      placeholderTextColor="#7C8A80"
                      style={[styles.input, styles.multilineInput]}
                      value={introActionForm.photoNote}
                    />
                  )}
                  {introActionType === 'contamination' && (
                    <TextInput
                      multiline
                      onChangeText={(value) => onChangeIntroActionForm('contaminationNote', value)}
                      placeholder="Описание контаминации"
                      placeholderTextColor="#7C8A80"
                      style={[styles.input, styles.multilineInput]}
                      value={introActionForm.contaminationNote}
                    />
                  )}
                  {introActionType === 'quarantine' && (
                    <TextInput
                      multiline
                      onChangeText={(value) => onChangeIntroActionForm('quarantineReason', value)}
                      placeholder="Причина карантина"
                      placeholderTextColor="#7C8A80"
                      style={[styles.input, styles.multilineInput]}
                      value={introActionForm.quarantineReason}
                    />
                  )}
                  <View style={styles.inlineActions}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={onSaveIntroAction}
                      style={({ pressed }) => [
                        styles.inlineActionButton,
                        pressed && styles.linkButtonPressed,
                      ]}
                    >
                      <Text style={styles.inlineActionButtonText}>Сохранить</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={onCancelIntroAction}
                      style={({ pressed }) => [
                        styles.inlineDangerButton,
                        pressed && styles.linkButtonPressed,
                      ]}
                    >
                      <Text style={styles.inlineDangerButtonText}>Отменить</Text>
                    </Pressable>
                  </View>
                </View>
              )}
              <View style={styles.dateActionDivider} />
            </>
          )}

          {selectedDateOperations.length === 0 && (
            <Text style={styles.journalEmpty}>Записей за эту дату нет</Text>
          )}

          {selectedDateOperations.map((operation) => {
            const summaryItems = getOperationSummaryItems(operation, card);

            return (
              <View key={operation.id} style={styles.statusSummary}>
                <View style={styles.operationHeaderRow}>
                  <Text style={styles.statusSummaryTitle}>
                    {operation.title || 'Событие'}
                    {operation.createdAt ? ` • ${formatDisplayTime(operation.createdAt)}` : ''}
                  </Text>
                  <View style={styles.operationActions}>
                    {canEditOperation(operation) && (
                      <Pressable
                        accessibilityLabel="Редактировать запись"
                        accessibilityRole="button"
                        onPress={() => onEditOperation(operation)}
                        style={({ pressed }) => [
                          styles.operationActionButton,
                          pressed && styles.linkButtonPressed,
                        ]}
                      >
                        <EditIcon size={20} />
                      </Pressable>
                    )}
                    {canDeleteOperation(operation) && (
                      <Pressable
                        accessibilityLabel="Удалить запись"
                        accessibilityRole="button"
                        onPress={() => onDeleteOperation(operation.id)}
                        style={({ pressed }) => [
                          styles.operationActionButton,
                          pressed && styles.linkButtonPressed,
                        ]}
                      >
                        <TrashIcon size={20} />
                      </Pressable>
                    )}
                  </View>
                </View>
                {summaryItems.map(([label, value]) => (
                  <Text key={label} style={styles.statusSummaryText}>
                    {label}: {value}
                  </Text>
                ))}
              </View>
            );
          })}
        </ScrollView>
      </View>

      {!!stageActionError && (
        <View style={styles.stageActionErrorNotice}>
          <View style={styles.blockedNoticeIcon}>
            <Text style={styles.blockedNoticeIconText}>!</Text>
          </View>
          <Text style={styles.blockedNoticeText}>{stageActionError}</Text>
        </View>
      )}
    </>
  );
}
