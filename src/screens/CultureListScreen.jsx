import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from '../../styles';
import StageHeader from '../components/StageHeader';
import CultureCardInfo from '../components/CultureCardInfo';
import { CalendarIcon, InfoIcon, LeaveIcon, LogoElementIcon, TimeIcon } from '../components/icons';
import StatusFilterTabs from '../components/StatusFilterTabs';
import {
  getAdaptationStats,
  getCardCurrentQuantity,
  getCardDisplayName,
  getCloneStats,
  getDaysInCurrentStage,
  getGreenhouseStats,
  getQrStatus,
} from '../domain/batch';
import { BATCH_STATUS_LABELS } from '../domain/constants';
import { formatDisplayDate } from '../domain/dates';

export default function CultureListScreen({
  allVisibleStageCardsCount,
  batchStatusFilter,
  bottomInset,
  cardSearch,
  cards,
  getPlantCardStatusDotStyle,
  getResolvedBatchStatus,
  isAdaptationStage,
  isCardsLoading,
  isCloneStage,
  isCultureIntroStage,
  isGreenhouseStage,
  selectedStageCardsCount,
  onBack,
  onChangeBatchStatusFilter,
  onChangeSearch,
  onCreateCulture,
  onEditCulture,
  onOpenRecommendations,
  onOpenCultureCalendar,
  selectedStage,
  storageError,
}) {
  const showStatusFilters = isCultureIntroStage || isCloneStage || isAdaptationStage || isGreenhouseStage;
  const statusFilterItems = isCloneStage || isAdaptationStage || isGreenhouseStage
    ? [
      ['all', 'Все'],
      ['active', 'Активная'],
      ['partial', 'Частично реализована'],
      ['quarantine', 'Карантин'],
      ['problem', 'Проблемная'],
    ]
    : [
      ['all', 'Все'],
      ['active', 'Активная'],
      ['draft', 'Черновик'],
      ['quarantine', 'Карантин'],
    ];
  const formatDaysInStage = (days) => {
    const value = Math.max(days, 1);
    const lastDigit = value % 10;
    const lastTwoDigits = value % 100;
    const suffix = lastTwoDigits >= 11 && lastTwoDigits <= 14
      ? 'дней'
      : lastDigit === 1
        ? 'день'
        : lastDigit >= 2 && lastDigit <= 4
          ? 'дня'
          : 'дней';

    return `${value} ${suffix} в стадии`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.fixedCardsScreen}>
        <StageHeader
          onBack={onBack}
          onOpenRecommendations={!isCultureIntroStage ? onOpenRecommendations : undefined}
          title={selectedStage}
        >
          <View style={localStyles.searchRow}>
            <View style={localStyles.searchBox}>
              <Text style={localStyles.searchIcon}>{'\u2315'}</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={onChangeSearch}
                placeholder="Поиск по названию"
                placeholderTextColor="#9AA3AF"
                style={localStyles.searchInput}
                value={cardSearch}
              />
            </View>
          </View>

          {showStatusFilters && (
            <StatusFilterTabs
              activeValue={batchStatusFilter}
              count={allVisibleStageCardsCount}
              items={statusFilterItems}
              onChange={onChangeBatchStatusFilter}
            />
          )}
        </StageHeader>

        <ScrollView
          contentContainerStyle={[
            styles.fixedCardsScrollContent,
            isCultureIntroStage && styles.fixedCardsScrollContentWithActions,
            !isCardsLoading && selectedStageCardsCount === 0 && localStyles.emptyScrollContent,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={localStyles.plantCardList}>
            {isCardsLoading && (
              <View style={localStyles.emptyState}>
                <Text style={localStyles.emptyStateText}>Загрузка карточек...</Text>
              </View>
            )}

            {!!storageError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{storageError}</Text>
              </View>
            )}

            {!isCardsLoading && cards.map((card) => {
              const batchStatus = getResolvedBatchStatus(card);
              const cloneStats = getCloneStats(card);
              const adaptationStats = getAdaptationStats(card);
              const greenhouseStats = getGreenhouseStats(card);
              const cardDaysInStage = getDaysInCurrentStage(card);
              const isContaminated = card.sterilityStatus === 'contaminated';
              const introMeta = [
                {
                  key: 'date',
                  icon: <CalendarIcon color="#15863F" size={16} />,
                  value: card.createdAt ? formatDisplayDate(card.createdAt) : '-',
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
              const stageMeta = [
                {
                  key: 'date',
                  icon: <CalendarIcon color="#15863F" size={16} />,
                  value: (card.stageChangedAt || card.createdAt)
                    ? formatDisplayDate(card.stageChangedAt || card.createdAt)
                    : '-',
                },
                {
                  key: 'quantity',
                  icon: <LeaveIcon color="#15863F" size={16} />,
                  value: `${getCardCurrentQuantity(card)} из ${card.quantity} шт.`,
                },
                {
                  key: 'days',
                  icon: <TimeIcon color="#15863F" size={16} />,
                  value: formatDaysInStage(cardDaysInStage),
                },
              ];
              const introStatuses = [
                ...(batchStatus === 'quarantine'
                  ? [{
                    key: 'quarantine',
                    icon: <InfoIcon color="#D92D20" size={14} />,
                    text: 'Карантин',
                    textStyle: { color: '#D92D20' },
                  }]
                  : []),
                ...(isContaminated
                  ? [{
                    key: 'contaminated',
                    icon: <InfoIcon color="#D92D20" size={14} />,
                    text: 'Контаминация',
                    textStyle: { color: '#D92D20' },
                  }]
                  : []),
                ...(cardDaysInStage >= 14 && !isContaminated && batchStatus !== 'quarantine'
                  ? [{
                    key: 'stage-ready',
                    icon: <TimeIcon color="#F59E0B" size={14} />,
                    text: 'Готово к смене стадии',
                  }]
                  : []),
                ...(cardDaysInStage < 14 &&
                  getQrStatus(card) === 'pending_print' &&
                  !isContaminated &&
                  batchStatus !== 'quarantine'
                  ? [{
                    key: 'qr-pending',
                    icon: <InfoIcon color="#9AA3AF" size={14} />,
                    text: 'QR ожидает печати',
                  }]
                  : []),
              ];
              const stageStatuses = [
                ...(batchStatus === 'quarantine'
                  ? [{
                    key: 'quarantine',
                    icon: <InfoIcon color="#D92D20" size={14} />,
                    text: 'Карантин',
                    textStyle: { color: '#D92D20' },
                  }]
                  : []),
                ...(isContaminated
                  ? [{
                    key: 'contaminated',
                    icon: <InfoIcon color="#D92D20" size={14} />,
                    text: 'Контаминация',
                    textStyle: { color: '#D92D20' },
                  }]
                  : []),
                ...(isCloneStage && cloneStats.riskStatus !== 'Нормальный'
                  ? [{
                    key: 'clone-risk',
                    icon: <InfoIcon color="#D92D20" size={14} />,
                    text: `Риск: ${cloneStats.riskStatus}`,
                    textStyle: { color: '#D92D20' },
                  }]
                  : []),
                ...(isAdaptationStage && adaptationStats.riskStatus !== 'Нормальный'
                  ? [{
                    key: 'adaptation-risk',
                    icon: <InfoIcon color="#D92D20" size={14} />,
                    text: `Риск: ${adaptationStats.riskStatus}`,
                    textStyle: { color: '#D92D20' },
                  }]
                  : []),
                ...(isGreenhouseStage && greenhouseStats.riskStatus !== 'Низкий'
                  ? [{
                    key: 'greenhouse-risk',
                    icon: <InfoIcon color="#D92D20" size={14} />,
                    text: `Риск: ${greenhouseStats.riskStatus}`,
                    textStyle: { color: '#D92D20' },
                  }]
                  : []),
                ...(isGreenhouseStage && greenhouseStats.hasOverdueCare
                  ? [{
                    key: 'overdue-care',
                    icon: <InfoIcon color="#D92D20" size={14} />,
                    text: 'Уход просрочен',
                    textStyle: { color: '#D92D20' },
                  }]
                  : []),
              ];

              return (
                <Pressable
                  accessibilityRole="button"
                  key={card.id}
                  onPress={() => onOpenCultureCalendar(card)}
                  style={({ pressed }) => [
                    styles.plantCard,
                    pressed && styles.stageCardPressed,
                  ]}
                >
                  {batchStatus === 'partial' && card.sterilityStatus !== 'contaminated' ? (
                    <View
                      accessibilityLabel="Активная, частично реализована"
                      style={styles.plantCardStatusDotGroup}
                    >
                      <View style={[styles.plantCardStatusDotInline, styles.plantCardStatusDotActive]} />
                      <View style={[styles.plantCardStatusDotInline, styles.plantCardStatusDotPartial]} />
                    </View>
                  ) : (
                    <View
                      accessibilityLabel={
                        BATCH_STATUS_LABELS[batchStatus] ||
                        batchStatus ||
                        'Активная'
                      }
                      style={[
                        styles.plantCardStatusDot,
                        getPlantCardStatusDotStyle(batchStatus, card.sterilityStatus),
                      ]}
                    />
                  )}

                  <View>
                    {isCultureIntroStage ? (
                      <>
                        <View style={styles.plantCardHeaderRow}>
                          <Text style={styles.plantCardName} numberOfLines={2}>
                            {getCardDisplayName(card)}
                          </Text>
                        </View>
                        <CultureCardInfo meta={introMeta} statuses={introStatuses} />
                        {batchStatus === 'draft' && (
                          <View style={styles.plantCardActions}>
                            <Pressable
                              accessibilityRole="button"
                              onPress={(event) => {
                                event?.stopPropagation?.();
                                onEditCulture(card);
                              }}
                              style={({ pressed }) => [
                                styles.plantCardActionButton,
                                pressed && styles.linkButtonPressed,
                              ]}
                            >
                              <Text style={styles.plantCardActionButtonText}>Редактировать</Text>
                            </Pressable>
                          </View>
                        )}
                      </>
                    ) : (
                      <>
                        <Text style={styles.plantCardName}>{getCardDisplayName(card)}</Text>
                        <CultureCardInfo meta={stageMeta} statuses={stageStatuses} />
                      </>
                    )}
                  </View>
                </Pressable>
              );
            })}

            {!isCardsLoading && selectedStageCardsCount === 0 && (
              <View style={localStyles.emptyState}>
                <View style={localStyles.emptyStateIconWrap}>
                  <LogoElementIcon color="#15863F" size={74} />
                </View>
                <Text style={localStyles.emptyStateText}>
                  {isCultureIntroStage && 'Партии пока нет. \nНажмите «Создать партию», чтобы создать первую.'}
                  {isCloneStage && 'Карточек пока нет. Переведите растение из введения в культуру.'}
                  {isAdaptationStage && 'Карточек пока нет. Переведите растение из клонирования.'}
                  {isGreenhouseStage && 'Карточек пока нет. Переведите растение из адаптации.'}
                  {!isCultureIntroStage && !isCloneStage && !isAdaptationStage && !isGreenhouseStage &&
                    'Карточек пока нет. Переведите растение из предыдущей стадии.'}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {isCultureIntroStage && (
          <View style={[
            styles.fixedAddButtonBar,
            { paddingBottom: Math.max(bottomInset + 12, 28) },
          ]}>
            <Pressable
              accessibilityRole="button"
              onPress={onCreateCulture}
              style={({ pressed }) => [
                styles.addButton,
                styles.fixedAddButton,
                pressed && styles.pressedButton,
              ]}
            >
              <Text style={styles.addButtonText}>Создать партию</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  searchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F0',
    borderRadius: 40,
    borderWidth: 1,
    elevation: 2,
    flex: 1,
    flexDirection: 'row',
    gap: 9,
    height: 52,
    paddingHorizontal: 14,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  searchIcon: {
    color: '#9AA3AF',
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 22,
    marginTop: 1,
    textAlign: 'center',
    width: 22,
  },
  searchInput: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    color: '#111827',
    flex: 1,
    fontSize: 16,
    height: 52,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  plantCardList: {
    gap: 10,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D7E0D8',
    borderRadius: 18,
    borderWidth: 1,
    gap: 16,
    justifyContent: 'center',
    minHeight: 220,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: '#102015',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  emptyStateIconWrap: {
    alignItems: 'center',
    backgroundColor: '#EAF6EE',
    borderRadius: 999,
    height: 104,
    justifyContent: 'center',
    width: 104,
  },
  emptyStateText: {
    color: '#15863F',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    textAlign: 'center',
  },
});

