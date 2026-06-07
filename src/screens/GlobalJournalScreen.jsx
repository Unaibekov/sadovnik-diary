// Экран общего журнала растений.
import { StatusBar } from 'expo-status-bar';
import { Fragment, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from '../../styles';
import BottomTabBar from '../components/BottomTabBar';
import PhotoGallery from '../components/PhotoGallery';
import SelectBottomSheet from '../components/SelectBottomSheet';
import { CalendarIcon, FilterIcon, LeaveIcon, TimeIcon } from '../components/icons';
import { INTRO_STAGE, stages } from '../domain/constants';
import {
  getCardCurrentQuantity,
  getCardDisplayName,
  getDaysInCurrentStage,
  getOperationSummaryItems,
} from '../domain/batch';
import { formatDisplayDate, formatDisplayTime } from '../domain/dates';
import { getJournalSubFilters } from '../domain/journal';

const journalMainFilters = [
  'all',
  'important',
  INTRO_STAGE,
  stages[1],
  stages[2],
  stages[3],
  stages[4],
  stages[5],
];

function formatDaysInStage(days) {
  const value = Math.max(Number(days) || 0, 1);
  const lastDigit = value % 10;
  const lastTwoDigits = value % 100;

  const suffix = lastTwoDigits >= 11 && lastTwoDigits <= 14
    ? 'дней в стадии'
    : lastDigit === 1
      ? 'день в стадии'
      : lastDigit >= 2 && lastDigit <= 4
        ? 'дня в стадии'
        : 'дней в стадии';

  return `${value} ${suffix}`;
}

export default function GlobalJournalScreen({
  bottomInset = 0,
  expandedCardIds = [],
  getJournalFilterLabel,
  getResolvedBatchStatus,
  groupedCards = [],
  journalFilter,
  journalSubFilter,
  onChangeJournalFilter,
  onChangeJournalSubFilter,
  onHomePress,
  onJournalPress,
  onMenuPress,
  onOpenCard,
  onScanPress,
  onTasksPress,
  onToggleCard,
  taskCount = 0,
}) {
  const [isFilterSheetVisible, setIsFilterSheetVisible] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.fixedCardsScreen}>
        <View style={localStyles.headerShell}>
          <View style={localStyles.journalHeaderRow}>
            <Text style={localStyles.journalHeaderTitle}>Журнал</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsFilterSheetVisible(true)}
              style={({ pressed }) => [
                localStyles.filterPill,
                pressed && styles.linkButtonPressed,
              ]}
            >
              <FilterIcon size={18} />
              <Text numberOfLines={1} style={localStyles.filterPillText}>
                {getJournalFilterLabel(journalFilter)}
              </Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.fixedCardsScrollContent,
            styles.fixedCardsScrollContentWithActions,
          ]}
        >
          <View style={styles.journalPanel}>
            <Text style={styles.journalTitle}>
              {journalFilter === 'all'
                ? 'Все события'
                : journalFilter === 'important'
                  ? 'Важные события'
                  : getJournalFilterLabel(journalFilter)}
            </Text>

            <ScrollView
              contentContainerStyle={styles.globalJournalFilterRow}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.globalJournalFilterScroll}
            >
              {getJournalSubFilters(journalFilter).map((filter) => {
                const selected = filter === journalSubFilter;

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={filter}
                    onPress={() => onChangeJournalSubFilter(filter)}
                    style={({ pressed }) => [
                      styles.filterButton,
                      selected && styles.filterButtonActive,
                      pressed && styles.linkButtonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterButtonText,
                        selected && styles.filterButtonTextActive,
                      ]}
                    >
                      {getJournalFilterLabel(filter)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {groupedCards.length === 0 && (
              <Text style={styles.journalEmpty}>Событий пока нет</Text>
            )}

            {groupedCards.map(({ card, events }) => {
              const isExpanded = expandedCardIds.includes(card.id);
              const resolvedStatus = getResolvedBatchStatus(card);
              const cardDaysInStage = getDaysInCurrentStage(card);
              const cardMeta = [
                {
                  key: 'date',
                  icon: <CalendarIcon color="#15863F" size={16} />,
                  value: formatDisplayDate(card.stageChangedAt || card.createdAt) || '-',
                },
                {
                  key: 'quantity',
                  icon: <LeaveIcon color="#15863F" size={16} />,
                  value: `${getCardCurrentQuantity(card)} шт.`,
                },
                {
                  key: 'days',
                  icon: <TimeIcon color="#15863F" size={16} />,
                  value: formatDaysInStage(cardDaysInStage),
                },
              ];

              return (
                <View
                  key={card.id}
                  onResponderRelease={() => onToggleCard(card.id)}
                  onStartShouldSetResponder={() => true}
                  style={[
                    styles.globalJournalCard,
                    (card.sterilityStatus === 'contaminated' || resolvedStatus === 'quarantine') &&
                      styles.globalJournalCardWarning,
                  ]}
                >
                  <View style={styles.globalJournalCardHeader}>
                    <View style={styles.globalJournalCardTitleBlock}>
                      <Text style={styles.journalItemTitle} numberOfLines={2}>
                        {getCardDisplayName(card)}
                      </Text>
                      <Text style={styles.journalItemDate} numberOfLines={1}>
                        {card.stage || INTRO_STAGE}
                      </Text>
                    </View>
                    <View style={styles.globalJournalCardHeaderSide}>
                      <Text style={styles.globalJournalBadge}>{events.length}</Text>
                    </View>
                  </View>

                  <View style={localStyles.cardMetaRow}>
                    {cardMeta.map((item) => (
                      <View key={item.key} style={localStyles.cardMetaItem}>
                        {item.icon}
                        <Text style={localStyles.cardMetaText}>{item.value}</Text>
                      </View>
                    ))}
                  </View>

                  {isExpanded && (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        onPress={(event) => {
                          event?.stopPropagation?.();
                          onOpenCard(card);
                        }}
                        style={({ pressed }) => [
                          styles.globalJournalOpenCardButton,
                          pressed && styles.linkButtonPressed,
                        ]}
                      >
                        <Text style={styles.globalJournalOpenCardButtonText}>
                          Открыть карточку
                        </Text>
                      </Pressable>

                      <View style={styles.globalJournalEventList}>
                        {events.map((event, index) => {
                          const summaryItems = getOperationSummaryItems(event);
                        const photoUris = (
                          Array.isArray(event.photoUris) && event.photoUris.length > 0
                            ? event.photoUris
                            : event.photoUri
                              ? [event.photoUri]
                              : []
                        ).filter(Boolean);
                        const isTextOnlyOperation = ['comment', 'contamination', 'quarantine'].includes(event.type);
                        const actionTitle = event.title || (event.type === 'comment' ? 'Комментарий' : 'Событие');

                        return (
                          <Fragment key={`${event.cardId}-${event.id}`}>
                            <View
                              style={[
                                styles.journalItem,
                                (['contamination', 'quarantine'].includes(event.type) ||
                                  event.stressLevel === 'Критический') && styles.journalItemWarning,
                              ]}
                            >
                              <View style={localStyles.eventRow}>
                                <View style={localStyles.timeBadge}>
                                  <Text style={localStyles.timeText}>
                                    {event.createdAt ? formatDisplayTime(event.createdAt) : ''}
                                  </Text>
                                </View>

                                <View style={localStyles.contentColumn}>
                                  <Text style={localStyles.titleText}>{actionTitle}</Text>

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
                                    <PhotoGallery thumbSize={96} uris={photoUris} />
                                  ) : null}
                                </View>
                              </View>
                            </View>
                            {index < events.length - 1 && <View style={styles.calendarRecordsDivider} />}
                          </Fragment>
                        );
                      })}

                      <Pressable
                        accessibilityRole="button"
                        onPress={(event) => {
                          event?.stopPropagation?.();
                          onToggleCard(card.id);
                        }}
                        style={({ pressed }) => [
                          styles.globalJournalCollapseLink,
                          pressed && styles.linkButtonPressed,
                        ]}
                      >
                        <Text style={styles.globalJournalCollapseLinkText}>Свернуть</Text>
                      </Pressable>
                      </View>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>

        <BottomTabBar
          activeTab="journal"
          bottomInset={bottomInset}
          onHomePress={onHomePress}
          onJournalPress={onJournalPress}
          onMenuPress={onMenuPress}
          onScanPress={onScanPress}
          onTasksPress={onTasksPress}
          taskCount={taskCount}
        />

          <SelectBottomSheet
          getKey={(filter) => filter}
          getLabel={(filter) => getJournalFilterLabel(filter)}
          onClose={() => setIsFilterSheetVisible(false)}
          onSelect={(filter) => {
            onChangeJournalFilter(filter);
            onChangeJournalSubFilter('all');
          }}
          selectedKey={journalFilter}
          options={journalMainFilters}
          title="Фильтр журнала"
          visible={isFilterSheetVisible}
        />
      </View>
    </SafeAreaView>
  );
}

const localStyles = {
  filterPill: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F0',
    borderRadius: 999,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  filterPillText: {
    color: '#15863F',
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1,
  },
  headerShell: {
    paddingBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  journalHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  journalHeaderTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  cardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 4,
  },
  cardMetaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  cardMetaText: {
    color: '#66756B',
    fontSize: 14,
    lineHeight: 20,
  },
  eventRow: {
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
  titleText: {
    color: '#1B3023',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
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
    fontWeight: '700',
    lineHeight: 22,
  },
};
