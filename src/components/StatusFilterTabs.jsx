// Вкладки фильтрации карточек по статусу.
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import appStyles from '../../styles';

const statusDotColors = {
  active: '#15863F',
  quarantine: '#EF4444',
  partial: '#F59E0B',
  problem: '#EF4444',
  sold: '#2563EB',
  cancelled: '#9CA3AF',
};

export default function StatusFilterTabs({
  activeValue,
  count,
  countValue = 'all',
  items,
  onChange,
  showDots = true,
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.filterScrollContent}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterScroll}
    >
      {items.map(([value, label]) => {
        const isActive = activeValue === value;
        const hasCount = value === countValue && typeof count === 'number';
        const dotColor = showDots && !isActive ? statusDotColors[value] : '';

        return (
          <Pressable
            accessibilityRole="button"
            key={value}
            onPress={() => onChange(value)}
            style={[
              styles.filterButton,
              hasCount && styles.filterButtonWithCount,
              isActive && appStyles.filterButtonActive,
            ]}
          >
            {!!dotColor && (
              <Text
                accessibilityLabel={`Цвет статуса ${label}`}
                style={[
                  styles.statusDot,
                  { backgroundColor: dotColor },
                ]}
              />
            )}

            <Text
              style={[
                appStyles.filterButtonText,
                isActive && appStyles.filterButtonTextActive,
              ]}
            >
              {label}
            </Text>

            {hasCount && (
              <Text
                style={[
                  styles.filterButtonCount,
                  isActive && styles.filterButtonCountActive,
                ]}
              >
                {count}
              </Text>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  filterScroll: {
    marginBottom: 0,
    marginHorizontal: -16,
  },
  filterScrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  filterButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F0',
    borderRadius: 999,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 13,
    position: 'relative',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  filterButtonWithCount: {
    minWidth: 78,
    paddingLeft: 16,
    paddingRight: 38,
  },
  statusDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  filterButtonCount: {
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
    height: 24,
    lineHeight: 16,
    minWidth: 24,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
    position: 'absolute',
    right: 5,
    textAlign: 'center',
    top: 5,
  },
  filterButtonCountActive: {
    backgroundColor: 'rgba(255,255,255,0.28)',
    color: '#FFFFFF',
  },
});
