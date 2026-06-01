import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from '../../styles';
import StageHeader from '../components/StageHeader';
import StatusFilterTabs from '../components/StatusFilterTabs';
import {
  getAdaptationStats,
  getCardCurrentQuantity,
  getCardDisplayName,
  getCloneStats,
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
                        <View style={styles.plantCardMetaRow}>
                          <Text style={styles.plantCardMetaText} numberOfLines={1}>
                            {card.createdAt ? formatDisplayDate(card.createdAt) : '-'} {'\u2022'} {getCardCurrentQuantity(card)} шт.
                          </Text>
                          {getQrStatus(card) === 'pending_print' && (
                            <Text style={styles.plantCardMetaText} numberOfLines={1}>
                              Ожидает печати
                            </Text>
                          )}
                        </View>
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
                        <View style={styles.plantCardMetaRow}>
                          <Text style={styles.plantCardMetaText} numberOfLines={1}>
                            {(card.stageChangedAt || card.createdAt)
                              ? formatDisplayDate(card.stageChangedAt || card.createdAt)
                              : '-'} {'\u2022'} {getCardCurrentQuantity(card)} из {card.quantity} шт.
                          </Text>
                        </View>

                        {isCloneStage && cloneStats.riskStatus !== 'Нормальный' && (
                          <Text style={styles.plantCardWarningText}>
                            Риск: {cloneStats.riskStatus}
                          </Text>
                        )}

                        {isAdaptationStage && adaptationStats.riskStatus !== 'Нормальный' && (
                          <Text style={styles.plantCardWarningText}>
                            Риск: {adaptationStats.riskStatus}
                          </Text>
                        )}

                        {isGreenhouseStage && greenhouseStats.riskStatus !== 'Низкий' && (
                          <Text style={styles.plantCardWarningText}>
                            Риск: {greenhouseStats.riskStatus}
                          </Text>
                        )}
                        {isGreenhouseStage && greenhouseStats.hasOverdueCare && (
                          <Text style={styles.plantCardWarningText}>
                            Уход просрочен
                          </Text>
                        )}
                      </>
                    )}
                  </View>
                </Pressable>
              );
            })}

            {!isCardsLoading && cards.length === 0 && (
              <View style={localStyles.emptyState}>
                <Text style={localStyles.emptyStateText}>
                  {isCultureIntroStage && 'Партий пока нет. Нажмите "Создать партию", чтобы создать первую.'}
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
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D7E0D8',
    borderRadius: 10,
    borderWidth: 1,
    padding: 24,
  },
  emptyStateText: {
    color: '#65756B',
    fontSize: 18,
    fontWeight: '600',
  },
});
