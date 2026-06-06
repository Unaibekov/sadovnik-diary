// Экран справки и информации о приложении.
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import packageJson from '../../package.json';
import styles from '../../styles';
import BottomTabBar from '../components/BottomTabBar';
import { InfoIcon, JournalIcon, TodoIcon } from '../components/icons';

function StatCard({ label, value }) {
  return (
    <View style={localStyles.statCard}>
      <Text style={localStyles.statValue}>{value}</Text>
      <Text style={localStyles.statLabel}>{label}</Text>
    </View>
  );
}

function SupportAction({ icon, onPress, subtitle, title }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        localStyles.actionCard,
        pressed && styles.linkButtonPressed,
      ]}
    >
      <View style={localStyles.actionIconWrap}>{icon}</View>
      <View style={localStyles.actionTextBlock}>
        <Text style={localStyles.actionTitle}>{title}</Text>
        <Text style={localStyles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Text style={localStyles.actionArrow}>{'>'}</Text>
    </Pressable>
  );
}

export default function SupportScreen({
  activeCardsCount = 0,
  bottomInset = 0,
  currentScreenLabel = 'Меню',
  login,
  notice,
  onHomePress,
  onJournalPress,
  onMenuPress,
  onOpenMenu,
  onOpenTasks,
  onScheduleWateringReminder,
  onShareData,
  onScanPress,
  onTasksPress,
  role = 'operator',
  storageError,
  taskCount = 0,
}) {
  const appVersion = packageJson.version || '1.0.0';
  const supportStats = [
    ['Версия', appVersion],
    ['Роль', role],
    ['Активных партий', String(activeCardsCount)],
    ['Задач', String(taskCount)],
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.menuScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.menuScreen}>
          <View style={localStyles.headerBlock}>
            <View style={localStyles.headerIconWrap}>
              <InfoIcon color="#15863F" size={26} />
            </View>
            <View style={localStyles.headerTextBlock}>
              <Text style={localStyles.headerTitle}>Поддержка</Text>
              <Text style={localStyles.headerSubtitle}>
                Быстрые ответы, состояние приложения и действия для диагностики.
              </Text>
            </View>
          </View>

          <View style={styles.menuStatsGrid}>
            {supportStats.map(([label, value]) => (
              <StatCard key={label} label={label} value={value} />
            ))}
          </View>

          <View style={styles.menuSection}>
            <SupportAction
              icon={<JournalIcon color="#15863F" size={22} />}
              onPress={onJournalPress}
              subtitle="Посмотреть журнал событий и быстрые фильтры"
              title="Открыть журнал"
            />
            <SupportAction
              icon={<TodoIcon color="#15863F" size={22} />}
              onPress={onOpenTasks || onTasksPress}
              subtitle="Проверить запланированные уходы"
              title="Открыть задачи"
            />
            <SupportAction
              icon={<InfoIcon color="#15863F" size={22} />}
              onPress={onShareData}
              subtitle="Сформировать Excel-отчет по партиям и журналу"
              title="Экспорт данных"
            />
            <SupportAction
              icon={<InfoIcon color="#15863F" size={22} />}
              onPress={onScheduleWateringReminder}
              subtitle="Проверить, что уведомления на устройстве работают"
              title="Проверить уведомление"
            />
          </View>

          <View style={localStyles.faqBlock}>
            <Text style={localStyles.faqTitle}>Что делать дальше</Text>
            <Text style={localStyles.faqText}>
              Если не видишь ожидаемые карточки, проверь выбранную стадию и фильтры.
              Если журнал пуст, сначала создай партию или открой уже сохраненную карточку.
              Для диагностики удобнее всего начать с журнала и задач.
            </Text>
          </View>

          {!!storageError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{storageError}</Text>
            </View>
          )}

          {!!notice && (
            <View style={localStyles.noticeBlock}>
              <Text style={localStyles.noticeTitle}>Последнее сообщение</Text>
              <Text style={localStyles.noticeText}>{notice}</Text>
            </View>
          )}

          <View style={localStyles.footerBlock}>
            <Text style={localStyles.footerText}>Пользователь: {login}</Text>
            <Text style={localStyles.footerText}>Текущий раздел: {currentScreenLabel}</Text>
          </View>
        </View>
      </ScrollView>

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

const localStyles = StyleSheet.create({
  actionArrow: {
    color: '#A0ACA4',
    fontSize: 20,
    fontWeight: '700',
  },
  actionCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E6EDE7',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  actionIconWrap: {
    alignItems: 'center',
    backgroundColor: '#EAF6EF',
    borderRadius: 999,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  actionSubtitle: {
    color: '#647569',
    fontSize: 13,
    lineHeight: 18,
  },
  actionTextBlock: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  actionTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  faqBlock: {
    backgroundColor: '#F7FAF8',
    borderColor: '#E2E9E4',
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    marginTop: 12,
    padding: 16,
  },
  faqText: {
    color: '#5F7065',
    fontSize: 14,
    lineHeight: 20,
  },
  faqTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  footerBlock: {
    gap: 4,
    marginTop: 12,
    paddingHorizontal: 2,
  },
  footerText: {
    color: '#728077',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  headerBlock: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E6EDE7',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
    padding: 16,
  },
  headerIconWrap: {
    alignItems: 'center',
    backgroundColor: '#EAF6EF',
    borderRadius: 999,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  headerSubtitle: {
    color: '#5F7065',
    fontSize: 14,
    lineHeight: 20,
  },
  headerTextBlock: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  headerTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  noticeBlock: {
    backgroundColor: '#F4FAF6',
    borderColor: '#DDE9E1',
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    marginTop: 12,
    padding: 16,
  },
  noticeText: {
    color: '#355143',
    fontSize: 13,
    lineHeight: 18,
  },
  noticeTitle: {
    color: '#2B6B43',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F0',
    borderRadius: 14,
    borderWidth: 1,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: '48%',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  statLabel: {
    color: '#65756B',
    fontSize: 12,
    fontWeight: '700',
  },
  statValue: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
});
