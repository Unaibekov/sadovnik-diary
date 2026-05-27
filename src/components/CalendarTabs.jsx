import { Pressable, Text, View } from 'react-native';
import styles from '../../styles';

const calendarTabs = [
  ['calendar', 'Календарь'],
  ['passport', 'Паспорт серии'],
  ['journal', 'Журнал'],
];

export default function CalendarTabs({ activeTab, onChangeTab }) {
  return (
    <View style={styles.calendarPinnedContent}>
      <View style={styles.calendarTabs}>
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
                pressed && styles.linkButtonPressed,
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
