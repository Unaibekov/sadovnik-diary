import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import appStyles from '../../styles';
import { getMonthTitle, isoFromDate } from '../domain/dates';

const weekDayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const stripDayStep = 44;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function StageCalendar({
  days,
  month,
  operationDates,
  selectedDate,
  onChangeMonth,
  onSelectDate,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const stripScrollRef = useRef(null);
  const currentMonthDays = useMemo(
    () => days.filter((date) => (
      date.getFullYear() === month.getFullYear() &&
      date.getMonth() === month.getMonth()
    )),
    [days, month]
  );
  const currentMonthIsoDays = useMemo(
    () => currentMonthDays.map((date) => isoFromDate(date)),
    [currentMonthDays]
  );
  const latestOperationDate = useMemo(
    () => [...operationDates]
      .filter((isoDate) => currentMonthIsoDays.includes(isoDate))
      .sort()
      .at(-1) || '',
    [currentMonthIsoDays, operationDates]
  );
  const todayIsoDate = isoFromDate(new Date());
  const focusedStripDate = currentMonthIsoDays.includes(selectedDate)
    ? selectedDate
    : latestOperationDate || (currentMonthIsoDays.includes(todayIsoDate) ? todayIsoDate : '');

  useEffect(() => {
    if (isExpanded || !focusedStripDate) {
      return;
    }

    const focusedIndex = currentMonthIsoDays.indexOf(focusedStripDate);

    if (focusedIndex < 0) {
      return;
    }

    stripScrollRef.current?.scrollTo({
      animated: true,
      x: Math.max((focusedIndex - 2) * stripDayStep, 0),
    });
  }, [currentMonthIsoDays, focusedStripDate, isExpanded]);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((value) => !value);
  };

  return (
    <View style={[appStyles.surfacePanel, styles.calendarPanel]}>
      <View style={styles.monthBar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onChangeMonth(-1)}
          style={({ pressed }) => [
            styles.monthButton,
            pressed && appStyles.linkButtonPressed,
          ]}
        >
          <Text style={styles.monthButtonText}>{'‹'}</Text>
        </Pressable>

        <Text style={styles.monthTitle}>{getMonthTitle(month)}</Text>

        <Pressable
          accessibilityRole="button"
          onPress={toggleExpanded}
          style={({ pressed }) => [
            styles.expandButton,
            pressed && appStyles.linkButtonPressed,
          ]}
        >
          <Text style={styles.expandButtonText}>
            {isExpanded ? 'Лента' : 'Месяц'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => onChangeMonth(1)}
          style={({ pressed }) => [
            styles.monthButton,
            pressed && appStyles.linkButtonPressed,
          ]}
        >
          <Text style={styles.monthButtonText}>{'›'}</Text>
        </Pressable>
      </View>

      {isExpanded ? (
        <>
          <View style={styles.weekRow}>
            {weekDayLabels.map((dayName) => (
              <Text key={dayName} style={styles.weekDay}>{dayName}</Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {days.map((date, index) => {
              const isoDate = isoFromDate(date);
              const isCurrentMonth = date.getFullYear() === month.getFullYear() &&
                date.getMonth() === month.getMonth();
              const hasOperation = isCurrentMonth && operationDates.has(isoDate);
              const isSelected = isCurrentMonth && selectedDate === isoDate;
              const isToday = isCurrentMonth && isoDate === todayIsoDate;

              return (
                <Pressable
                  accessibilityRole="button"
                  disabled={!isCurrentMonth}
                  key={`${isoDate}-${index}`}
                  onPress={() => onSelectDate(isoDate)}
                  style={[
                    styles.dayCell,
                    !isCurrentMonth && styles.dayCellMuted,
                    isToday && styles.dayCellToday,
                    hasOperation && styles.dayCellMarked,
                    isSelected && styles.dayCellSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayCellText,
                      !isCurrentMonth && styles.dayCellTextMuted,
                      isToday && styles.dayCellTextToday,
                      (hasOperation || isSelected) && styles.dayCellTextMarked,
                      isSelected && styles.dayCellTextSelected,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : (
        <ScrollView
          contentContainerStyle={styles.dateStripContent}
          horizontal
          ref={stripScrollRef}
          showsHorizontalScrollIndicator={false}
          style={styles.dateStrip}
        >
          {currentMonthDays.map((date) => {
            const isoDate = isoFromDate(date);
            const hasOperation = operationDates.has(isoDate);
            const isSelected = selectedDate === isoDate;
            const isToday = isoDate === todayIsoDate;
            const dayName = weekDayLabels[(date.getDay() + 6) % 7];

            return (
              <Pressable
                accessibilityRole="button"
                key={isoDate}
                onPress={() => onSelectDate(isoDate)}
                style={[
                  styles.stripDayCell,
                  isToday && styles.dayCellToday,
                  hasOperation && styles.dayCellMarked,
                  isSelected && styles.dayCellSelected,
                ]}
              >
                <Text style={[
                  styles.stripDayName,
                  isToday && styles.dayCellTextToday,
                  (hasOperation || isSelected) && styles.dayCellTextMarked,
                  isSelected && styles.dayCellTextSelected,
                ]}>
                  {dayName}
                </Text>
                <Text
                  style={[
                    styles.stripDayText,
                    isToday && styles.dayCellTextToday,
                    (hasOperation || isSelected) && styles.dayCellTextMarked,
                    isSelected && styles.dayCellTextSelected,
                  ]}
                >
                  {date.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  calendarPanel: {
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  monthBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  monthButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F0',
    borderRadius: 13,
    borderWidth: 1,
    elevation: 1,
    height: 30,
    justifyContent: 'center',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    width: 30,
  },
  monthButtonText: {
    color: '#111827',
    fontSize: 21,
    fontWeight: '600',
    lineHeight: 23,
  },
  monthTitle: {
    color: '#111827',
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  expandButton: {
    alignItems: 'center',
    backgroundColor: '#15863F12',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 30,
    paddingHorizontal: 10,
  },
  expandButtonText: {
    color: '#15863F',
    fontSize: 12,
    fontWeight: '800',
  },
  dateStrip: {
    marginHorizontal: -9,
  },
  dateStripContent: {
    gap: 6,
    paddingHorizontal: 9,
  },
  stripDayCell: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    minWidth: 38,
    paddingHorizontal: 8,
  },
  stripDayName: {
    color: '#5F6B7A',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 12,
  },
  stripDayText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  weekDay: {
    color: '#5F6B7A',
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 1,
  },
  dayCell: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: 'center',
    width: '13.2%',
  },
  dayCellMuted: {
    opacity: 1,
  },
  dayCellMarked: {
    backgroundColor: '#15863F14',
    borderColor: '#15863F4D',
  },
  dayCellToday: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  dayCellSelected: {
    backgroundColor: '#15863F',
    borderColor: '#15863F',
  },
  dayCellText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '500',
  },
  dayCellTextMarked: {
    color: '#111827',
    fontWeight: '700',
  },
  dayCellTextToday: {
    color: '#374151',
    fontWeight: '800',
  },
  dayCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayCellTextMuted: {
    color: '#B4BCC8',
    fontWeight: '500',
  },
});
