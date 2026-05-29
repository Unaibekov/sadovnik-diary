import { StatusBar } from 'expo-status-bar';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from '../../styles';
import StageHeader from '../components/StageHeader';
import CalendarTabs from '../components/CalendarTabs';
import { LampChargeIcon } from '../components/icons';

export default function CultureCalendarScreen({
  activeTab,
  bottomInset,
  children,
  isOperationDeleteConfirmVisible,
  isStageMoveConfirmVisible,
  onAddEvent,
  onBack,
  onCancelOperationDelete,
  onCancelStageMove,
  onChangeTab,
  onConfirmOperationDelete,
  onConfirmStageMove,
  onOpenRecommendations,
  onRequestStageMove,
  showBottomActions,
  stageMoveBlockedMessage,
  stageMoveButtonLabel,
  stageMoveTarget,
  title,
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.calendarScreen}>
        <StageHeader
          action={onOpenRecommendations && (
            <Pressable
              accessibilityLabel="Рекомендации"
              accessibilityRole="button"
              onPress={onOpenRecommendations}
              style={({ pressed }) => [
                localStyles.recommendationsButton,
                pressed && styles.linkButtonPressed,
              ]}
            >
              <LampChargeIcon size={26} />
            </Pressable>
          )}
          onBack={onBack}
          title={title}
        />
        <CalendarTabs activeTab={activeTab} onChangeTab={onChangeTab} />

        <ScrollView style={styles.calendarScroll} contentContainerStyle={styles.calendarContent}>
          {children}
        </ScrollView>

        {showBottomActions && (
          <View style={[
            styles.calendarBottomActions,
            { paddingBottom: Math.max(bottomInset + 12, 28) },
          ]}>
            {!!stageMoveTarget && !stageMoveBlockedMessage && (
              <Pressable
                accessibilityRole="button"
                onPress={onRequestStageMove}
                style={({ pressed }) => [
                  styles.primaryButton,
                  styles.calendarStageMoveButton,
                  pressed && styles.pressedButton,
                ]}
              >
                <Text style={[styles.primaryButtonText, styles.calendarStageMoveButtonText]}>
                  {stageMoveButtonLabel}
                </Text>
              </Pressable>
            )}

            <Pressable
              accessibilityRole="button"
              onPress={onAddEvent}
              style={({ pressed }) => [
                styles.calendarAddEventButton,
                pressed && styles.linkButtonPressed,
              ]}
            >
              <Text style={styles.calendarAddEventButtonText}>+</Text>
            </Pressable>
          </View>
        )}

        <Modal
          animationType="fade"
          transparent
          visible={isStageMoveConfirmVisible}
          onRequestClose={onCancelStageMove}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmModal}>
              <Text style={styles.confirmModalTitle}>Подтвердить перенос</Text>
              <Text style={styles.confirmModalText}>
                Перенести серию в стадию {stageMoveTarget}?
              </Text>
              <View style={styles.confirmModalActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={onCancelStageMove}
                  style={({ pressed }) => [
                    styles.secondaryOutlineButton,
                    styles.confirmModalButton,
                    pressed && styles.linkButtonPressed,
                  ]}
                >
                  <Text style={styles.secondaryOutlineButtonText}>Отмена</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={onConfirmStageMove}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    styles.confirmModalButton,
                    pressed && styles.pressedButton,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>Перенести</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="fade"
          transparent
          visible={isOperationDeleteConfirmVisible}
          onRequestClose={onCancelOperationDelete}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmModal}>
              <Text style={styles.confirmModalTitle}>Удалить запись?</Text>
              <Text style={styles.confirmModalText}>
                Запись будет удалена из календаря и журнала. Это действие нельзя отменить.
              </Text>
              <View style={styles.confirmModalActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={onCancelOperationDelete}
                  style={({ pressed }) => [
                    styles.secondaryOutlineButton,
                    styles.confirmModalButton,
                    pressed && styles.linkButtonPressed,
                  ]}
                >
                  <Text style={styles.secondaryOutlineButtonText}>Отмена</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={onConfirmOperationDelete}
                  style={({ pressed }) => [
                    styles.dangerButton,
                    styles.confirmModalButton,
                    pressed && styles.linkButtonPressed,
                  ]}
                >
                  <Text style={styles.dangerButtonText}>Удалить</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  recommendationsButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE7DE',
    borderRadius: 999,
    borderWidth: 1,
    elevation: 2,
    height: 44,
    justifyContent: 'center',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    width: 44,
  },
});
