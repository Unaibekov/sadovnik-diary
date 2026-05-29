import { Pressable, StyleSheet, Text, View } from 'react-native';
import appStyles from '../../styles';

const calendarTabs = [
  ['calendar', 'Календарь'],
  ['passport', 'Паспорт'],
  ['journal', 'Журнал'],
];

export default function CalendarTabs({ activeTab, onChangeTab }) {
  return (
    <View style={appStyles.calendarPinnedContent}>
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
    shadowColor: '#102015',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  calendarTab: {
    alignItems: 'center',
    borderRadius: 999,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  calendarTabActive: {
    backgroundColor: '#15863F',
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
});
