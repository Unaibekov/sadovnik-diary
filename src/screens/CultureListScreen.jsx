// Экран списка культур выбранной стадии.
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from '../../styles';
import StageHeader from '../components/StageHeader';
import CultureCardInfo from '../components/CultureCardInfo';
import { InfoIcon, LeaveIcon, LogoElementIcon, TimeIcon } from '../components/icons';
import StatusFilterTabs from '../components/StatusFilterTabs';
import {
  getAdaptationStats,
  getCardCurrentQuantity,
  getCardDisplayName,
  getCloneStats,
  getDaysInCurrentStage,
  getGreenhouseStats,
  getHardeningStats,
  getIntroStats,
  getPlantingStats,
  getQrStatus,
  formatQuantityDisplay,
} from '../domain/batch';
import { hasProblemOperation } from '../domain/statusProblemValidation';
import { BATCH_STATUS_LABELS, stages } from '../domain/constants';

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
  isHardeningStage,
  isPlantingStage,
  selectedStageCardsCount,
  onBack,
  onChangeBatchStatusFilter,
  onChangeSearch,
  onCreateCulture,
  onEditCulture,
  onOpenCultureCalendar,
  selectedStage,
  storageError,
}) {
  const isHardeningStageSelected = selectedStage === stages[4];
  const isPlantingStageSelected = selectedStage === stages[5];
  const showHardeningStatusFilters = isHardeningStage || isHardeningStageSelected;
  const showPlantingStatusFilters = isPlantingStage || isPlantingStageSelected;
  const showStatusFilters = isCultureIntroStage || isCloneStage || isAdaptationStage || isGreenhouseStage || showHardeningStatusFilters || showPlantingStatusFilters;
  const visibleBatchStatusFilter = batchStatusFilter === 'quarantine'
    ? 'problem'
    : batchStatusFilter;
  const searchQuery = cardSearch.trim();
  const selectedFilterLabel = {
    all: 'Все',
    active: 'Активная',
    draft: 'Черновик',
    problem: 'Проблема',
  }[visibleBatchStatusFilter] || 'Все';
  const getEmptyStateCopy = () => {
    if (searchQuery) {
      return {
        title: 'Ничего не найдено',
        text: `По запросу «${searchQuery}» карточек нет.\nОчистите поиск или смените фильтр.`,
      };
    }

    if (visibleBatchStatusFilter === 'draft') {
      if (isCultureIntroStage) {
        return {
          title: 'Черновиков пока нет',
          text: 'Нажмите «Создать партию», чтобы создать первую.',
        };
      }

      return {
        title: 'Карточек пока нет',
        text: isCloneStage
          ? 'Переведите растение из введения в культуру.'
          : isAdaptationStage
            ? 'Переведите растение из клонирования.'
            : isGreenhouseStage
              ? 'Переведите растение из адаптации.'
              : isHardeningStage
                ? 'Переведите растение из теплицы.'
                : isPlantingStage
                  ? 'Переведите растение из закалки.'
                  : 'Переведите растение из предыдущей стадии.',
      };
    }

    if (visibleBatchStatusFilter === 'active') {
      return {
        title: 'Активных карточек пока нет',
        text: isCultureIntroStage
          ? 'Нажмите «Создать партию», чтобы добавить первую карточку.'
          : `Переведите растение из предыдущей стадии, чтобы оно появилось в фильтре «${selectedFilterLabel}».`,
      };
    }

    if (visibleBatchStatusFilter === 'partial') {
      return {
        title: 'Частично реализованных карточек пока нет',
        text: 'Когда часть партии будет реализована, карточка появится здесь.',
      };
    }

    if (visibleBatchStatusFilter === 'problem') {
      return {
        title: 'Проблемных карточек пока нет',
        text: 'Это хороший знак. Если появятся отклонения, они отобразятся здесь.',
      };
    }

    return {
      title: 'Карточек пока нет',
      text: isCultureIntroStage
        ? 'Нажмите «Создать партию», чтобы создать первую.'
        : isCloneStage
          ? 'Переведите растение из введения в культуру.'
          : isAdaptationStage
            ? 'Переведите растение из клонирования.'
            : isGreenhouseStage
              ? 'Переведите растение из адаптации.'
              : isHardeningStage
                ? 'Переведите растение из теплицы.'
                : isPlantingStage
                  ? 'Переведите растение из закалки.'
                  : 'Переведите растение из предыдущей стадии.',
    };
  };
  const emptyStateCopy = getEmptyStateCopy();
  const statusFilterItems = isCloneStage || isAdaptationStage || isGreenhouseStage || showHardeningStatusFilters || showPlantingStatusFilters
    ? [
      ['all', 'Все'],
      ['active', 'Активная'],
      ['partial', 'Частично реализована'],
      ['problem', 'Проблема'],
    ]
    : [
      ['all', 'Все'],
      ['active', 'Активная'],
      ['draft', 'Черновик'],
      ['problem', 'Проблема'],
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
                style={[styles.input, localStyles.searchInput]}
                value={cardSearch}
              />
            </View>
          </View>

          {showStatusFilters && (
            <StatusFilterTabs
              activeValue={visibleBatchStatusFilter}
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
            !isCardsLoading && cards.length === 0 && localStyles.emptyScrollContent,
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
              const introStats = getIntroStats(card);
              const cloneStats = getCloneStats(card);
              const adaptationStats = getAdaptationStats(card);
              const greenhouseStats = getGreenhouseStats(card);
              const hardeningStats = getHardeningStats(card);
              const plantingStats = typeof getPlantingStats === 'function'
                ? getPlantingStats(card)
                : {
                  completionResult: 'Не указан',
                  lossCount: 0,
                  riskStatus: 'Нормальный',
                  survivalRate: 'Не указана',
                };
              const cardDaysInStage = getDaysInCurrentStage(card);
              const isContaminated = card.sterilityStatus === 'contaminated';
              const isCriticalLossRisk = (
                (isCultureIntroStage && introStats.riskStatus === 'Критический') ||
                (isCloneStage && cloneStats.riskStatus === 'Критический') ||
                (isAdaptationStage && adaptationStats.riskStatus === 'Критический') ||
                (isGreenhouseStage && greenhouseStats.riskStatus === 'Критический') ||
                (isHardeningStage && hardeningStats.riskStatus === 'Критический') ||
                (isPlantingStage && plantingStats.riskStatus === 'Критический')
              );
              const isProblemStatus = hasProblemOperation(card) || batchStatus === 'problem' || batchStatus === 'quarantine' || isContaminated || isCriticalLossRisk;
              const statusDots = [];

              if (batchStatus === 'partial') {
                statusDots.push('active', 'partial');
              } else {
                statusDots.push(batchStatus === 'draft' ? 'draft' : 'active');
              }

              if (isProblemStatus) {
                statusDots.push('problem');
              }
              const introMeta = [
                {
                  key: 'quantity',
                  icon: <LeaveIcon color="#15863F" size={16} />,
                  value: formatQuantityDisplay(getCardCurrentQuantity(card), card.quantity),
                },
                {
                  key: 'days',
                  icon: <TimeIcon color="#15863F" size={16} />,
                  value: formatDaysInStage(cardDaysInStage),
                },
              ];
              const stageMeta = [
                {
                  key: 'quantity',
                  icon: <LeaveIcon color="#15863F" size={16} />,
                  value: formatQuantityDisplay(getCardCurrentQuantity(card), card.quantity),
                },
                {
                  key: 'days',
                  icon: <TimeIcon color="#15863F" size={16} />,
                  value: formatDaysInStage(cardDaysInStage),
                },
              ];
              const introStatuses = [
                ...(isProblemStatus
                  ? [{
                    key: 'problem',
                    icon: <InfoIcon color="#D92D20" size={14} />,
                    text: 'Проблема',
                    textStyle: { color: '#D92D20' },
                  }]
                  : []),
                ...(cardDaysInStage >= 14 && !isContaminated && batchStatus !== 'quarantine' && !isProblemStatus
                  ? [{
                    key: 'stage-ready',
                    icon: <TimeIcon color="#F59E0B" size={14} />,
                    text: 'Готово к смене стадии',
                  }]
                  : []),
                ...(cardDaysInStage < 14 &&
                  getQrStatus(card) === 'pending_print' &&
                  !isContaminated &&
                  batchStatus !== 'quarantine' &&
                  !isProblemStatus
                  ? [{
                    key: 'qr-pending',
                    icon: <InfoIcon color="#9AA3AF" size={14} />,
                    text: 'QR ожидает печати',
                  }]
                  : []),
              ];
              const stageStatuses = [
                ...(isProblemStatus
                  ? [{
                    key: 'problem',
                    icon: <InfoIcon color="#D92D20" size={14} />,
                    text: 'Проблема',
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
                ...(isHardeningStage
                  ? [{
                    key: 'hardening-readiness',
                    icon: <TimeIcon color={hardeningStats.readinessForPlanting === 'Готова' ? '#15863F' : '#F59E0B'} size={14} />,
                    text: `Готовность: ${hardeningStats.readinessForPlanting}`,
                    textStyle: { color: hardeningStats.readinessForPlanting === 'Готова' ? '#15863F' : '#B45309' },
                  }]
                  : []),
                ...(isPlantingStage
                  ? [{
                    key: 'planting-completion',
                    icon: <TimeIcon color={plantingStats.completionResult === 'Прижилась' ? '#15863F' : '#F59E0B'} size={14} />,
                    text: plantingStats.completionResult !== 'Не указан'
                      ? `Итог: ${plantingStats.completionResult}`
                      : `Приживаемость: ${plantingStats.survivalRate}`,
                    textStyle: { color: plantingStats.completionResult === 'Прижилась' ? '#15863F' : '#B45309' },
                  }]
                  : []),
              ];

              return (
                <Pressable
                  accessibilityRole="button"
                  testID="culture-card"
                  key={card.id}
                  onPress={() => onOpenCultureCalendar(card)}
                  style={({ pressed }) => [
                    styles.plantCard,
                    pressed && styles.stageCardPressed,
                  ]}
                >
                  {statusDots.length > 1 ? (
                    <View
                      accessibilityLabel={
                        statusDots.includes('problem')
                          ? (batchStatus === 'partial' ? 'Активная, частично реализована, проблема' : 'Активная, проблема')
                          : 'Активная, частично реализована'
                      }
                      style={styles.plantCardStatusDotGroup}
                    >
                      {statusDots.map((statusDot) => (
                        <View
                          key={statusDot}
                          style={[
                            styles.plantCardStatusDotInline,
                            statusDot === 'active' && styles.plantCardStatusDotActive,
                            statusDot === 'draft' && styles.plantCardStatusDotDraft,
                            statusDot === 'partial' && styles.plantCardStatusDotPartial,
                            statusDot === 'problem' && styles.plantCardStatusDotProblem,
                          ]}
                        />
                      ))}
                    </View>
                  ) : (
                    <View
                      accessibilityLabel={
                        BATCH_STATUS_LABELS[batchStatus] ||
                        (isCriticalLossRisk ? 'Проблема' : '') ||
                        batchStatus ||
                        'Активная'
                      }
                      style={[
                        styles.plantCardStatusDot,
                        getPlantCardStatusDotStyle(batchStatus, card.sterilityStatus, isCriticalLossRisk),
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

            {!isCardsLoading && cards.length === 0 && (
              <View style={localStyles.emptyState}>
                <LogoElementIcon color="#15863F" size={74} />
                <Text style={localStyles.emptyStateTitle}>{emptyStateCopy.title}</Text>
                <Text style={localStyles.emptyStateText}>{emptyStateCopy.text}</Text>
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
    gap: 16,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  emptyStateTitle: {
    color: '#15863F',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    textAlign: 'center',
  },
  emptyStateText: {
    color: '#15863F',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    textAlign: 'center',
  },
});

