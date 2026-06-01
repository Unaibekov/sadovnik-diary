import { StatusBar } from 'expo-status-bar';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from '../../styles';
import BottomTabBar from '../components/BottomTabBar';
import { ExitIcon } from '../components/icons';

const roleLabels = {
  admin: 'Администратор',
  agronomist: 'Агроном',
  operator: 'Оператор',
  superadmin: 'Суперадминистратор',
};

export default function MenuScreen({
  activeCardsCount = 0,
  bottomInset = 0,
  firstName,
  lastName,
  notice,
  onHomePress,
  onJournalPress,
  onLogout,
  onMenuAction,
  onClearCards,
  onScheduleWateringReminder,
  onShareData,
  onScanPress,
  onTasksPress,
  role = 'operator',
  taskCount = 0,
}) {
  const normalizedFirstName = firstName?.trim();
  const displayName = normalizedFirstName || 'Пользователь';
  const initials = (displayName?.[0] || 'S').toLocaleUpperCase('ru-RU');

  const accountItems = [
    ['Активные партии', String(activeCardsCount)],
    ['Задачи', taskCount > 0 ? String(taskCount) : 'Нет новых'],
  ];
  const menuItems = [
    {
      key: 'notifications',
      onPress: onScheduleWateringReminder,
      subtitle: 'Тестовое напоминание о поливе через 1 минуту',
      title: 'Проверить уведомления',
    },
    {
      key: 'share',
      onPress: onShareData,
      subtitle: 'Excel-файл с партиями и журналом',
      title: 'Поделиться отчетом',
    },
    {
      key: 'directories',
      onPress: () => onMenuAction('Справочники'),
      subtitle: 'Культуры, сорта, поставщики',
      title: 'Справочники',
    },
    {
      key: 'support',
      onPress: () => onMenuAction('Поддержка'),
      subtitle: 'Вопросы и обратная связь',
      title: 'Поддержка',
    },
    {
      key: 'clearCards',
      onPress: onClearCards,
      subtitle: 'Удалить все тестовые карточки партий',
      title: 'Зачистить карточки',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.menuScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.menuScreen}>
          <View style={styles.menuHeader}>
            <View style={styles.menuAvatar}>
              <Text style={styles.menuAvatarText}>{initials}</Text>
            </View>
            <View style={styles.menuUserTextBlock}>
              <Text style={styles.menuUserName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.menuUserRole}>
                {roleLabels[role] || role}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Выйти"
              accessibilityRole="button"
              onPress={onLogout}
              style={({ pressed }) => [
                styles.menuHeaderExitButton,
                pressed && styles.linkButtonPressed,
              ]}
            >
              <ExitIcon color="#15863F" size={26} />
            </Pressable>
          </View>

          <View style={styles.menuStatsGrid}>
            {accountItems.map(([label, value]) => (
              <View key={label} style={styles.menuStatCard}>
                <Text style={styles.menuStatValue}>{value}</Text>
                <Text style={styles.menuStatLabel}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.menuSection}>
            {menuItems.map((item) => (
              <Pressable
                accessibilityRole="button"
                key={item.key}
                onPress={item.onPress}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.linkButtonPressed,
                ]}
              >
                <View style={styles.menuItemTextBlock}>
                  <Text style={styles.menuItemTitle}>{item.title}</Text>
                  <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                </View>
                <Text style={styles.menuItemArrow}>{'>'}</Text>
              </Pressable>
            ))}
          </View>

          {!!notice && (
            <Text style={styles.menuNoticeText}>{notice}</Text>
          )}

        </View>
      </ScrollView>

      <BottomTabBar
        activeTab="menu"
        bottomInset={bottomInset}
        onHomePress={onHomePress}
        onJournalPress={onJournalPress}
        onMenuPress={() => {}}
        onScanPress={onScanPress}
        onTasksPress={onTasksPress}
        taskCount={taskCount}
      />
    </SafeAreaView>
  );
}
