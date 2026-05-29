import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CARE_CHANNEL_ID = 'care-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function initializeLocalNotifications() {
  if (Platform.OS === 'web') {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CARE_CHANNEL_ID, {
      description: 'Напоминания по уходу за растениями',
      importance: Notifications.AndroidImportance.HIGH,
      name: 'Уход за растениями',
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const permissions = await Notifications.getPermissionsAsync();

  if (permissions.granted || permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requestedPermissions = await Notifications.requestPermissionsAsync();
  return requestedPermissions.granted ||
    requestedPermissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function scheduleWateringReminder({
  body = 'Проверьте партии, которым нужен полив.',
  date,
  title = 'Напоминание о поливе',
} = {}) {
  const hasPermission = await initializeLocalNotifications();

  if (!hasPermission) {
    throw new Error('notifications-permission-denied');
  }

  const triggerDate = date || new Date(Date.now() + 60 * 1000);

  return Notifications.scheduleNotificationAsync({
    content: {
      body,
      data: { type: 'watering' },
      sound: 'default',
      title,
    },
    trigger: {
      channelId: CARE_CHANNEL_ID,
      date: triggerDate,
      type: Notifications.SchedulableTriggerInputTypes.DATE,
    },
  });
}

export function getReminderDateFromIsoDate(isoDate, hour = 9, minute = 0) {
  if (!isoDate) {
    return null;
  }

  const [year, month, day] = isoDate.split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const reminderDate = new Date(year, month - 1, day, hour, minute, 0, 0);

  if (reminderDate.getTime() <= Date.now()) {
    return new Date(Date.now() + 60 * 1000);
  }

  return reminderDate;
}
