import { Pressable, ScrollView, Text, View } from 'react-native';
import styles from '../../styles';
import { formatDisplayDate, formatDisplayTime } from '../domain/dates';
import { getOperationSummaryItems } from '../domain/batch';
import StageCalendar from './StageCalendar';
import { EditIcon, TrashIcon } from './icons';

const operationsWithSelfDescribingTitle = new Set([
  'comment',
  'photo',
  'contamination',
  'quarantine',
]);

export default function CultureCalendarTab({
  calendarDays,
  calendarMonth,
  canDeleteOperation,
  canEditOperation,
  card,
  onChangeMonth,
  onDeleteOperation,
  onEditOperation,
  onSelectDate,
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

          {selectedDateOperations.length === 0 && (
            <Text style={styles.journalEmpty}>Записей за эту дату нет</Text>
          )}

          {selectedDateOperations.map((operation) => {
            const summaryItems = getOperationSummaryItems(operation, card);
            const showSummaryLabels = !operationsWithSelfDescribingTitle.has(operation.type);

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
                    {showSummaryLabels ? `${label}: ${value}` : value}
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
