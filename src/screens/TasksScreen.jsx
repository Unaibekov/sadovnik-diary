import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from '../../styles';
import BottomTabBar from '../components/BottomTabBar';
import ScreenGradient from '../components/ScreenGradient';
import { formatDisplayDate } from '../domain/dates';

function groupTasksByCard(tasks) {
  return tasks.reduce((groups, task) => {
    const currentGroup = groups.find((group) => group.cardId === task.cardId);

    if (currentGroup) {
      currentGroup.tasks.push(task);
      currentGroup.isOverdue = currentGroup.isOverdue || task.isOverdue;
      currentGroup.isDueToday = currentGroup.isDueToday || task.isDueToday;
      return groups;
    }

    return [
      ...groups,
      {
        cardId: task.cardId,
        cardName: task.cardName,
        code: task.code,
        currentQuantity: task.currentQuantity,
        isDueToday: task.isDueToday,
        isOverdue: task.isOverdue,
        stage: task.stage,
        tasks: [task],
      },
    ];
  }, []);
}

function getTaskGroupStatus(group) {
  if (group.isOverdue) {
    return 'Просрочено';
  }

  if (group.isDueToday) {
    return 'Сегодня';
  }

  return 'Запланировано';
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
  const taskGroups = groupTasksByCard(tasks);

  return (
    <SafeAreaView style={[styles.safeArea, styles.homeSafeArea]}>
      <ScreenGradient />
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.tasksScreenContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tasksScreen}>
          <View style={styles.tasksPageHeader}>
            <Text style={styles.tasksPageTitle}>Задачи</Text>
            <Text style={styles.tasksPageMeta}>
              {tasks.length > 0 ? `Плановые действия: ${tasks.length}` : 'Плановых действий нет'}
            </Text>
          </View>

          {taskGroups.length === 0 ? (
            <View style={styles.tasksEmptyCard}>
              <Text style={styles.tasksEmptyTitle}>Все в графике</Text>
              <Text style={styles.tasksEmpty}>
                Запланированных уходов пока нет.
              </Text>
            </View>
          ) : (
            <View style={styles.tasksList}>
              {taskGroups.map((group) => (
                <Pressable
                  accessibilityRole="button"
                  key={group.cardId}
                  onPress={() => onTaskPress(group.tasks[0])}
                  style={({ pressed }) => [
                    styles.taskItem,
                    group.isOverdue && styles.taskItemWarning,
                    pressed && styles.linkButtonPressed,
                  ]}
                >
                  <View style={styles.taskItemHeader}>
                    <Text style={styles.taskItemTitle}>{group.cardName}</Text>
                    <Text style={[
                      styles.taskStatus,
                      group.isOverdue && styles.taskStatusWarning,
                    ]}>
                      {getTaskGroupStatus(group)}
                    </Text>
                  </View>
                  <Text style={styles.taskItemMeta}>
                    {[
                      group.code ? `Код: ${group.code}` : '',
                      group.stage,
                      `Остаток: ${group.currentQuantity} шт.`,
                    ].filter(Boolean).join(' · ')}
                  </Text>
                  <View style={styles.taskSubList}>
                    {group.tasks.map((task) => (
                      <View key={task.id} style={styles.taskSubItem}>
                        <Text style={styles.taskSubItemTitle}>{task.title}</Text>
                        <Text style={[
                          styles.taskSubItemMeta,
                          task.isOverdue && styles.taskStatusWarning,
                        ]}>
                          {formatDisplayDate(task.nextDate)}
                          {task.daysOverdue > 0 ? ` · ${task.daysOverdue} дн.` : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

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
