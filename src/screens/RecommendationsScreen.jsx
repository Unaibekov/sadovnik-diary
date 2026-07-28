// Экран рекомендаций по уходу и действиям.
import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import appStyles from '../../styles';
import StageHeader from '../components/StageHeader';

const recommendationTabs = [
  ['current', 'Текущая стадия'],
  ['all', 'Все стадии'],
];

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
  const emptyStageLabel = stage || 'этой стадии';
  const [tabBarWidth, setTabBarWidth] = useState(0);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const activeIndex = Math.max(
    0,
    recommendationTabs.findIndex(([value]) => value === mode),
  );
  const tabWidth = tabBarWidth > 0 ? tabBarWidth / recommendationTabs.length : 0;
  const supportsNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    if (!tabWidth) {
      return;
    }

    Animated.timing(indicatorX, {
      duration: 220,
      toValue: activeIndex * tabWidth,
      useNativeDriver: supportsNativeDriver,
    }).start();
  }, [activeIndex, indicatorX, supportsNativeDriver, tabWidth]);

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
            <View
              onLayout={(event) => setTabBarWidth(event.nativeEvent.layout.width)}
              style={styles.recommendationTabs}
            >
              {tabWidth > 0 && (
                <Animated.View
                  style={[
                    styles.recommendationTabIndicator,
                    {
                      pointerEvents: 'none',
                      width: tabWidth - 8,
                      transform: [{ translateX: indicatorX }],
                    },
                  ]}
                />
              )}
              {recommendationTabs.map(([value, label]) => {
                const isActive = mode === value;

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={value}
                    onPress={() => onChangeMode(value)}
                    style={({ pressed }) => [
                      styles.recommendationTab,
                      isActive && styles.recommendationTabActive,
                      pressed && appStyles.linkButtonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.recommendationTabText,
                        isActive && styles.recommendationTabTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.recommendationsScrollContent}>
          <View style={styles.recommendationsList}>
            {visibleEntries.length === 0 && (
              <View style={appStyles.emptyState}>
                <Text style={appStyles.emptyStateText}>
                  {mode === 'all'
                    ? 'Для этого растения пока нет рекомендаций по стадиям.'
                    : `Для стадии «${emptyStageLabel}» пока нет рекомендаций.`}
                </Text>
              </View>
            )}

            {visibleEntries.map((entry) => (
              <View key={entry.key} style={[appStyles.surfacePanel, styles.recommendationCard]}>
                <Text style={styles.recommendationCardTitle}>
                  {mode === 'current' ? (stage || entry.title) : entry.title}
                </Text>

                {entry.items.length === 0 ? (
                  <Text style={styles.recommendationEmptyText}>
                    {'Для стадии «'}
                    {mode === 'all' ? entry.title : emptyStageLabel}
                    {'» в каталоге нет рекомендаций для этого растения.'}
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
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
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
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 19,
  },
  recommendationItemList: {
    gap: 2,
  },
  recommendationItemValue: {
    color: '#17251C',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
  },
  recommendationTabs: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7E5',
    borderRadius: 40,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 14,
    padding: 4,
    position: 'relative',
    shadowColor: '#102015',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  recommendationTab: {
    alignItems: 'center',
    borderRadius: 999,
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  recommendationTabActive: {},
  recommendationTabText: {
    color: '#6B716D',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  recommendationTabTextActive: {
    color: '#FFFFFF',
  },
  recommendationTabIndicator: {
    backgroundColor: '#15863F',
    borderRadius: 999,
    bottom: 3,
    left: 4,
    position: 'absolute',
    top: 3,
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
