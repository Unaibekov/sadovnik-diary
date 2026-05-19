import { Pressable, Text, View } from 'react-native';
import styles from '../../styles';
import {
  HomeIcon,
  JournalIcon,
  MenuIcon,
  QrIcon,
  TodoIcon,
} from './TabBarIcons';

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

const activeColor = '#22C55E';
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

  return (
    <View style={[
      styles.homeTabBar,
      {
        bottom: 0,
        height: 76 + bottomInset,
        paddingBottom: bottomInset,
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
          styles.homeScannerButton,
          pressed && styles.pressedButton,
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
        styles.homeTabItem,
        pressed && styles.linkButtonPressed,
      ]}
    >
      <View style={styles.homeTabIconWrap}>
        <Icon color={color} size={22} />
        {hasNotification && (
          <View style={styles.homeTabBadge}>
            <Text style={styles.homeTabBadgeText}>{notificationLabel}</Text>
          </View>
        )}
      </View>
      <Text style={[
        styles.homeTabText,
        active && styles.homeTabTextActive,
      ]}>
        {label}
      </Text>
    </Pressable>
  );
}
