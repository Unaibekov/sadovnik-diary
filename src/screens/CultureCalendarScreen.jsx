import { StatusBar } from 'expo-status-bar';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from '../../styles';
import StageHeader from '../components/StageHeader';
import CalendarTabs from '../components/CalendarTabs';

export default function CultureCalendarScreen({
  activeTab,
  bottomInset,
  children,
  isStageMoveConfirmVisible,
  onAddEvent,
  onBack,
  onCancelStageMove,
  onChangeTab,
  onConfirmStageMove,
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
        <StageHeader onBack={onBack} title={title} />
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
      </View>
    </SafeAreaView>
  );
}
