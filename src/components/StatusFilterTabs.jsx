// Вкладки фильтрации карточек по статусу.
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import appStyles from '../../styles';

export default function StatusFilterTabs({
  activeValue,
  countsByValue = {},
  items,
  onChange,
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
        const count = countsByValue[value];

        return (
          <Pressable
            accessibilityRole="button"
            key={value}
            onPress={() => onChange(value)}
            style={[
              styles.filterButton,
              typeof count === 'number' && styles.filterButtonWithCount,
              isActive && appStyles.filterButtonActive,
            ]}
            >
              <Text
                style={[
                  appStyles.filterButtonText,
                  isActive && appStyles.filterButtonTextActive,
                ]}
              >
                {label}
              </Text>
              {typeof count === 'number' && (
                <View
                  style={[
                    styles.countPill,
                    isActive ? styles.countPillActive : styles.countPillInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      isActive ? styles.countTextActive : styles.countTextInactive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
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
    paddingBottom: 0,
    paddingHorizontal: 16,
  },
  filterButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 13,
    position: 'relative',
  },
  filterButtonWithCount: {
    paddingRight: 7,
  },
  countPill: {
    alignItems: 'center',
    borderRadius: 999,
    height: 22,
    justifyContent: 'center',
    minWidth: 22,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  countPillInactive: {
    backgroundColor: '#EAF4EE',
  },
  countPillActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    textAlign: 'center',
  },
  countTextInactive: {
    color: '#15863F',
  },
  countTextActive: {
    color: '#FFFFFF',
  },
});
