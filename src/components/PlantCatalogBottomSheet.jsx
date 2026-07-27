// Нижняя панель каталога растений для выбора позиции.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import plantsCatalog from '../../data/plantsCatalog';
import styles from '../../styles';
import { LogoElementIcon } from './icons';

const SWIPE_CLOSE_DISTANCE = 80;
const ANIMATION_DURATION = 220;
const supportsNativeDriver = Platform.OS !== 'web';

function getSearchText(plant) {
  return [
    plant.originalName,
    plant.cultureName,
    plant.speciesName,
    plant.varietyName,
    plant.cloneTemperatureRequirement,
    plant.cloneLightRequirement,
    plant.cloneHumidityRange,
    plant.adaptationTemperatureRequirement,
    plant.adaptationLightRequirement,
    plant.adaptationHumidityRequirement,
    plant.preventionFertilizers,
    plant.preventionChemicals,
    plant.preventionStimulators,
    plant.adaptationPreventionItems,
  ]
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getPlantKey(plant) {
  return [
    plant.originalName,
    plant.cultureName,
    plant.speciesName,
    plant.varietyName,
  ]
    .filter(Boolean)
    .join('|');
}

function getPlantTitle(plant) {
  return plant.originalName || [
    plant.cultureName,
    plant.speciesName,
    plant.varietyName,
  ]
    .filter(Boolean)
    .join(' · ');
}

export default function PlantCatalogBottomSheet({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [isMounted, setIsMounted] = useState(visible);
  const [searchTerm, setSearchTerm] = useState('');

  const translateY = useRef(new Animated.Value(height)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);

  const openSheet = useCallback(() => {
    setIsMounted(true);
    isClosingRef.current = false;
    setSearchTerm('');

    translateY.setValue(height);
    backdropOpacity.setValue(0);

    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: supportsNativeDriver,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: supportsNativeDriver,
        }),
      ]).start();
    });
  }, [backdropOpacity, height, translateY]);

  const closeSheet = useCallback(() => {
    if (isClosingRef.current) {
      return;
    }

    isClosingRef.current = true;

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: height,
        duration: ANIMATION_DURATION,
        useNativeDriver: supportsNativeDriver,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: supportsNativeDriver,
      }),
    ]).start(() => {
      setIsMounted(false);
      isClosingRef.current = false;
      onClose?.();
    });
  }, [backdropOpacity, height, onClose, translateY]);

  useEffect(() => {
    if (visible) {
      openSheet();
    } else if (isMounted && !isClosingRef.current) {
      closeSheet();
    }
  }, [closeSheet, isMounted, openSheet, visible]);

  const filteredPlants = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    if (!normalizedSearchTerm) {
      return plantsCatalog;
    }

    return plantsCatalog.filter((plant) => getSearchText(plant).includes(normalizedSearchTerm));
  }, [searchTerm]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 8,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            translateY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > SWIPE_CLOSE_DISTANCE || gestureState.vy > 0.8) {
            closeSheet();
            return;
          }

          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: supportsNativeDriver,
          }).start();
        },
      }),
    [closeSheet, translateY],
  );

  if (!isMounted) {
    return null;
  }

  const normalizedSearchTerm = searchTerm.trim();

  return (
    <Modal animationType="none" onRequestClose={closeSheet} transparent visible={isMounted}>
      <View style={styles.bottomSheetRoot}>
        <Animated.View style={[styles.bottomSheetBackdrop, { opacity: backdropOpacity }]}>
          <Pressable accessibilityRole="button" onPress={closeSheet} style={{ flex: 1 }} />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <Animated.View
            style={[
              styles.bottomSheetPanel,
              {
                maxHeight: '92%',
                paddingBottom: insets.bottom + 16,
                transform: [{ translateY }],
              },
            ]}
          >
            <View {...panResponder.panHandlers}>
              <View style={styles.bottomSheetHandle} />
              <Text style={styles.bottomSheetTitle}>Справочник растений</Text>
            </View>

            <View style={localStyles.heroRow}>
              <View style={localStyles.heroIconWrap}>
                <LogoElementIcon color="#15863F" size={22} />
              </View>
              <View style={localStyles.heroTextBlock}>
                <Text style={localStyles.heroText} numberOfLines={2}>
                  Короткий каталог по культуре, виду, сорту и базовым рекомендациям.
                </Text>
                <Text style={localStyles.heroMeta}>
                  Всего: {plantsCatalog.length} · Найдено: {filteredPlants.length}
                </Text>
              </View>
            </View>

            <View style={localStyles.searchBox}>
              <Text style={localStyles.searchIcon}>{'\u2315'}</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setSearchTerm}
                placeholder="Поиск по каталогу"
                placeholderTextColor="#9AA3AF"
                style={[styles.input, localStyles.searchInput]}
                value={searchTerm}
              />
            </View>

            <Text style={localStyles.caption}>
              {normalizedSearchTerm
                ? `По запросу «${normalizedSearchTerm}»`
                : 'Весь локальный каталог'}
            </Text>

            <FlatList
              contentContainerStyle={localStyles.listContent}
              data={filteredPlants}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(item) => getPlantKey(item)}
              ListEmptyComponent={(
                <View style={localStyles.emptyState}>
                  <Text style={localStyles.emptyTitle}>Ничего не найдено</Text>
                  <Text style={localStyles.emptyText}>
                    Попробуйте другое название культуры, вида или сорта.
                  </Text>
                </View>
              )}
              renderItem={({ item }) => (
                <View style={localStyles.card}>
                  <Text style={localStyles.cardTitle} numberOfLines={2}>
                    {getPlantTitle(item)}
                  </Text>
                  <Text style={localStyles.cardSubtitle} numberOfLines={2}>
                    {[item.cultureName, item.speciesName, item.varietyName || 'без сорта']
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>

                  <View style={localStyles.metaRow}>
                    <View style={localStyles.metaBlock}>
                      <Text style={localStyles.metaLabel}>Клонирование</Text>
                      <LabeledValueList
                        emptyText="Нет данных"
                        items={[
                          { label: 'Температура', value: item.cloneTemperatureRequirement },
                          { label: 'Освещение', value: item.cloneLightRequirement },
                        ]}
                      />
                    </View>
                    <View style={localStyles.metaBlock}>
                      <Text style={localStyles.metaLabel}>Адаптация</Text>
                      <LabeledValueList
                        emptyText="Нет данных"
                        items={[
                          { label: 'Температура', value: item.adaptationTemperatureRequirement },
                          { label: 'Освещение', value: item.adaptationLightRequirement },
                        ]}
                      />
                    </View>
                  </View>

                  <View style={localStyles.recommendationBlock}>
                    <Text style={localStyles.recommendationLabel}>Профилактика</Text>
                    <LabeledValueList
                      emptyText="Нет данных"
                      items={[
                        { label: 'Подкормки', value: item.preventionFertilizers },
                        { label: 'Препараты', value: item.preventionChemicals },
                        { label: 'Стимуляторы', value: item.preventionStimulators },
                      ]}
                    />
                  </View>
                </View>
              )}
            />
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function LabeledValueList({ items = [], emptyText }) {
  const visibleItems = items.filter((item) => Boolean(item?.value));

  if (!visibleItems.length) {
    return <Text style={localStyles.metaValue}>{emptyText}</Text>;
  }

  return (
    <View style={localStyles.valueList}>
      {visibleItems.map((item) => (
        <View key={item.label} style={localStyles.valueRow}>
          <Text style={localStyles.valueLabel}>{item.label}</Text>
          <Text style={localStyles.metaValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

const localStyles = StyleSheet.create({
  caption: {
    color: '#6A786F',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 10,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E6EDE7',
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  cardSubtitle: {
    color: '#647569',
    fontSize: 13,
    lineHeight: 18,
  },
  cardTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#F7FAF8',
    borderColor: '#E2E8E3',
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  emptyText: {
    color: '#6B7A70',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroIconWrap: {
    alignItems: 'center',
    backgroundColor: '#EAF6EF',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  heroMeta: {
    color: '#6A786F',
    fontSize: 12,
    fontWeight: '700',
  },
  heroRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  heroText: {
    color: '#4F6056',
    fontSize: 13,
    lineHeight: 18,
  },
  heroTextBlock: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  listContent: {
    gap: 12,
    paddingBottom: 12,
  },
  metaBlock: {
    backgroundColor: '#F8FBF9',
    borderColor: '#E7EEE9',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    minWidth: 0,
    padding: 10,
  },
  metaLabel: {
    color: '#6A786F',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metaValue: {
    color: '#223027',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  valueLabel: {
    color: '#4B5A51',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.1,
    textTransform: 'uppercase',
  },
  valueList: {
    gap: 4,
  },
  valueRow: {
    gap: 1,
  },
  recommendationBlock: {
    backgroundColor: '#F4FAF6',
    borderColor: '#DDE9E1',
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    padding: 10,
  },
  recommendationLabel: {
    color: '#2B6B43',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: '#F7FAF8',
    borderColor: '#DCE7DE',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchIcon: {
    color: '#7A8B80',
    fontSize: 15,
    marginTop: -1,
  },
  searchInput: {
    color: '#111827',
    flex: 1,
    fontSize: 15,
    minWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
});
