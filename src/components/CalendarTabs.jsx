// Вкладки переключения режимов календаря.
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import appStyles from '../../styles';

const calendarTabs = [
  ['calendar', 'Календарь'],
  ['passport', 'Паспорт'],
  ['journal', 'Журнал'],
];

export default function CalendarTabs({ activeTab, onChangeTab }) {
  const [tabBarWidth, setTabBarWidth] = useState(0);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const activeIndex = Math.max(
    0,
    calendarTabs.findIndex(([value]) => value === activeTab),
  );
  const tabWidth = tabBarWidth > 0 ? tabBarWidth / calendarTabs.length : 0;
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
    <View style={appStyles.calendarPinnedContent}>
      <View
        onLayout={(event) => setTabBarWidth(event.nativeEvent.layout.width)}
        style={styles.calendarTabs}
      >
        {tabWidth > 0 && (
          <Animated.View
            style={[
              styles.calendarTabIndicator,
              {
                pointerEvents: 'none',
                width: tabWidth - 8,
                transform: [{ translateX: indicatorX }],
              },
            ]}
          />
        )}
        {calendarTabs.map(([value, label]) => {
          const isActive = activeTab === value;

          return (
            <Pressable
              accessibilityRole="button"
              key={value}
              onPress={() => onChangeTab(value)}
              style={({ pressed }) => [
                styles.calendarTab,
                isActive && styles.calendarTabActive,
                pressed && appStyles.linkButtonPressed,
              ]}
            >
              <Text style={[
                styles.calendarTabText,
                isActive && styles.calendarTabTextActive,
              ]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  calendarTabs: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7E5',
    borderRadius: 40,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 0,
    marginBottom: 0,
    padding: 4,
    position: 'relative',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 6px rgba(16, 32, 21, 0.06)',
      },
      default: {
        shadowColor: '#102015',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
    }),
  },
  calendarTab: {
    alignItems: 'center',
    borderRadius: 999,
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  calendarTabActive: {
  },
  calendarTabText: {
    color: '#6B716D',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  calendarTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  calendarTabIndicator: {
    backgroundColor: '#15863F',
    borderRadius: 999,
    bottom: 3,
    left: 4,
    position: 'absolute',
    top: 3,
  },
});
