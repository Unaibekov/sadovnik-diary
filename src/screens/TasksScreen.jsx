import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import appStyles from '../../styles';
import BottomTabBar from '../components/BottomTabBar';
import SelectBottomSheet from '../components/SelectBottomSheet';
import { ArrowBackIcon, FilterIcon } from '../components/icons';
import { formatDisplayDate } from '../domain/dates';
import { stages } from '../domain/constants';

const TASK_STATUS_META = {
  overdue: {
    accent: '#EF4444',
    badgeBackground: '#FFF1F0',
    badgeText: '#B42318',
    cardBackground: '#FFFFFF',
    cardTint: '#FFF7F5',
    label: 'Просрочено',
    titleForms: ['просроченная задача', 'просроченные задачи', 'просроченных задач'],
  },
  today: {
    accent: '#15863F',
    badgeBackground: '#E8F6EE',
    badgeText: '#15863F',
    cardBackground: '#FFFFFF',
    cardTint: '#F6FBF7',
    label: 'Сегодня',
    titleForms: ['задача на сегодня', 'задачи на сегодня', 'задач на сегодня'],
  },
  planned: {
    accent: '#64748B',
    badgeBackground: '#F3F4F6',
    badgeText: '#64748B',
    cardBackground: '#FFFFFF',
    cardTint: '#FAFAFB',
    label: 'Запланировано',
    titleForms: ['запланированная задача', 'запланированные задачи', 'запланированных задач'],
  },
};

const TASK_STAGE_FILTERS = [
  { key: 'all', label: 'Все стадии', stage: null },
  { key: 'adaptation', label: 'Адаптация', stage: stages[2] },
  { key: 'greenhouse', label: 'Теплица', stage: stages[3] },
];

const STAGE_SHORT_LABELS = TASK_STAGE_FILTERS.reduce((accumulator, filter) => {
  if (filter.stage) {
    accumulator[filter.stage] = filter.label;
  }
  return accumulator;
}, {});

function pluralize(count, one, few, many) {
  const value = Math.abs(count) % 100;
  const lastDigit = value % 10;

  if (value > 10 && value < 20) {
    return many;
  }

  if (lastDigit > 1 && lastDigit < 5) {
    return few;
  }

  if (lastDigit === 1) {
    return one;
  }

  return many;
}

function getTaskStatusKey(task) {
  if (task.isOverdue) {
    return 'overdue';
  }

  if (task.isDueToday) {
    return 'today';
  }

  return 'planned';
}

function getTaskStatusCounts(tasks) {
  return tasks.reduce(
    (counts, task) => {
      counts[getTaskStatusKey(task)] += 1;
      return counts;
    },
    { overdue: 0, today: 0, planned: 0 },
  );
}

function getDefaultTaskStatusFilter(tasks) {
  const counts = getTaskStatusCounts(tasks);

  if (counts.overdue > 0) {
    return 'overdue';
  }

  if (counts.today > 0) {
    return 'today';
  }

  return 'all';
}

function getTaskSummaryCards(tasks, taskStatusCounts) {
  return [
    {
      accent: '#111827',
      badge: 'Всего',
      count: tasks.length,
      key: 'all',
      label: 'Все задачи',
      tone: 'all',
    },
    {
      accent: '#EF4444',
      badge: 'Срочно',
      count: taskStatusCounts.overdue,
      key: 'overdue',
      label: 'Просрочено',
      tone: 'overdue',
    },
    {
      accent: '#15863F',
      badge: 'Сегодня',
      count: taskStatusCounts.today,
      key: 'today',
      label: 'Сегодня',
      tone: 'today',
    },
    {
      accent: '#64748B',
      badge: 'План',
      count: taskStatusCounts.planned,
      key: 'planned',
      label: 'Запланировано',
      tone: 'planned',
    },
  ];
}

function getStageKeyForTask(stage) {
  if (!stage) {
    return 'all';
  }

  const matchedFilter = TASK_STAGE_FILTERS.find((filter) => filter.stage === stage);
  return matchedFilter?.key || 'all';
}

function getStageLabel(stage) {
  return STAGE_SHORT_LABELS[stage] || stage || 'Стадия';
}

function getTaskListTitle(stageFilterKey, count) {
  const stageFilter = TASK_STAGE_FILTERS.find((filter) => filter.key === stageFilterKey);
  const stageLabel = stageFilterKey === 'all' ? 'Все задачи' : (stageFilter?.label || 'Все задачи');

  return {
    countLabel: `${count}`,
    title: stageLabel,
  };
}

function getTaskRowMeta(task) {
  if (task.isOverdue) {
    return `${task.daysOverdue > 0 ? `${task.daysOverdue} дн. проср.` : 'Просрочено'}`;
  }

  if (task.isDueToday) {
    return 'Сегодня';
  }

  return formatDisplayDate(task.nextDate);
}

function groupTasksByCard(tasks) {
  const groups = [];
  const groupIndex = new Map();

  tasks.forEach((task) => {
    const currentGroup = groupIndex.get(task.cardId);

    if (currentGroup) {
      currentGroup.tasks.push(task);
      return;
    }

    const nextGroup = {
      cardId: task.cardId,
      cardName: task.cardName,
      code: task.code,
      currentQuantity: task.currentQuantity,
      stage: task.stage,
      tasks: [task],
    };

    groupIndex.set(task.cardId, nextGroup);
    groups.push(nextGroup);
  });

  return groups;
}

function matchesStageFilter(task, stageFilterKey) {
  if (stageFilterKey === 'all') {
    return true;
  }

  const stageFilter = TASK_STAGE_FILTERS.find((filter) => filter.key === stageFilterKey);
  return stageFilter ? task.stage === stageFilter.stage : true;
}

export default function TasksScreen({
  bottomInset = 0,
  onHomePress,
  onJournalPress,
  onMenuPress,
  onScanPress,
  onTaskPress,
  tasks = [],
}) {
  const [activeTaskStatusFilter, setActiveTaskStatusFilter] = useState(() => getDefaultTaskStatusFilter(tasks));
  const [activeTaskStageFilter, setActiveTaskStageFilter] = useState('all');
  const [isStageFilterSheetVisible, setIsStageFilterSheetVisible] = useState(false);
  const hasManualStatusFilterRef = useRef(false);

  const taskStatusCounts = getTaskStatusCounts(tasks);
  const stageFilteredTasks = tasks.filter((task) => matchesStageFilter(task, activeTaskStageFilter));
  const stageTaskStatusCounts = getTaskStatusCounts(stageFilteredTasks);
  const taskSummaryCards = getTaskSummaryCards(stageFilteredTasks, stageTaskStatusCounts);

  useEffect(() => {
    if (!hasManualStatusFilterRef.current) {
      setActiveTaskStatusFilter(getDefaultTaskStatusFilter(tasks));
    }
  }, [taskStatusCounts.overdue, taskStatusCounts.today, tasks]);

  const filteredTasks = tasks.filter(
    (task) => (activeTaskStatusFilter === 'all' || getTaskStatusKey(task) === activeTaskStatusFilter)
      && matchesStageFilter(task, activeTaskStageFilter),
  );
  const taskGroups = groupTasksByCard(filteredTasks);
  const filteredTaskCount = filteredTasks.length;
  const listTitle = getTaskListTitle(activeTaskStageFilter, filteredTaskCount);

  return (
    <SafeAreaView style={appStyles.safeArea}>
      <StatusBar style="dark" />
      <View style={localStyles.tasksScreen}>
        <View style={localStyles.tasksHeader}>
          <View style={localStyles.tasksHeaderRow}>
            <View style={localStyles.tasksHeaderTextBlock}>
              <Text style={localStyles.tasksPageTitle}>Задачи</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => setIsStageFilterSheetVisible(true)}
              style={({ pressed }) => [
                localStyles.headerFilterButton,
                pressed && appStyles.linkButtonPressed,
              ]}
            >
              <FilterIcon size={18} />
              <Text style={localStyles.headerFilterButtonText}>Фильтр</Text>
            </Pressable>
          </View>
        </View>

        <View style={localStyles.summaryGrid}>
          {taskSummaryCards.map((item) => {
            const isActive = activeTaskStatusFilter === item.key;

            return (
              <Pressable
                accessibilityRole="button"
                key={item.key}
                onPress={() => {
                  hasManualStatusFilterRef.current = true;
                  setActiveTaskStatusFilter(item.key);
                }}
                style={({ pressed }) => [
                  localStyles.summaryCard,
                  localStyles[`summaryCard${item.tone[0].toUpperCase()}${item.tone.slice(1)}`],
                  isActive && localStyles.summaryCardActive,
                  pressed && localStyles.summaryCardPressed,
                ]}
                >
                  {item.key !== 'all' && (
                    <View
                      style={[
                        localStyles.summaryIndicator,
                        { backgroundColor: item.accent },
                      ]}
                    />
                  )}
                <Text style={localStyles.summaryCount}>
                  {item.count}
                </Text>
                <Text
                  numberOfLines={1}
                  style={localStyles.summaryLabel}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          contentContainerStyle={[
            localStyles.taskScrollContent,
            { paddingBottom: Math.max(bottomInset + 152, 180) },
          ]}
          showsVerticalScrollIndicator={false}
          style={localStyles.taskListScroll}
        >
          <View style={localStyles.listTitleRow}>
            <Text style={localStyles.listTitle}>{listTitle.title}</Text>
            <Text style={localStyles.listTitleCount}>{listTitle.countLabel}</Text>
          </View>

          {taskGroups.length === 0 ? (
            <View style={localStyles.tasksEmptyCard}>
              <Text style={localStyles.tasksEmptyTitle}>
                {tasks.length === 0 ? 'Пока нет задач' : 'Ничего не найдено'}
              </Text>
              <Text style={localStyles.tasksEmptyText}>
                {tasks.length === 0
                  ? 'Когда появятся уходы, они будут собраны здесь.'
                  : 'Смените фильтры по сроку или стадии.'}
              </Text>
            </View>
          ) : (
            <View style={localStyles.taskCardList}>
              {taskGroups.map((group) => {
                const cardStatusKey = group.tasks.some((task) => task.isOverdue)
                  ? 'overdue'
                  : group.tasks.some((task) => task.isDueToday)
                    ? 'today'
                    : 'planned';
                const statusMeta = TASK_STATUS_META[cardStatusKey];
                const visibleTasks = group.tasks.slice(0, 3);
                const remainingTasks = group.tasks.length - visibleTasks.length;

                return (
                  <View
                    key={group.cardId}
                    style={[
                      localStyles.taskCard,
                      cardStatusKey === 'overdue' && localStyles.taskCardOverdue,
                      cardStatusKey === 'today' && localStyles.taskCardToday,
                      cardStatusKey === 'planned' && localStyles.taskCardPlanned,
                    ]}
                  >
                    <View style={localStyles.taskCardBody}>
                      <View style={localStyles.taskCardHeader}>
                        <View style={localStyles.taskCardTitleBlock}>
                          <Text
                            numberOfLines={2}
                            style={localStyles.taskCardName}
                          >
                            {group.cardName}
                          </Text>
                          <Text
                            numberOfLines={2}
                            style={[
                              localStyles.taskCardMeta,
                              cardStatusKey === 'overdue' && localStyles.taskCardMetaOverdue,
                              cardStatusKey === 'today' && localStyles.taskCardMetaToday,
                              cardStatusKey === 'planned' && localStyles.taskCardMetaPlanned,
                            ]}
                          >
                            {[
                              group.code ? `Код: ${group.code}` : '',
                              getStageLabel(group.stage),
                              `Остаток: ${group.currentQuantity} шт.`,
                            ]
                              .filter(Boolean)
                              .join(' В· ')}
                          </Text>
                        </View>

                        <View
                          style={[
                            localStyles.taskBadge,
                            { backgroundColor: 'transparent' },
                          ]}
                        >
                          <View
                            style={[
                              localStyles.taskBadgeDot,
                              { backgroundColor: statusMeta.badgeText },
                            ]}
                          />
                        </View>
                      </View>

                      <View style={localStyles.taskRows}>
                        {visibleTasks.map((task) => {
                          const taskStatusKey = getTaskStatusKey(task);
                          const taskMeta = TASK_STATUS_META[taskStatusKey];

                          return (
                            <Pressable
                              accessibilityRole="button"
                              key={task.id}
                              onPress={() => onTaskPress(task)}
                              style={({ pressed }) => [
                                localStyles.taskRow,
                                pressed && localStyles.taskRowPressed,
                              ]}
                            >
                              <View style={localStyles.taskRowTextBlock}>
                                <Text
                                  numberOfLines={1}
                                  style={localStyles.taskRowTitle}
                                >
                                  {task.title}
                                </Text>
                                <Text
                                  numberOfLines={1}
                                  style={[
                                    localStyles.taskRowMeta,
                                    taskStatusKey === 'overdue' && {
                                      color: TASK_STATUS_META.overdue.badgeText,
                                    },
                                    taskStatusKey === 'today' && {
                                      color: TASK_STATUS_META.today.badgeText,
                                    },
                                    taskStatusKey === 'planned' && {
                                      color: TASK_STATUS_META.planned.badgeText,
                                    },
                                  ]}
                                >
                                  {getTaskRowMeta(task)}
                                </Text>
                              </View>

                              <View
                                style={[
                                  localStyles.taskRowArrow,
                                  { borderColor: taskMeta.badgeText },
                                ]}
                              >
                                <ArrowBackIcon
                                  color={taskMeta.badgeText}
                                  size={14}
                                />
                              </View>
                            </Pressable>
                          );
                        })}

                        {remainingTasks > 0 && (
                          <Text style={localStyles.taskMoreText}>
                            {`+ еще ${remainingTasks} ${pluralize(remainingTasks, 'задача', 'задачи', 'задач')}`}
                          </Text>
                        )}
                      </View>

                      <Pressable
                        accessibilityRole="button"
                        onPress={() => onTaskPress(group.tasks[0])}
                        style={({ pressed }) => [
                          localStyles.openButton,
                          pressed && localStyles.openButtonPressed,
                        ]}
                      >
                        <Text style={localStyles.openButtonText}>Открыть</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>

      <SelectBottomSheet
        getKey={(filter) => filter.key}
        getLabel={(filter) => filter.label}
        onClose={() => setIsStageFilterSheetVisible(false)}
        onSelect={(filter) => setActiveTaskStageFilter(filter.key)}
        options={TASK_STAGE_FILTERS}
        selectedKey={activeTaskStageFilter}
        title="Стадии задач"
        visible={isStageFilterSheetVisible}
      />

      <BottomTabBar
        activeTab="tasks"
        bottomInset={bottomInset}
        onHomePress={onHomePress}
        onJournalPress={onJournalPress}
        onMenuPress={onMenuPress}
        onScanPress={onScanPress}
        onTasksPress={() => {}}
        taskCount={tasks.length}
      />
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  tasksScreen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  taskListScroll: {
    flex: 1,
    minHeight: 0,
  },
  taskScrollContent: {
    flexGrow: 1,
  },
  tasksHeader: {
    marginBottom: 16,
  },
  tasksHeaderRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  tasksHeaderTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  tasksPageTitle: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  headerFilterButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#E6ECE8',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    maxWidth: 160,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerFilterButtonText: {
    color: '#111827',
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 14,
    shadowColor: '#102015',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    position: 'relative',
    width: '48%',
  },
  summaryCardAll: {},
  summaryCardOverdue: {},
  summaryCardToday: {},
  summaryCardPlanned: {},
  summaryCardActive: {
    borderColor: '#15863F',
    shadowOpacity: 0.14,
  },
  summaryCardPressed: {
    opacity: 0.95,
  },
  summaryIndicator: {
    borderRadius: 5,
    height: 10,
    position: 'absolute',
    right: 12,
    top: 12,
    width: 10,
  },
  summaryCount: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
  },
  summaryLabel: {
    color: '#667085',
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 0,
  },
  listTitleRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 6,
  },
  listTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
    flexShrink: 1,
  },
  listTitleCount: {
    color: '#15863F',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  tasksEmptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F0',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#102015',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
  },
  tasksEmptyTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
    textAlign: 'center',
  },
  tasksEmptyText: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
  taskCardList: {
    gap: 12,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F0',
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#102015',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
  },
  taskCardOverdue: {
    backgroundColor: '#FFFCFB',
  },
  taskCardToday: {
    backgroundColor: '#FBFFFC',
  },
  taskCardPlanned: {
    backgroundColor: '#FFFFFF',
  },
  taskCardBody: {
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  taskCardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  taskCardTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  taskCardName: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  taskCardMeta: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
  },
  taskCardMetaOverdue: {
    color: '#B42318',
  },
  taskCardMetaToday: {
    color: '#15863F',
  },
  taskCardMetaPlanned: {
    color: '#667085',
  },
  taskBadge: {
    alignItems: 'center',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 28,
    minWidth: 28,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  taskBadgeDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  taskRows: {
    borderTopColor: '#EEF2F0',
    borderTopWidth: 1,
    gap: 8,
    paddingTop: 10,
  },
  taskRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    minHeight: 36,
  },
  taskRowPressed: {
    opacity: 0.88,
  },
  taskRowTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  taskRowTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  taskRowMeta: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 2,
  },
  taskRowArrow: {
    alignItems: 'center',
    borderColor: '#D0D5DD',
    borderRadius: 999,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    transform: [{ rotate: '180deg' }],
    width: 22,
  },
  taskMoreText: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 2,
  },
  openButton: {
    alignItems: 'center',
    backgroundColor: '#15863F',
    borderRadius: 999,
    justifyContent: 'center',
    marginTop: 4,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  openButtonPressed: {
    opacity: 0.92,
  },
  openButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
});

