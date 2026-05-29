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
  return (
    <SafeAreaView style={appStyles.safeArea}>
      <StatusBar style="dark" />
      <View style={appStyles.fixedCardsScreen}>
        <StageHeader
          onBack={onBack}
          subtitle={<Text style={appStyles.stageHeaderSubtitle}>{stage}</Text>}
          title="Рекомендации"
        />

        <ScrollView contentContainerStyle={appStyles.fixedCardsScrollContent}>
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
                  <Text style={[
                    styles.recommendationModeButtonText,
                    mode === value && styles.recommendationModeButtonTextActive,
                  ]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.recommendationsList}>
            {entries.length === 0 && (
              <View style={appStyles.emptyState}>
                <Text style={appStyles.emptyStateText}>
                  Для этой стадии пока нет рекомендаций.
                </Text>
              </View>
            )}

            {entries.map((entry) => (
              <View key={entry.key} style={[appStyles.surfacePanel, styles.recommendationCard]}>
                <Text style={styles.recommendationCardTitle}>{entry.title}</Text>
                {!!entry.subtitle && (
                  <Text style={styles.recommendationCardSubtitle}>{entry.subtitle}</Text>
                )}

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
    padding: 16,
  },
  recommendationCardSubtitle: {
    color: '#65756B',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
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
    marginTop: 12,
  },
  recommendationItem: {
    backgroundColor: '#F7FAF8',
    borderColor: '#E6ECE8',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  recommendationItemLabel: {
    color: '#15863F',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  recommendationItemList: {
    gap: 10,
    marginTop: 14,
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
  recommendationsList: {
    gap: 14,
  },
});
