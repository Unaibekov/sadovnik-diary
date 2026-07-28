// Экран списка культур выбранной стадии.
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from '../../styles';
import StageHeader from '../components/StageHeader';
import CultureCardInfo from '../components/CultureCardInfo';
import StatusFilterTabs from '../components/StatusFilterTabs';
import { InfoIcon, LeaveIcon, LogoElementIcon, TimeIcon } from '../components/icons';
import { getCardDisplayName } from '../domain/batch';
import { buildCultureListCardViewData } from '../domain/cultureListCardView';
import { getStageStatusFilterItems } from '../domain/cultureSelectors';
import { stages } from '../domain/constants';

const STATUS_TONE_STYLES = {
  neutral: { color: '#6B7280' },
  problem: { color: '#D92D20' },
  problemStrong: { color: '#D92D20', fontWeight: '700' },
  success: { color: '#15863F' },
  warning: { color: '#B45309' },
};

const STATUS_TONE_ICON_COLORS = {
  neutral: '#9AA3AF',
  problem: '#D92D20',
  problemStrong: '#D92D20',
  success: '#15863F',
  warning: '#F59E0B',
};

function getMetaIcon(type) {
  if (type === 'days') {
    return <TimeIcon color="#15863F" size={16} />;
  }

  return <LeaveIcon color="#15863F" size={16} />;
}

function getStatusIcon(tone) {
  if (tone === 'warning') {
    return <TimeIcon color={STATUS_TONE_ICON_COLORS[tone]} size={14} />;
  }

  return <InfoIcon color={STATUS_TONE_ICON_COLORS[tone] || STATUS_TONE_ICON_COLORS.neutral} size={14} />;
}

function buildCardInfoProps(cardView) {
  return {
    meta: cardView.meta.map((item) => ({
      ...item,
      icon: getMetaIcon(item.icon),
    })),
    statuses: cardView.secondaryRows.map((status) => ({
      ...status,
      icon: getStatusIcon(status.tone),
      textStyle: STATUS_TONE_STYLES[status.tone] || STATUS_TONE_STYLES.neutral,
    })),
  };
}


export default function CultureListScreen({
  batchStatusFilter,
  bottomInset,
  cardSearch,
  cards,
  isAdaptationStage,
  isCardsLoading,
  isCloneStage,
  isCultureIntroStage,
  isGreenhouseStage,
  isHardeningStage,
  isPlantingStage,
  onBack,
  onChangeBatchStatusFilter,
  onChangeSearch,
  onCreateCulture,
  onOpenCultureCalendar,
  selectedStage,
  stageStatusFilterCounts = {},
  storageError,
}) {
  const isHardeningStageSelected = selectedStage === stages[4];
  const isPlantingStageSelected = selectedStage === stages[5];
  const showHardeningStatusFilters = isHardeningStage || isHardeningStageSelected;
  const showPlantingStatusFilters = isPlantingStage || isPlantingStageSelected;
  const showStatusFilters = isCultureIntroStage || isCloneStage || isAdaptationStage || isGreenhouseStage || showHardeningStatusFilters || showPlantingStatusFilters;
  const visibleBatchStatusFilter = batchStatusFilter === 'draft' || batchStatusFilter === 'active'
    ? 'all'
    : batchStatusFilter === 'quarantine'
      ? 'problem'
      : batchStatusFilter;
  const statusFilterItems = getStageStatusFilterItems(selectedStage);
  const visibleStatusFilterItems = statusFilterItems.filter(([value]) => (
    value === 'all' || (stageStatusFilterCounts[value] || 0) > 0
  ));
  const selectedFilterLabel = statusFilterItems.find(([value]) => value === visibleBatchStatusFilter)?.[1] || 'Все';
  const searchQuery = cardSearch.trim();
  const getEmptyStateCopy = () => {
    if (searchQuery) {
      return {
        title: 'Ничего не найдено',
        text: `По запросу «${searchQuery}» карточек нет.\nОчистите поиск или смените фильтр.`,
      };
    }

    if (visibleBatchStatusFilter === 'problem') {
      return {
        title: 'Проблемных карточек пока нет',
        text: 'Это хороший знак. Если появятся отклонения, они отобразятся здесь.',
      };
    }

    if (visibleBatchStatusFilter !== 'all') {
      return {
        title: `${selectedFilterLabel} пока нет`,
        text: `Карточки для фильтра «${selectedFilterLabel}» появятся здесь.`,
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.fixedCardsScreen}>
        <StageHeader
          onBack={onBack}
          subtitle={null}
          title={selectedStage}
        />

        <View style={localStyles.filterBlock}>
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

          {showStatusFilters && visibleStatusFilterItems.length > 1 && (
            <StatusFilterTabs
              activeValue={visibleBatchStatusFilter}
              countsByValue={stageStatusFilterCounts}
              items={visibleStatusFilterItems}
              onChange={onChangeBatchStatusFilter}
            />
          )}
        </View>

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
              const cardView = buildCultureListCardViewData(card, {
                isAdaptationStage,
                isCloneStage,
                isCultureIntroStage,
                isGreenhouseStage,
                isHardeningStage,
                isPlantingStage,
                selectedStage,
              });
              const cardInfo = buildCardInfoProps(cardView);

              return (
                <Pressable
                  accessibilityLabel={cardView.accessibilityLabel}
                  accessibilityRole="button"
                  testID="culture-card"
                  key={card.id}
                  onPress={() => onOpenCultureCalendar(card)}
                  style={({ pressed }) => [
                    styles.plantCard,
                    pressed && styles.stageCardPressed,
                  ]}
                >
                  {cardView.hasProblemMarker && (
                    <View
                      accessibilityLabel="Проблема активна"
                      style={[
                        styles.plantCardStatusDot,
                        styles.plantCardStatusDotProblem,
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
                        <CultureCardInfo meta={cardInfo.meta} statuses={cardInfo.statuses} />
                      </>
                    ) : (
                      <>
                        <Text style={styles.plantCardName}>{getCardDisplayName(card)}</Text>
                        <CultureCardInfo meta={cardInfo.meta} statuses={cardInfo.statuses} />
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
  filterBlock: {
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  searchRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
    borderRadius: 40,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 9,
    height: 52,
    paddingHorizontal: 14,
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

