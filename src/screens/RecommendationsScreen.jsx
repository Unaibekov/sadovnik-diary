// Экран рекомендаций по уходу и действиям.
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import appStyles from '../../styles';
import StageHeader from '../components/StageHeader';

export default function RecommendationsScreen({
  entries,
  mode = 'current',
  onBack,
  onChangeMode,
  showModeSwitch = false,
  stage,
  title = 'Рекомендации',
}) {
  const visibleEntries = mode === 'all'
    ? entries.filter((entry) => entry.items.length > 0)
    : entries;

  return (
    <SafeAreaView style={appStyles.safeArea}>
      <StatusBar style="dark" />
      <View style={appStyles.fixedCardsScreen}>
        <StageHeader
          onBack={onBack}
          subtitle={<Text style={appStyles.stageHeaderSubtitle}>{stage}</Text>}
          title={title}
        />

        <View style={styles.recommendationsHeader}>
          {showModeSwitch && (
            <View style={styles.recommendationModeRow}>
              {[
                ['current', 'Текущая стадия'],
                ['all', 'Все стадии'],
              ].map(([value, label]) => (
                <Pressable
                  accessibilityRole="button"
                  key={value}
                  onPress={() => onChangeMode(value)}
                  style={[
                    styles.recommendationModeButton,
                    mode === value && styles.recommendationModeButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.recommendationModeButtonText,
                      mode === value && styles.recommendationModeButtonTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

        </View>

        <ScrollView contentContainerStyle={styles.recommendationsScrollContent}>
          <View style={styles.recommendationsList}>
            {visibleEntries.length === 0 && (
              <View style={appStyles.emptyState}>
                <Text style={appStyles.emptyStateText}>
                  {mode === 'all'
                    ? 'Для этого растения пока нет рекомендаций.'
                    : 'Для этой стадии пока нет рекомендаций.'}
                </Text>
              </View>
            )}

            {visibleEntries.map((entry) => (
              <View key={entry.key} style={[appStyles.surfacePanel, styles.recommendationCard]}>
                <Text style={styles.recommendationCardTitle}>{entry.title}</Text>

                {entry.items.length === 0 ? (
                  <Text style={styles.recommendationEmptyText}>
                    В каталоге нет рекомендаций для этого растения.
                  </Text>
                ) : (
                  <View style={styles.recommendationItemList}>
                    {entry.items.map((item) => (
                      <View key={`${entry.key}-${item.label}`} style={styles.recommendationItem}>
                        <Text style={styles.recommendationItemLabel}>{item.label}</Text>
                        <Text style={styles.recommendationItemValue}>{item.value}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  recommendationCard: {
    gap: 14,
    padding: 16,
  },
  recommendationCardTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  recommendationEmptyText: {
    color: '#65756B',
    fontSize: 14,
    lineHeight: 20,
  },
  recommendationItem: {
    gap: 4,
    paddingVertical: 8,
  },
  recommendationItemLabel: {
    color: '#15863F',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  recommendationItemList: {
    gap: 2,
  },
  recommendationItemValue: {
    color: '#17251C',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  recommendationModeButton: {
    alignItems: 'center',
    borderRadius: 999,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 12,
  },
  recommendationModeButtonActive: {
    backgroundColor: '#15863F',
  },
  recommendationModeButtonText: {
    color: '#6B716D',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
  },
  recommendationModeButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  recommendationModeRow: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7E5',
    borderRadius: 40,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 14,
    padding: 4,
  },
  recommendationsHeader: {
    flexShrink: 0,
    paddingHorizontal: 16,
  },
  recommendationsScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  recommendationsList: {
    gap: 14,
  },
});
