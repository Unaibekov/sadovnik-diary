import { Pressable, StyleSheet, Text, View } from 'react-native';
import appStyles from '../../styles';
import {
  HomeIcon,
  JournalIcon,
  MenuIcon,
  QrIcon,
  TodoIcon,
} from './icons';

const tabs = [
  {
    Icon: HomeIcon,
    id: 'home',
    label: 'Главная',
  },
  {
    Icon: TodoIcon,
    id: 'tasks',
    label: 'Задачи',
  },
  {
    Icon: JournalIcon,
    id: 'journal',
    label: 'Журнал',
  },
  {
    Icon: MenuIcon,
    id: 'menu',
    label: 'Меню',
  },
];

const activeColor = '#15863F';
const inactiveColor = '#9CA3AF';

export default function BottomTabBar({
  activeTab = 'home',
  bottomInset = 0,
  onHomePress,
  onJournalPress,
  onMenuPress,
  onScanPress,
  onTasksPress,
  taskCount = 0,
}) {
  const tabHandlers = {
    home: onHomePress,
    journal: onJournalPress,
    menu: onMenuPress,
    tasks: onTasksPress,
  };
  const safeBottomInset = Math.max(bottomInset, 0);

  return (
    <View style={[
      styles.tabBar,
      {
        height: 76 + safeBottomInset,
        paddingBottom: safeBottomInset,
      },
    ]}>
      {tabs.slice(0, 2).map((tab) => (
        <TabBarItem
          active={activeTab === tab.id}
          Icon={tab.Icon}
          key={tab.id}
          label={tab.label}
          notificationCount={tab.id === 'tasks' ? taskCount : 0}
          onPress={tabHandlers[tab.id]}
        />
      ))}

      <Pressable
        accessibilityRole="button"
        onPress={onScanPress}
        style={({ pressed }) => [
          styles.scannerButton,
          pressed && appStyles.pressedButton,
        ]}
      >
        <QrIcon color="#FFFFFF" size={28} />
      </Pressable>

      {tabs.slice(2).map((tab) => (
        <TabBarItem
          active={activeTab === tab.id}
          Icon={tab.Icon}
          key={tab.id}
          label={tab.label}
          notificationCount={tab.id === 'tasks' ? taskCount : 0}
          onPress={tabHandlers[tab.id]}
        />
      ))}
    </View>
  );
}

function TabBarItem({
  active,
  Icon,
  label,
  notificationCount = 0,
  onPress,
}) {
  const color = active ? activeColor : inactiveColor;
  const hasNotification = notificationCount > 0;
  const notificationLabel = notificationCount > 9 ? '9+' : `${notificationCount}`;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.tabItem,
        pressed && appStyles.linkButtonPressed,
      ]}
    >
      <View style={styles.tabIconWrap}>
        <Icon color={color} size={22} />
        {hasNotification && (
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>{notificationLabel}</Text>
          </View>
        )}
      </View>
      <Text style={[
        styles.tabText,
        active && styles.tabTextActive,
      ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F0',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderBottomWidth: 0,
    bottom: 0,
    flexDirection: 'row',
    height: 76,
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: 8,
    position: 'absolute',
    right: 0,
    shadowColor: '#102015',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
    gap: 5,
    justifyContent: 'center',
    minWidth: 0,
  },
  tabIconWrap: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 28,
  },
  tabBadge: {
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    height: 16,
    justifyContent: 'center',
    minWidth: 16,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -6,
    top: -5,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
  tabText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  tabTextActive: {
    color: activeColor,
  },
  scannerButton: {
    alignItems: 'center',
    backgroundColor: activeColor,
    borderRadius: 24,
    height: 72,
    justifyContent: 'center',
    marginHorizontal: 4,
    marginTop: -36,
    shadowColor: activeColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.26,
    shadowRadius: 16,
    width: 72,
  },
});
