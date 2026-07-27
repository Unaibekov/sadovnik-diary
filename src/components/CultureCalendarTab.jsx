// Вкладка календаря для конкретной культуры.
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import styles from '../../styles';
import { formatDisplayLongDate, formatDisplayTime } from '../domain/dates';
import { getCardActiveProblemQuantity, getOperationSummaryItems } from '../domain/batch';
import { isRenderablePhotoUri } from '../domain/photoUri';
import StageCalendar from './StageCalendar';
import PhotoViewerModal from './PhotoViewerModal';
import { EditIcon, InfoIcon } from './icons';

function hasIsolationForProblem(card, problemOperation) {
  return (card?.operations || []).some((operation) => (
    operation.type === 'problemIsolation' &&
    (
      !operation.sourceProblemEventId ||
      operation.sourceProblemEventId === problemOperation.id
    )
  ));
}

function getCalendarOperationTitle(operation, card) {
  if (operation.type === 'problemIsolation') {
    return 'Изоляция проблемы';
  }

  if (
    operation.type === 'problem' &&
    getCardActiveProblemQuantity(card) <= 0 &&
    hasIsolationForProblem(card, operation)
  ) {
    return 'Проблема изолирована';
  }

  return operation.title || 'Событие';
}

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
  stageMoveHint,
  stageMoveTarget,
}) {
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [viewerUris, setViewerUris] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  function openPhotoViewer(uris, index = 0) {
    setViewerUris(uris);
    setViewerIndex(index);
    setIsViewerVisible(true);
  }

  function getOperationKey(operation, index) {
    return operation.id || `${operation.type || 'operation'}-${operation.createdAt || operation.date || 'unknown'}-${index}`;
  }

  return (
    <View style={localStyles.container}>
      <PhotoViewerModal
        initialIndex={viewerIndex}
        onClose={() => setIsViewerVisible(false)}
        uris={viewerUris}
        visible={isViewerVisible}
      />

      {!!stageMoveTarget && !!stageMoveBlockedMessage && (
        <View style={localStyles.moveHintNotice}>
          <InfoIcon color="#6B7280" size={18} />
          <Text style={localStyles.moveHintText}>{stageMoveBlockedMessage}</Text>
        </View>
      )}

      {!!stageMoveTarget && !!stageMoveHint && (
        <View style={localStyles.moveHintNotice}>
          <InfoIcon color="#6B7280" size={18} />
          <Text style={localStyles.moveHintText}>{stageMoveHint}</Text>
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

        <View style={styles.dateActionHeader}>
          <Text style={styles.dateActionTitle}>{formatDisplayLongDate(selectedDate)}</Text>
        </View>

        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          style={localStyles.dateRecordsScroll}
          contentContainerStyle={styles.dateRecordsContent}
        >
          {selectedDateOperations.length === 0 && (
            <Text style={styles.journalEmpty}>Записей за эту дату нет</Text>
          )}

          {selectedDateOperations.map((operation, index) => {
            const summaryItems = getOperationSummaryItems(operation, card);
            const photoUris = (
              Array.isArray(operation.photoUris) && operation.photoUris.length > 0
                ? operation.photoUris
                : isRenderablePhotoUri(operation.photoUri)
                  ? [operation.photoUri]
                  : []
            ).filter((uri) => isRenderablePhotoUri(uri));
            const isTextOnlyOperation = ['comment', 'contamination', 'quarantine'].includes(operation.type);
            const title = getCalendarOperationTitle(operation, card);

            return (
              <View
                key={getOperationKey(operation, index)}
                style={[
                  styles.statusSummary,
                  index === 0 && styles.statusSummaryFirst,
                ]}
              >
                <View style={localStyles.itemRow}>
                  <View style={localStyles.timeBadge}>
                    <Text style={localStyles.timeText}>
                      {operation.createdAt ? formatDisplayTime(operation.createdAt) : ''}
                    </Text>
                  </View>

                  <View style={localStyles.contentColumn}>
                    <View style={localStyles.contentHeaderRow}>
                      <Text style={localStyles.titleText}>{title}</Text>
                      <View style={localStyles.operationActions}>
                        {canEditOperation(operation) && !['contamination', 'quarantine'].includes(operation.type) && (
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
                      </View>
                    </View>

                    {isTextOnlyOperation ? (
                      <Text style={localStyles.commentText}>{summaryItems[0]?.[1] || ''}</Text>
                    ) : (
                      summaryItems.map(([label, value]) => (
                        <View key={label} style={localStyles.fieldBlock}>
                          <Text style={localStyles.fieldLabel}>{label}:</Text>
                          <Text style={localStyles.fieldValue}>{value}</Text>
                        </View>
                      ))
                    )}

                    {photoUris.length > 0 ? (
                      <ScrollView
                        horizontal
                        keyboardShouldPersistTaps="handled"
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={localStyles.photoThumbStrip}
                      >
                        {photoUris.map((uri, index) => (
                          <Pressable
                            accessibilityLabel={`Открыть фото ${index + 1}`}
                            accessibilityRole="button"
                            key={`${uri}-${index}`}
                            onPress={() => openPhotoViewer(photoUris, index)}
                            style={({ pressed }) => [
                              localStyles.photoThumb,
                              pressed && styles.linkButtonPressed,
                            ]}
                          >
                            <Image source={{ uri }} style={localStyles.photoThumbImage} />
                          </Pressable>
                        ))}
                      </ScrollView>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {!!stageActionError && (
        <View style={localStyles.moveHintNotice}>
          <InfoIcon color="#6B7280" size={18} />
          <Text style={localStyles.moveHintText}>{stageActionError}</Text>
        </View>
      )}
    </View>
  );
}

const localStyles = {
  container: {
    flex: 1,
    minHeight: 0,
  },
  dateRecordsScroll: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#FFFFFF',
  },
  itemRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  moveHintNotice: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  moveHintText: {
    color: '#6B7280',
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  timeBadge: {
    alignItems: 'center',
    backgroundColor: '#E8F5EC',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 28,
    minWidth: 60,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  timeText: {
    color: '#15863F',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
    textAlign: 'center',
  },
  moveBlockedText: {
    color: '#B42318',
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  contentColumn: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  contentHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-start',
    position: 'relative',
  },
  operationActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  titleText: {
    color: '#1B3023',
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
    minWidth: 0,
  },
  commentText: {
    color: '#5F7065',
    fontSize: 14,
    lineHeight: 19,
    textAlign: 'left',
  },
  fieldBlock: {
    gap: 2,
  },
  fieldLabel: {
    color: '#7B857E',
    fontSize: 14,
    lineHeight: 19,
  },
  fieldValue: {
    color: '#1B3023',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
  },
  photoThumb: {
    backgroundColor: '#EEF2F0',
    borderColor: '#DCE7DE',
    borderRadius: 14,
    borderWidth: 1,
    height: 96,
    overflow: 'hidden',
    width: 96,
  },
  photoThumbImage: {
    height: '100%',
    width: '100%',
  },
  photoThumbStrip: {
    gap: 8,
    marginTop: 8,
  },
};
