// Экран главного меню приложения.
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from '../../styles';
import BottomTabBar from '../components/BottomTabBar';
import { ArrowBackIcon, ExitIcon } from '../components/icons';

const roleLabels = {
  admin: 'Администратор',
  agronomist: 'Агроном',
  operator: 'Оператор',
  superadmin: 'Суперадминистратор',
};

export default function MenuScreen({
  activeCardsCount = 0,
  bottomInset = 0,
  currentPassword = '',
  firstName,
  lastName,
  notice,
  onChangePermanentPassword,
  onHomePress,
  onJournalPress,
  onLogout,
  onClearCards,
  onGenerateCoverageTestData,
  onScheduleWateringReminder,
  onShareZipData,
  onScanPress,
  onTasksPress,
  onOpenDirectories,
  role = 'operator',
  taskCount = 0,
}) {
  const normalizedFirstName = firstName?.trim();
  const normalizedLastName = lastName?.trim();
  const displayName = normalizedFirstName || 'Пользователь';
  const displayLastName = normalizedLastName || '';
  const initials = (displayName?.[0] || 'S').toLocaleUpperCase('ru-RU');
  const [isPasswordSheetVisible, setIsPasswordSheetVisible] = useState(false);
  const [currentPasswordValue, setCurrentPasswordValue] = useState('');
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [repeatPasswordValue, setRepeatPasswordValue] = useState('');
  const [passwordSheetError, setPasswordSheetError] = useState('');

  const accountItems = [
    ['Активные партии', String(activeCardsCount)],
    ['Задачи', taskCount > 0 ? String(taskCount) : 'Нет новых'],
  ];
  const testMenuItems = [
    {
      key: 'generateCoverageTestData',
      onPress: onGenerateCoverageTestData,
      subtitle: 'Создать матрицу событий с полным покрытием полей',
      title: 'Покрытие событий',
    },
  ];
  const menuItems = [
    {
      key: 'shareZip',
      onPress: onShareZipData,
      subtitle: 'report.json и photos/ для ручной загрузки',
      title: 'Экспорт ZIP для админки',
    },
    {
      key: 'password',
      onPress: () => {
        setCurrentPasswordValue('');
        setNewPasswordValue('');
        setRepeatPasswordValue('');
        setPasswordSheetError('');
        setIsPasswordSheetVisible(true);
      },
      subtitle: 'Назначить новый постоянный пароль',
      title: 'Сменить пароль',
    },
    {
      key: 'notifications',
      onPress: onScheduleWateringReminder,
      subtitle: 'Тестовое напоминание о поливе через 1 минуту',
      title: 'Проверить уведомления',
    },
    {
      key: 'directories',
      onPress: onOpenDirectories,
      subtitle: 'Культуры, виды, сорта',
      title: 'Справочники',
    },
    ...testMenuItems,
    {
      key: 'clearCards',
      onPress: onClearCards,
      subtitle: 'Удалить все тестовые карточки партий',
      title: 'Зачистить карточки',
    },
  ];

  async function handleSavePassword() {
    const normalizedCurrentPassword = currentPasswordValue.trim();
    const normalizedNewPassword = newPasswordValue.trim();
    const normalizedRepeatPassword = repeatPasswordValue.trim();

    if (!normalizedCurrentPassword) {
      setPasswordSheetError('Введите текущий пароль');
      return;
    }

    if (normalizedCurrentPassword !== currentPassword.trim()) {
      setPasswordSheetError('Неверный текущий пароль');
      return;
    }

    if (!normalizedNewPassword) {
      setPasswordSheetError('Введите новый пароль');
      return;
    }

    if (normalizedNewPassword.length < 4) {
      setPasswordSheetError('Пароль должен быть не короче 4 символов');
      return;
    }

    if (normalizedNewPassword !== normalizedRepeatPassword) {
      setPasswordSheetError('Пароли не совпадают');
      return;
    }

    try {
      await onChangePermanentPassword(normalizedNewPassword);
      setIsPasswordSheetVisible(false);
      setPasswordSheetError('');
      setCurrentPasswordValue('');
      setNewPasswordValue('');
      setRepeatPasswordValue('');
    } catch {
      setPasswordSheetError('Не удалось сменить пароль');
    }
  }

  function handleClosePasswordSheet() {
    setIsPasswordSheetVisible(false);
    setPasswordSheetError('');
    setCurrentPasswordValue('');
    setNewPasswordValue('');
    setRepeatPasswordValue('');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.menuScreen}>
        <View style={styles.menuPinnedTop}>
          <View style={styles.menuHeader}>
            <View style={styles.menuAvatar}>
              <Text style={styles.menuAvatarText}>{initials}</Text>
            </View>
            <View style={styles.menuUserTextBlock}>
              <Text style={styles.menuUserName} numberOfLines={2}>
                {displayName}
              </Text>
              {!!displayLastName && (
                <Text style={styles.menuUserLastName} numberOfLines={1}>
                  {displayLastName}
                </Text>
              )}
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
        </View>

        <ScrollView
          style={styles.menuScroll}
          contentContainerStyle={styles.menuScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.menuSection}>
            {menuItems.map((item) => (
              <Pressable
                accessibilityRole="button"
                testID={`menu-item-${item.key}`}
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
                <View style={styles.menuItemArrowIcon}>
                  <ArrowBackIcon color="#9CA3AF" size={22} />
                </View>
              </Pressable>
            ))}
          </View>

          {!!notice && <Text style={styles.menuNoticeText}>{notice}</Text>}

          <Modal
            animationType="fade"
            onRequestClose={handleClosePasswordSheet}
            transparent
            visible={isPasswordSheetVisible}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={localStyles.passwordSheetRoot}
            >
              <Pressable
                accessibilityRole="button"
                onPress={handleClosePasswordSheet}
                style={localStyles.passwordSheetBackdrop}
              />
              <View
                style={[
                  localStyles.passwordSheetPanel,
                  { paddingBottom: 22 + bottomInset },
                ]}
              >
                <Text style={localStyles.passwordSheetTitle}>Сменить пароль</Text>

                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={(value) => {
                    setCurrentPasswordValue(value);
                    if (passwordSheetError) {
                      setPasswordSheetError('');
                    }
                  }}
                  placeholder="Текущий пароль"
                  placeholderTextColor="#98A2B3"
                  secureTextEntry
                  style={localStyles.passwordSheetInput}
                  value={currentPasswordValue}
                />

                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={(value) => {
                    setNewPasswordValue(value);
                    if (passwordSheetError) {
                      setPasswordSheetError('');
                    }
                  }}
                  placeholder="Новый пароль"
                  placeholderTextColor="#98A2B3"
                  secureTextEntry
                  style={localStyles.passwordSheetInput}
                  value={newPasswordValue}
                />

                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={(value) => {
                    setRepeatPasswordValue(value);
                    if (passwordSheetError) {
                      setPasswordSheetError('');
                    }
                  }}
                  placeholder="Повторите пароль"
                  placeholderTextColor="#98A2B3"
                  secureTextEntry
                  style={localStyles.passwordSheetInput}
                  value={repeatPasswordValue}
                />

                <View style={localStyles.passwordSheetMessageSlot}>
                  {!!passwordSheetError && (
                    <Text style={localStyles.passwordSheetError}>
                      {passwordSheetError}
                    </Text>
                  )}
                </View>

                <View style={localStyles.passwordSheetActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleClosePasswordSheet}
                    style={({ pressed }) => [
                      localStyles.passwordSheetSecondaryButton,
                      pressed && styles.linkButtonPressed,
                    ]}
                  >
                    <Text style={localStyles.passwordSheetSecondaryText}>Отмена</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleSavePassword}
                    style={({ pressed }) => [
                      localStyles.passwordSheetPrimaryButton,
                      pressed && styles.linkButtonPressed,
                    ]}
                  >
                    <Text style={localStyles.passwordSheetPrimaryText}>Сохранить</Text>
                  </Pressable>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        </ScrollView>
      </View>

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

const localStyles = StyleSheet.create({
  passwordSheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  passwordSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  passwordSheetPanel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 22,
    paddingTop: 18,
  },
  passwordSheetTitle: {
    color: '#101828',
    fontSize: 20,
    fontWeight: '800',
  },
  passwordSheetMessageSlot: {
    justifyContent: 'center',
    minHeight: 24,
  },
  passwordSheetInput: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E7ECEF',
    borderRadius: 16,
    borderWidth: 1,
    color: '#101828',
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: 16,
  },
  passwordSheetError: {
    color: '#B42318',
    fontSize: 14,
    lineHeight: 20,
  },
  passwordSheetActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  passwordSheetSecondaryButton: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E7ECEF',
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
  },
  passwordSheetSecondaryText: {
    color: '#344054',
    fontSize: 15,
    fontWeight: '700',
  },
  passwordSheetPrimaryButton: {
    alignItems: 'center',
    backgroundColor: '#15863F',
    borderRadius: 999,
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
  },
  passwordSheetPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});

