import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from '../../styles';
import BottomTabBar from '../components/BottomTabBar';
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
  'contamination',
  'quarantine',
  'losses',
  'sales',
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
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.fixedCardsScreen}>
        <View style={styles.fixedCardsControls}>
          <Text style={styles.globalJournalTitle}>Журнал</Text>
          <ScrollView
            contentContainerStyle={styles.globalJournalFilterRow}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {journalFilters.map((filter) => (
              <Pressable
                accessibilityRole="button"
                key={filter}
                onPress={() => onChangeJournalFilter(filter)}
                style={[
                  styles.filterButton,
                  journalFilter === filter && styles.filterButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    journalFilter === filter && styles.filterButtonTextActive,
                  ]}
                >
                  {getJournalFilterLabel(filter)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
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
      </View>
    </SafeAreaView>
  );
}
