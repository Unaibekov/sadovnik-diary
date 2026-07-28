import { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import plantsCatalog from '../../data/plantsCatalog';
import styles from '../../styles';
import BottomTabBar from '../components/BottomTabBar';
import StageHeader from '../components/StageHeader';

function getPlantTitle(plant) {
  return plant.originalName || [
    plant.cultureName,
    plant.speciesName,
    plant.varietyName,
  ]
    .filter(Boolean)
    .join(' · ');
}

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

function getSectionKey(plant) {
  const title = getPlantTitle(plant).trim();
  const firstChar = title[0] || '#';
  const normalized = firstChar.toLocaleUpperCase('ru-RU');
  return /[A-ZА-ЯЁ0-9]/i.test(normalized) ? normalized : '#';
}

export default function PlantCatalogScreen({
  bottomInset = 0,
  onBack,
  onHomePress,
  onJournalPress,
  onMenuPress,
  onScanPress,
  onTasksPress,
  taskCount = 0,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPlantKey, setExpandedPlantKey] = useState(null);
  const scrollViewRef = useRef(null);
  const sectionOffsetsRef = useRef(new Map());
  const pendingScrollKeyRef = useRef(null);

  const filteredPlants = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    if (!normalizedSearchTerm) {
      return plantsCatalog;
    }

    return plantsCatalog.filter((plant) =>
      getSearchText(plant).includes(normalizedSearchTerm),
    );
  }, [searchTerm]);

  const sections = useMemo(() => {
    const grouped = new Map();

    filteredPlants.forEach((plant) => {
      const sectionKey = getSectionKey(plant);
      const nextGroup = grouped.get(sectionKey) || [];
      nextGroup.push(plant);
      grouped.set(sectionKey, nextGroup);
    });

    return Array.from(grouped.entries())
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey, 'ru'))
      .map(([title, data]) => ({
        title,
        data: data.sort((left, right) =>
          getPlantTitle(left).localeCompare(getPlantTitle(right), 'ru'),
        ),
      }));
  }, [filteredPlants]);

  useEffect(() => {
    sectionOffsetsRef.current = new Map();
    pendingScrollKeyRef.current = null;
  }, [sections]);

  function getPlantKey(item, index) {
    return item.id || `${item.originalName || item.cultureName || item.speciesName || 'plant'}-${index}`;
  }

  function togglePlant(plantKey) {
    setExpandedPlantKey((currentKey) => (currentKey === plantKey ? null : plantKey));
  }

  function scrollToSection(sectionKey) {
    const offset = sectionOffsetsRef.current.get(sectionKey);

    if (typeof offset === 'number' && Number.isFinite(offset)) {
      scrollViewRef.current?.scrollTo?.({
        animated: true,
        y: Math.max(0, offset - 12),
      });
      pendingScrollKeyRef.current = null;
      return;
    }

    if (pendingScrollKeyRef.current === sectionKey) {
      return;
    }

    pendingScrollKeyRef.current = sectionKey;
    setTimeout(() => {
      pendingScrollKeyRef.current = null;
      scrollToSection(sectionKey);
    }, 60);
  }

  function renderPlantCard(item, section, index) {
    const plantKey = getPlantKey(item, index);
    const isExpanded = expandedPlantKey === plantKey;

    return (
      <Pressable
        accessibilityRole="button"
        key={plantKey}
        onPress={() => togglePlant(plantKey)}
        style={({ pressed }) => [
          localStyles.articleCard,
          isExpanded && localStyles.articleCardExpanded,
          pressed && styles.linkButtonPressed,
        ]}
      >
        <View style={localStyles.articleTopRow}>
          <View style={localStyles.articleTitleBlock}>
            <Text style={localStyles.articleTitle} numberOfLines={2}>
              {getPlantTitle(item)}
            </Text>
          </View>
          <View style={localStyles.articleMarker}>
            <Text style={localStyles.articleMarkerText}>
              {isExpanded ? '−' : '+'}
            </Text>
          </View>
        </View>

        {isExpanded && (
          <View style={localStyles.expandedBody}>
            <DetailBlock
              label="Клонирование"
              items={[
                { label: 'Температура', value: item.cloneTemperatureRequirement },
                { label: 'Освещение', value: item.cloneLightRequirement },
                {
                  label: 'Влажность',
                  value: item.cloneHumidityRange && `${item.cloneHumidityRange}%`,
                },
              ]}
            />
            <DetailBlock
              label="Адаптация"
              items={[
                { label: 'Температура', value: item.adaptationTemperatureRequirement },
                { label: 'Освещение', value: item.adaptationLightRequirement },
                { label: 'Влажность', value: item.adaptationHumidityRequirement },
              ]}
            />
            <DetailBlock
              label="Профилактика"
              items={[
                { label: 'Подкормки', value: item.preventionFertilizers },
                { label: 'Препараты', value: item.preventionChemicals },
                { label: 'Стимуляторы', value: item.preventionStimulators },
              ]}
            />
          </View>
        )}
      </Pressable>
    );
  }

  function renderSection(section) {
    return (
      <View
        key={section.title}
        onLayout={(event) => {
          const nextOffset = event?.nativeEvent?.layout?.y;
          if (typeof nextOffset === 'number' && Number.isFinite(nextOffset)) {
            sectionOffsetsRef.current.set(section.title, nextOffset);
          }
        }}
      >
        <View style={localStyles.sectionHeaderWrap}>
          <View style={localStyles.sectionHeaderRow}>
            <View style={localStyles.sectionLetterBadge}>
              <Text style={localStyles.sectionLetterText}>{section.title}</Text>
            </View>
            <View style={localStyles.sectionHeaderTextBlock}>
              <Text style={localStyles.sectionTitle}>Раздел {section.title}</Text>
              <Text style={localStyles.sectionMeta}>
                {section.data.length} {section.data.length === 1 ? 'запись' : 'записей'}
              </Text>
            </View>
          </View>
        </View>

        <View style={localStyles.sectionCards}>
          {section.data.map((item, index) => renderPlantCard(item, section, index))}
        </View>

        <View style={localStyles.sectionListGap} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={[styles.fixedCardsScreen, localStyles.screenShell]}>
        <StageHeader
          onBack={onBack}
          title="Справочники"
        />

        <View style={localStyles.tocBlock}>
          <View style={localStyles.tocHeaderRow}>
            <Text style={localStyles.tocTitle}>Оглавление</Text>
          </View>

          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setSearchTerm}
            placeholder="Поиск по библиотеке"
            placeholderTextColor="#9AA3AF"
            style={[styles.input, localStyles.searchInput]}
            value={searchTerm}
          />

          <ScrollView
            horizontal
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={localStyles.tocRow}
          >
            {sections.length > 0 ? (
              sections.map((section) => (
                <Pressable
                  accessibilityRole="button"
                  key={section.title}
                  onPress={() => scrollToSection(section.title)}
                  style={({ pressed }) => [
                    localStyles.tocChip,
                    pressed && styles.linkButtonPressed,
                  ]}
                >
                  <Text style={localStyles.tocChipTitle}>{section.title}</Text>
                  <Text style={localStyles.tocChipCount}>{section.data.length}</Text>
                </Pressable>
              ))
            ) : (
              <View style={localStyles.tocEmpty}>
                <Text style={localStyles.tocEmptyText}>Ничего не найдено</Text>
              </View>
            )}
          </ScrollView>
        </View>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            localStyles.listContent,
            { paddingBottom: 126 + bottomInset },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {sections.length === 0 ? (
            <View style={localStyles.emptyState}>
              <Text style={localStyles.emptyTitle}>Ничего не найдено</Text>
              <Text style={localStyles.emptyText}>
                Попробуйте другое название культуры, вида или сорта.
              </Text>
            </View>
          ) : (
            sections.map((section) => renderSection(section))
          )}
        </ScrollView>
      </View>

      <BottomTabBar
        activeTab="menu"
        bottomInset={bottomInset}
        onHomePress={onHomePress}
        onJournalPress={onJournalPress}
        onMenuPress={onMenuPress}
        onScanPress={onScanPress}
        onTasksPress={onTasksPress}
        taskCount={taskCount}
      />
    </SafeAreaView>
  );
}

function DetailBlock({ label, items = [] }) {
  const visibleItems = items.filter((item) => Boolean(item?.value));

  return (
    <View style={localStyles.detailBlock}>
      <Text style={localStyles.detailLabel}>{label}</Text>
      {visibleItems.length > 0 ? (
        <View style={localStyles.detailList}>
          {visibleItems.map((item) => (
            <View key={`${label}-${item.label}`} style={localStyles.detailRow}>
              <Text style={localStyles.detailRowLabel}>{item.label}</Text>
              <Text style={localStyles.detailValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={localStyles.detailValue}>Нет данных</Text>
      )}
    </View>
  );
}

const localStyles = {
  articleCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCEBDD',
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 16,
    shadowColor: '#0E2F19',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  articleCardExpanded: {
    backgroundColor: '#FBFDFB',
    borderColor: '#BFDCC6',
  },
  articleMarker: {
    alignItems: 'center',
    backgroundColor: '#E8F6EE',
    borderRadius: 999,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  articleMarkerText: {
    color: '#15863F',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 22,
  },
  articleTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  articleTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  articleTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  detailBlock: {
    backgroundColor: '#F8FBF8',
    borderColor: '#E2EEE5',
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },
  detailLabel: {
    color: '#6A786F',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  detailList: {
    gap: 6,
  },
  detailRow: {
    gap: 2,
  },
  detailRowLabel: {
    color: '#4B5A51',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.1,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: '#111827',
    fontSize: 13,
    lineHeight: 19,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#F8FBF8',
    borderColor: '#E1EBE3',
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  emptyText: {
    color: '#647569',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  expandedBody: {
    gap: 10,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  screenShell: {
    backgroundColor: 'transparent',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E3EAE4',
    borderRadius: 999,
    borderWidth: 1,
    flex: 0,
    height: 44,
    paddingHorizontal: 16,
    minHeight: 44,
    paddingVertical: 8,
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  sectionHeaderTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  sectionHeaderWrap: {
    paddingBottom: 10,
    paddingTop: 12,
  },
  sectionCards: {
    gap: 12,
  },
  sectionLetterBadge: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  sectionLetterText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  sectionListGap: {
    height: 12,
  },
  sectionMeta: {
    color: '#6A786F',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 2,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  tocBlock: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0EAE1',
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    marginBottom: 12,
    marginHorizontal: 16,
    marginTop: 0,
    paddingTop: 14,
    padding: 14,
    zIndex: 1,
    elevation: 2,
  },
  tocChip: {
    alignItems: 'center',
    backgroundColor: '#F7FAF7',
    borderColor: '#E2EEE5',
    borderRadius: 16,
    borderWidth: 1,
    gap: 2,
    justifyContent: 'center',
    minHeight: 54,
    minWidth: 54,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  tocChipCount: {
    color: '#6A786F',
    fontSize: 11,
    fontWeight: '700',
  },
  tocChipTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 19,
  },
  tocEmpty: {
    alignItems: 'center',
    backgroundColor: '#F8FBF8',
    borderColor: '#E2EEE5',
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 14,
  },
  tocEmptyText: {
    color: '#647569',
    fontSize: 13,
    fontWeight: '700',
  },
  tocHeaderRow: {
    gap: 0,
  },
  tocRow: {
    flexDirection: 'row',
    flexGrow: 1,
    gap: 8,
    paddingBottom: 2,
    paddingRight: 4,
  },
  tocTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
};



