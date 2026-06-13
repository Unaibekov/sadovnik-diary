// Вкладка паспорта культуры с основными данными.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import appStyles from '../../styles';
import { DownloadSquareIcon } from './icons';
import { BATCH_STATUS_LABELS, INTRO_STAGE, QR_STATUS_LABELS, stages } from '../domain/constants';
import { formatDisplayDate } from '../domain/dates';
import { formatQuantityDisplay, getCardLocationDescription, getQrStatus } from '../domain/batch';

export default function CulturePassportTab({
  adaptationStats,
  card,
  cloneStats,
  currentQuantity,
  daysInStage,
  hardeningStats,
  plantingStats,
  getResolvedBatchStatus,
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
  const batchStatus = getResolvedBatchStatus(card);

  return (
    <View style={styles.passportBlocks}>
      <View style={[appStyles.surfacePanel, styles.passportPanel]}>
        <Text style={styles.passportSectionTitle}>Сводка</Text>
        <View style={[styles.passportRow, styles.passportRowFirst]}>
          <Text style={styles.passportLabel}>Статус партии</Text>
          <Text style={styles.passportValue}>
            {BATCH_STATUS_LABELS[batchStatus] || batchStatus || 'Активная'}
          </Text>
        </View>
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
          <Text style={styles.passportLabel}>Остаток</Text>
          <Text style={styles.passportValue}>
            {formatQuantityDisplay(currentQuantity, card.quantity)}
          </Text>
        </View>
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
        {card.stage === INTRO_STAGE && (
          <View style={styles.passportQrRow}>
            <View style={styles.passportQrTextBlock}>
              <Text style={styles.passportLabel}>QR</Text>
              <Text ellipsizeMode="tail" numberOfLines={1} style={styles.passportValue}>
                {QR_STATUS_LABELS[getQrStatus(card)] || getQrStatus(card)}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Поделиться QR-кодом"
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
