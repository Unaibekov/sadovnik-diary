// Экран общего журнала растений.
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from '../../styles';
import BottomTabBar from '../components/BottomTabBar';
import PhotoGallery from '../components/PhotoGallery';
import SelectBottomSheet from '../components/SelectBottomSheet';
import { FilterIcon } from '../components/icons';
import { BATCH_STATUS_LABELS, INTRO_STAGE } from '../domain/constants';
import {
  getCardCurrentQuantity,
  getCardDisplayName,
  getOperationSummaryItems,
} from '../domain/batch';
import { formatDisplayDate, formatDisplayTime } from '../domain/dates';

const journalFilters = [
  'important',
  'all',
  'comment',
  'photo',
  'contamination',
  'quarantine',
  'losses',
  'sales',
  'rooting',
  'propagation',
  'transplant',
  'stageChange',
];

export default function GlobalJournalScreen({
  bottomInset = 0,
  expandedCardIds = [],
  getJournalFilterLabel,
  getResolvedBatchStatus,
  groupedCards = [],
  journalFilter,
  onChangeJournalFilter,
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
              <Text style={localStyles.filterPillText}>Фильтр</Text>
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
              {getJournalFilterLabel(journalFilter)} события
            </Text>

            {groupedCards.length === 0 && (
              <Text style={styles.journalEmpty}>Событий пока нет</Text>
            )}

            {groupedCards.map(({ card, events }) => {
              const isExpanded = expandedCardIds.includes(card.id);
              const resolvedStatus = getResolvedBatchStatus(card);

              return (
                <View
                  key={card.id}
                  style={[
                    styles.globalJournalCard,
                    (card.sterilityStatus === 'contaminated' || resolvedStatus === 'quarantine') &&
                      styles.globalJournalCardWarning,
                  ]}
                >
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => onToggleCard(card.id)}
                    style={({ pressed }) => [
                      styles.globalJournalCardHeader,
                      pressed && styles.linkButtonPressed,
                    ]}
                  >
                    <View style={styles.globalJournalCardTitleBlock}>
                      <Text style={styles.journalItemTitle} numberOfLines={2}>
                        {getCardDisplayName(card)}
                      </Text>
                      <Text style={styles.journalItemDate} numberOfLines={1}>
                        {card.code} · {card.stage || INTRO_STAGE}
                      </Text>
                    </View>
                    <View style={styles.globalJournalCardHeaderSide}>
                      <Text style={styles.globalJournalBadge}>{events.length}</Text>
                      <Text style={styles.globalJournalToggleText}>
                        {isExpanded ? 'Свернуть' : 'Открыть'}
                      </Text>
                    </View>
                  </Pressable>

                  <Text style={styles.journalItemText} numberOfLines={1}>
                    {BATCH_STATUS_LABELS[resolvedStatus] || resolvedStatus} · {getCardCurrentQuantity(card)} шт.
                  </Text>

                  {isExpanded && (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => onOpenCard(card)}
                        style={({ pressed }) => [
                          styles.globalJournalOpenCardButton,
                          pressed && styles.linkButtonPressed,
                        ]}
                      >
                        <Text style={styles.globalJournalOpenCardButtonText}>Открыть карточку</Text>
                      </Pressable>

                      <View style={styles.globalJournalEventList}>
                        {events.map((event) => {
                          const summaryItems = getOperationSummaryItems(event);
                          const photoUris = (
                            Array.isArray(event.photoUris) && event.photoUris.length > 0
                              ? event.photoUris
                              : event.photoUri
                                ? [event.photoUri]
                                : []
                          ).filter(Boolean);

                          return (
                            <View
                              key={`${event.cardId}-${event.id}`}
                              style={[
                                styles.journalItem,
                                (['contamination', 'quarantine'].includes(event.type) ||
                                  event.stressLevel === 'Критический') && styles.journalItemWarning,
                              ]}
                            >
                              <Text style={styles.journalItemTitle}>{event.title || 'Событие'}</Text>
                              {!!event.date && (
                                <Text style={styles.journalItemDate}>
                                  {formatDisplayDate(event.date)}
                                  {event.createdAt ? `, ${formatDisplayTime(event.createdAt)}` : ''}
                                </Text>
                              )}
                              {summaryItems.map(([label, value]) => (
                                <Text key={label} style={styles.journalItemText}>
                                  {label}: {value}
                                </Text>
                              ))}
                              {photoUris.length > 0 ? (
                                <PhotoGallery
                                  thumbSize={72}
                                  uris={photoUris}
                                />
                              ) : null}
                            </View>
                          );
                        })}
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
          onSelect={(filter) => onChangeJournalFilter(filter)}
          selectedKey={journalFilter}
          options={journalFilters}
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
};
