// Вкладка паспорта культуры с основными данными.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import appStyles from '../../styles';
import { DownloadSquareIcon } from './icons';
import { BATCH_STATUS_LABELS, INTRO_STAGE, QR_STATUS_LABELS, stages } from '../domain/constants';
import { formatDisplayDate } from '../domain/dates';
import {
  formatQuantityDisplay,
  getCardActiveProblemQuantity,
  getCardCurrentQuantity,
  getCardHealthyQuantity,
  getCardLocationDescription,
  getCardPropagationQuantity,
  getCardSourceQuantity,
  getIntroStats,
  getQrStatus,
} from '../domain/batch';

export default function CulturePassportTab({
  adaptationStats,
  card,
  cultureCards = [],
  cloneStats,
  currentQuantity,
  daysInStage,
  hardeningStats,
  plantingStats,
  getResolvedBatchStatus,
  onOpenRelatedCard,
  onShareQrPress,
}) {
  const safeHardeningStats = hardeningStats || {
    lossCount: 0,
    readinessForPlanting: 'Не указана',
    riskStatus: 'Нормальный',
  };
  const safePlantingStats = plantingStats || {
    completionResult: 'Не указан',
    lossCount: 0,
    riskStatus: 'Нормальный',
    survivalRate: 'Не указана',
  };
  const introStats = getIntroStats(card);
  const batchStatus = getResolvedBatchStatus(card);
  const activeProblemQuantity = getCardActiveProblemQuantity(card);
  const healthyQuantity = getCardHealthyQuantity(card);
  const sourceQuantity = getCardSourceQuantity(card);
  const propagationQuantity = getCardPropagationQuantity(card);
  const childCards = cultureCards.filter((childCard) => childCard.parentCardId === card.id);
  const parentCard = cultureCards.find((cultureCard) => cultureCard.id === card.parentCardId);
  const originTypeLabel = card.originType === 'problemIsolation'
    ? 'Изолированная партия'
    : card.originType === 'cloned'
      ? 'Клон'
      : card.originType === 'split'
        ? 'Разделенная партия'
        : 'Исходная партия';
  const totalQuantityLabel = propagationQuantity > 0
    ? `${currentQuantity} шт.`
    : formatQuantityDisplay(currentQuantity, card.quantity);
  const batchStatusLabel = batchStatus === 'active'
    ? 'Без отклонений'
    : (BATCH_STATUS_LABELS[batchStatus] || batchStatus || 'Не указан');

  return (
    <View style={styles.passportBlocks}>
      <View style={[appStyles.surfacePanel, styles.passportPanel]}>
        <Text style={styles.passportSectionTitle}>Сводка</Text>
        <View style={[styles.passportRow, styles.passportRowFirst]}>
          <Text style={styles.passportLabel}>Статус партии</Text>
          <Text style={styles.passportValue}>{batchStatusLabel}</Text>
        </View>
        {card.stage === INTRO_STAGE && (
          <View style={styles.passportRow}>
            <Text style={styles.passportLabel}>Статус риска</Text>
            <Text style={styles.passportValue}>{introStats.riskStatus}</Text>
          </View>
        )}
        {card.stage === 'Клонирование' && (
          <View style={styles.passportRow}>
            <Text style={styles.passportLabel}>Статус риска</Text>
            <Text style={styles.passportValue}>{cloneStats.riskStatus}</Text>
          </View>
        )}
        {card.stage === 'Адаптация' && (
          <View style={styles.passportRow}>
            <Text style={styles.passportLabel}>Статус риска</Text>
            <Text style={styles.passportValue}>{adaptationStats.riskStatus}</Text>
          </View>
        )}
        {card.stage === stages[4] && (
          <View style={styles.passportRow}>
            <Text style={styles.passportLabel}>Статус риска</Text>
            <Text style={styles.passportValue}>{safeHardeningStats.riskStatus}</Text>
          </View>
        )}
        {card.stage === stages[5] && (
          <View style={styles.passportRow}>
            <Text style={styles.passportLabel}>Статус риска</Text>
            <Text style={styles.passportValue}>{safePlantingStats.riskStatus}</Text>
          </View>
        )}
        <View style={styles.passportRow}>
          <Text style={styles.passportLabel}>Общий остаток</Text>
          <Text style={styles.passportValue}>
            {totalQuantityLabel}
          </Text>
        </View>
        {activeProblemQuantity > 0 && (
          <>
            <View style={styles.passportRow}>
              <Text style={styles.passportLabel}>Здоровые</Text>
              <Text style={styles.passportValue}>{healthyQuantity} шт.</Text>
            </View>
            <View style={styles.passportRow}>
              <Text style={styles.passportLabel}>С активной проблемой</Text>
              <Text style={styles.passportValue}>{activeProblemQuantity} шт.</Text>
            </View>
          </>
        )}
        {propagationQuantity > 0 && (
          <>
            <View style={styles.passportRow}>
              <Text style={styles.passportLabel}>Исходные растения</Text>
              <Text style={styles.passportValue}>{sourceQuantity} шт.</Text>
            </View>
            <View style={styles.passportRow}>
              <Text style={styles.passportLabel}>Размножено</Text>
              <Text style={styles.passportValue}>{propagationQuantity} шт.</Text>
            </View>
          </>
        )}
        {card.stage === 'Клонирование' && (
          <>
            <View style={styles.passportRow}>
              <Text style={styles.passportLabel}>Укоренено</Text>
              <Text style={styles.passportValue}>
                {cloneStats.rootedCount} шт. / {cloneStats.rootingPercent}%
              </Text>
            </View>
            <View style={styles.passportRow}>
              <Text style={styles.passportLabel}>Потери</Text>
              <Text style={styles.passportValue}>
                {cloneStats.lossCount} шт. / {cloneStats.lossPercent}%
              </Text>
            </View>
          </>
        )}
        {card.stage === 'Адаптация' && (
          <>
            <View style={styles.passportRow}>
              <Text style={styles.passportLabel}>Приживаемость</Text>
              <Text style={styles.passportValue}>{adaptationStats.survivalPercent}%</Text>
            </View>
            <View style={styles.passportRow}>
              <Text style={styles.passportLabel}>Потери</Text>
              <Text style={styles.passportValue}>{adaptationStats.lossCount} шт.</Text>
            </View>
          </>
        )}
        {card.stage === stages[4] && (
          <>
            <View style={styles.passportRow}>
              <Text style={styles.passportLabel}>Готовность к высадке</Text>
              <Text style={styles.passportValue}>{safeHardeningStats.readinessForPlanting}</Text>
            </View>
            <View style={styles.passportRow}>
              <Text style={styles.passportLabel}>Потери</Text>
              <Text style={styles.passportValue}>{safeHardeningStats.lossCount} шт.</Text>
            </View>
          </>
        )}
        {card.stage === stages[5] && (
          <>
            <View style={styles.passportRow}>
              <Text style={styles.passportLabel}>Приживаемость</Text>
              <Text style={styles.passportValue}>{safePlantingStats.survivalRate}</Text>
            </View>
            <View style={styles.passportRow}>
              <Text style={styles.passportLabel}>Итог высадки</Text>
              <Text style={styles.passportValue}>{safePlantingStats.completionResult}</Text>
            </View>
            <View style={styles.passportRow}>
              <Text style={styles.passportLabel}>Потери</Text>
              <Text style={styles.passportValue}>{safePlantingStats.lossCount} шт.</Text>
            </View>
          </>
        )}
        {!!card.code && (
          <View style={styles.passportQrRow}>
            <View style={styles.passportQrTextBlock}>
              <Text style={styles.passportLabel}>QR-код</Text>
              <Text ellipsizeMode="tail" numberOfLines={1} style={styles.passportValue}>
                {QR_STATUS_LABELS[getQrStatus(card)] || getQrStatus(card)}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Скачать QR-код"
              accessibilityRole="button"
              onPress={onShareQrPress}
              style={({ pressed }) => [
                styles.passportQrAction,
                pressed && appStyles.linkButtonPressed,
              ]}
            >
              <DownloadSquareIcon color="#15863F" size={26} />
            </Pressable>
          </View>
        )}
        <View style={styles.passportRow}>
          <Text style={styles.passportLabel}>Дней на стадии</Text>
          <Text style={styles.passportValue}>{daysInStage}</Text>
        </View>
      </View>

      <View style={[appStyles.surfacePanel, styles.passportPanel]}>
        <Text style={styles.passportSectionTitle}>Размещение</Text>
        <View style={[styles.passportRow, styles.passportRowFirst]}>
          <Text style={styles.passportLabel}>Местоположение</Text>
          <Text style={styles.passportValue}>{getCardLocationDescription(card) || 'Не указано'}</Text>
        </View>
      </View>

      {!!card.parentCardId && (
        <View style={[appStyles.surfacePanel, styles.passportPanel]}>
          <Text style={styles.passportSectionTitle}>Происхождение</Text>
          <View style={[styles.passportRow, styles.passportRowFirst]}>
            <Text style={styles.passportLabel}>Тип партии</Text>
            <Text style={styles.passportValue}>Клон</Text>
          </View>
          <View style={styles.passportRow}>
            <Text style={styles.passportLabel}>Родительская партия</Text>
            <Text style={styles.passportValue}>
              {card.parentCode || 'Не указана'}
            </Text>
            {!!parentCard && (
              <Pressable
                accessibilityLabel={`Перейти к родительской партии ${card.parentCode || ''}`}
                accessibilityRole="button"
                onPress={() => onOpenRelatedCard?.(parentCard)}
                style={({ pressed }) => [
                  styles.relatedCardButton,
                  pressed && appStyles.linkButtonPressed,
                ]}
              >
                <Text style={styles.relatedCardButtonText}>Перейти к родительской партии</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.passportRow}>
            <Text style={styles.passportLabel}>Поколение</Text>
            <Text style={styles.passportValue}>{card.generation || 1}</Text>
          </View>
          {card.originType !== 'cloned' && (
            <View style={styles.passportRow}>
              <Text style={styles.passportLabel}>Происхождение</Text>
              <Text style={styles.passportValue}>{originTypeLabel}</Text>
            </View>
          )}
          {!!card.propagationMethod && (
            <View style={styles.passportRow}>
              <Text style={styles.passportLabel}>Способ размножения</Text>
              <Text style={styles.passportValue}>{card.propagationMethod}</Text>
            </View>
          )}
          {!!card.isolationStatus && (
            <View style={styles.passportRow}>
              <Text style={styles.passportLabel}>Статус изоляции</Text>
              <Text style={styles.passportValue}>
                {card.isolationStatus === 'released' ? 'Выпущена из изоляции' : 'Изолирована'}
              </Text>
            </View>
          )}
          {!!card.propagatedAt && (
            <View style={styles.passportRow}>
              <Text style={styles.passportLabel}>Дата размножения</Text>
              <Text style={styles.passportValue}>{formatDisplayDate(card.propagatedAt)}</Text>
            </View>
          )}
        </View>
      )}

      {childCards.length > 0 && (
        <View style={[appStyles.surfacePanel, styles.passportPanel]}>
          <Text style={styles.passportSectionTitle}>Дочерние партии</Text>
          {childCards.map((childCard, index) => (
            <View
              key={childCard.id}
              style={[styles.passportRow, index === 0 && styles.passportRowFirst]}
            >
              <Text style={styles.passportLabel}>{childCard.code || 'Без кода'}</Text>
              <Text style={styles.passportValue}>
                {formatQuantityDisplay(getCardCurrentQuantity(childCard), childCard.quantity)}
              </Text>
              <Pressable
                accessibilityLabel={`Перейти к дочерней партии ${childCard.code || ''}`}
                accessibilityRole="button"
                onPress={() => onOpenRelatedCard?.(childCard)}
                style={({ pressed }) => [
                  styles.relatedCardButton,
                  pressed && appStyles.linkButtonPressed,
                ]}
              >
                <Text style={styles.relatedCardButtonText}>Перейти к дочерней партии</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View style={[appStyles.surfacePanel, styles.passportPanel]}>
        <Text style={styles.passportSectionTitle}>Культура</Text>
        <View style={[styles.passportRow, styles.passportRowFirst]}>
          <Text style={styles.passportLabel}>Культура</Text>
          <Text style={styles.passportValue}>{card.cultureName}</Text>
        </View>
        <View style={styles.passportRow}>
          <Text style={styles.passportLabel}>Вид</Text>
          <Text style={styles.passportValue}>{card.speciesName}</Text>
        </View>
        <View style={styles.passportRow}>
          <Text style={styles.passportLabel}>Сорт</Text>
          <Text style={styles.passportValue}>{card.varietyName}</Text>
        </View>
        {card.stage === INTRO_STAGE && (
          <>
            <View style={styles.passportRow}>
              <Text style={styles.passportLabel}>Гормон</Text>
              <Text style={styles.passportValue}>{card.hasHormone ? 'Есть' : 'Нет'}</Text>
            </View>
            <View style={styles.passportRow}>
              <Text style={styles.passportLabel}>Источник материала</Text>
              <Text style={styles.passportValue}>{card.sourceMaterial || 'Не указан'}</Text>
            </View>
          </>
        )}
      </View>

      <View style={[appStyles.surfacePanel, styles.passportPanel]}>
        <Text style={styles.passportSectionTitle}>История</Text>
        <View style={[styles.passportRow, styles.passportRowFirst]}>
          <Text style={styles.passportLabel}>Дата создания</Text>
          <Text style={styles.passportValue}>{formatDisplayDate(card.createdAt)}</Text>
        </View>
        <View style={styles.passportRow}>
          <Text style={styles.passportLabel}>Код партии</Text>
          <Text style={styles.passportValue}>{card.code}</Text>
        </View>
        {!!card.stageChangedAt && (
          <View style={styles.passportRow}>
            <Text style={styles.passportLabel}>Дата перехода в стадию {card.stage}</Text>
            <Text style={styles.passportValue}>{formatDisplayDate(card.stageChangedAt)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  passportBlocks: {
    gap: 14,
  },
  passportPanel: {
    gap: 10,
    padding: 16,
  },
  passportLabel: {
    color: '#66756B',
    fontSize: 14,
    lineHeight: 19,
  },
  passportRow: {
    borderTopColor: '#E6EDE7',
    borderTopWidth: 1,
    gap: 3,
    paddingTop: 8,
  },
  passportQrRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopColor: '#E6EDE7',
    borderTopWidth: 1,
  },
  passportQrTextBlock: {
    flex: 1,
    gap: 3,
  },
  passportRowFirst: {
    borderTopWidth: 0,
    paddingTop: 0,
  },
  passportSectionTitle: {
    color: '#15863F',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
    marginBottom: 2,
  },
  passportValue: {
    color: '#1B3023',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
  },
  relatedCardButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#15863F',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 38,
    paddingHorizontal: 14,
  },
  relatedCardButtonText: {
    color: '#15863F',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },
  passportQrAction: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    padding: 0,
    width: 40,
  },
});
