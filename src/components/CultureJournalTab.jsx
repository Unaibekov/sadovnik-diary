// Р’РєР»Р°РґРєР° Р¶СѓСЂРЅР°Р»Р° РєСѓР»СЊС‚СѓСЂС‹ СЃРѕ СЃРїРёСЃРєРѕРј РѕРїРµСЂР°С†РёР№.
import { Fragment, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import styles from '../../styles';
import { INTRO_STAGE, stages } from '../domain/constants';
import { formatDisplayLongDate, formatDisplayTime } from '../domain/dates';
import { getOperationSummaryItems } from '../domain/batch';
import { getOperationEffectiveStage } from '../domain/journal';
import { isRenderablePhotoUri } from '../domain/photoUri';
import PhotoViewerModal from './PhotoViewerModal';
import { EditIcon } from './icons';

export default function CultureJournalTab({
  canDeleteOperation,
  canEditOperation,
  card,
  operations,
  onDeleteOperation,
  onEditOperation,
}) {
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [viewerUris, setViewerUris] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  function openPhotoViewer(uris, index = 0) {
    setViewerUris(uris);
    setViewerIndex(index);
    setIsViewerVisible(true);
  }

  const stageOrder = [INTRO_STAGE, ...stages.filter((stage) => stage !== INTRO_STAGE)];
  const getStageRank = (stage) => {
    const index = stageOrder.indexOf(stage);
    return index === -1 ? stageOrder.length : index;
  };

  const getOperationTimestamp = (operation) => {
    const timestamp = new Date(operation.createdAt || operation.date || 0).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  };

  const groupedOperations = useMemo(
    () =>
      operations
        .reduce((groups, operation) => {
          const stageKey = getOperationEffectiveStage(operation, card) || INTRO_STAGE;
          const existingGroup = groups.find((group) => group.stage === stageKey);

          if (existingGroup) {
            existingGroup.operations.push(operation);
            return groups;
          }

          return [
            ...groups,
            {
              stage: stageKey,
              operations: [operation],
            },
          ];
        }, [])
        .map((group) => ({
          ...group,
          operations: [...group.operations].sort((first, second) => (
            getOperationTimestamp(second) - getOperationTimestamp(first)
          )),
        }))
        .sort((first, second) => {
          const timeDiff = getOperationTimestamp(second.operations[0]) - getOperationTimestamp(first.operations[0]);
          if (timeDiff !== 0) {
            return timeDiff;
          }

          return getStageRank(first.stage) - getStageRank(second.stage);
        }),
    [card, operations],
  );

  return (
    <>
      <PhotoViewerModal
        initialIndex={viewerIndex}
        onClose={() => setIsViewerVisible(false)}
        uris={viewerUris}
        visible={isViewerVisible}
      />

      <View style={[styles.surfacePanel, styles.calendarRecordsPanel]}>
        <ScrollView
          bounces={false}
          contentContainerStyle={localStyles.journalScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={localStyles.journalScroll}
        >
          {operations.length === 0 && <Text style={styles.journalEmpty}>РЎРѕР±С‹С‚РёР№ РїРѕРєР° РЅРµС‚</Text>}

          {groupedOperations.map((group) => {
            const groupDate = group.operations[0]?.date || group.operations[0]?.createdAt || '';
            const showGroupTitle = true;

            return (
              <View key={group.stage} style={localStyles.stageGroupCard}>
                {showGroupTitle && (
                  <Text style={localStyles.stageGroupTitle}>{group.stage}</Text>
                )}
                {groupDate ? (
                  <Text style={localStyles.groupDate}>{formatDisplayLongDate(groupDate)}</Text>
                ) : null}

                <View style={localStyles.stageGroupBody}>
                  {group.operations.map((operation, index) => {
                    const summaryItems = getOperationSummaryItems(operation, card);
                    const photoUris = (
                      Array.isArray(operation.photoUris) && operation.photoUris.length > 0
                        ? operation.photoUris
                        : isRenderablePhotoUri(operation.photoUri)
                          ? [operation.photoUri]
                          : []
                    ).filter((uri) => isRenderablePhotoUri(uri));
                    const isTextOnlyOperation = ['comment', 'contamination', 'quarantine'].includes(operation.type);
                    const actionTitle = operation.title || (operation.type === 'comment' ? 'Комментарий' : 'Событие');

                    return (
                      <Fragment key={operation.id}>
                        <View
                          style={[
                            styles.journalItem,
                            ['contamination', 'quarantine', 'problem'].includes(operation.type) && styles.journalItemWarning,
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
                                <Text style={localStyles.titleText}>{actionTitle}</Text>
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
                        {index < group.operations.length - 1 && (
                          <View style={styles.calendarRecordsDivider} />
                        )}
                      </Fragment>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </>
  );
}

const localStyles = StyleSheet.create({
  journalScroll: {
    flex: 1,
    minHeight: 0,
  },
  journalScrollContent: {
    gap: 12,
    paddingBottom: 2,
  },
  stageGroupCard: {
    gap: 10,
    marginBottom: 2,
  },
  stageGroupTitle: {
    color: '#15863F',
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  groupDate: {
    color: '#17251C',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    marginBottom: 2,
    marginTop: 8,
    textAlign: 'left',
  },
  stageGroupBody: {
    gap: 12,
  },
  itemRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
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
});

