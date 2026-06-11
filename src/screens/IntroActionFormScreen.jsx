// Экран формы стартового действия для культуры.
import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
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
import PhotoGallery from '../components/PhotoGallery';
import StageHeader from '../components/StageHeader';
import StatusFilterTabs from '../components/StatusFilterTabs';
import { INTRO_STAGE } from '../domain/constants';
import { getCardCurrentQuantity, getCardDisplayName } from '../domain/batch';
import { isRenderablePhotoUri } from '../domain/photoUri';

const introActionCommands = [
  ['comment', 'Комментарий'],
  ['movement', 'Перемещение'],
  ['contamination', 'Контаминация'],
  ['introLoss', 'Потери'],
  ['quarantine', 'Карантин'],
];

export default function IntroActionFormScreen({
  actionForm,
  actionType,
  error,
  isEditing,
  onBack,
  onChangeActionForm,
  onPickActionPhoto,
  onRemoveActionPhoto,
  onReplaceActionPhoto,
  onSave,
  onSelectActionType,
  selectedCard,
}) {
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [saveAttemptCount, setSaveAttemptCount] = useState(0);
  const seenAlertRef = useRef('');
  const selectedActionLabel =
    introActionCommands.find(([value]) => value === actionType)?.[1] ||
    (actionType === 'photo' ? 'Фото' : 'Запись');
  const isPhotoAction = actionType === 'photo';
  const commentValue = isPhotoAction ? actionForm.photoNote : actionForm.comment;
  const commentField = isPhotoAction ? 'photoNote' : 'comment';
  const photoUris = (
    Array.isArray(actionForm.photoUris) && actionForm.photoUris.length > 0
      ? actionForm.photoUris
      : actionForm.photoUri
        ? [actionForm.photoUri]
        : []
  ).filter((uri) => isRenderablePhotoUri(uri));

  useEffect(() => {
    if (!error) {
      seenAlertRef.current = '';
      setIsAlertVisible(false);
      return;
    }

    const alertKey = `${saveAttemptCount}:${error}`;
    if (alertKey !== seenAlertRef.current) {
      seenAlertRef.current = alertKey;
      setIsAlertVisible(true);
    }
  }, [error, saveAttemptCount]);

  function handleSavePress() {
    setSaveAttemptCount((current) => current + 1);
    onSave();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <StageHeader
        onBack={onBack}
        subtitle={<Text style={styles.stageHeaderSubtitle}>{selectedCard.stage || INTRO_STAGE}</Text>}
        title={isEditing ? 'Редактировать действие' : 'Добавить действие'}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={localStyles.screen}>
          <View style={localStyles.fixedHeader}>
            <View style={styles.cardsHeader}>
              <Text style={styles.eventFormCardTitle}>
                {getCardDisplayName(selectedCard)}
              </Text>
              <Text style={styles.cardsSubtitle}>
                Текущее количество: {getCardCurrentQuantity(selectedCard)} шт.
              </Text>
            </View>

            {!isEditing && (
              <View style={localStyles.actionTabsWrap}>
                <StatusFilterTabs
                  activeValue={actionType}
                  items={introActionCommands}
                  onChange={onSelectActionType}
                  showDots={false}
                />
              </View>
            )}
          </View>

          <View style={localStyles.contentArea}>
            <View style={[styles.surfacePanel, styles.formPanel, localStyles.whitePanel]}>
              <ScrollView
                bounces={false}
                contentContainerStyle={localStyles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {isEditing && (
                  <Text style={styles.editActionTitle}>{selectedActionLabel}</Text>
                )}

                {(actionType === 'comment' || isPhotoAction) && (
                  <View style={localStyles.commentField}>
                    <TextInput
                      multiline
                      onChangeText={(value) => onChangeActionForm(commentField, value)}
                      placeholder="Комментарий"
                      placeholderTextColor="#7C8A80"
                      style={[styles.input, styles.multilineInput]}
                      value={commentValue}
                    />
                  </View>
                )}
                {actionType === 'contamination' && (
                  <TextInput
                    multiline
                    onChangeText={(value) => onChangeActionForm('contaminationNote', value)}
                    placeholder="Описание контаминации"
                    placeholderTextColor="#7C8A80"
                    style={[styles.input, styles.multilineInput]}
                    value={actionForm.contaminationNote}
                  />
                )}
                {actionType === 'introLoss' && (
                  <>
                    <View style={styles.field}>
                      <Text style={styles.label}>Количество потерь *</Text>
                      <TextInput
                        inputMode="numeric"
                        keyboardType="numeric"
                        onChangeText={(value) => onChangeActionForm('lossCount', value)}
                        placeholderTextColor="#7C8A80"
                        style={styles.input}
                        value={actionForm.lossCount}
                      />
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.label}>Причина *</Text>
                      <TextInput
                        multiline
                        onChangeText={(value) => onChangeActionForm('lossReason', value)}
                        placeholderTextColor="#7C8A80"
                        style={[styles.input, styles.multilineInput]}
                        value={actionForm.lossReason}
                      />
                    </View>
                  </>
                )}
                {actionType === 'movement' && (
                  <>
                    <View style={styles.field}>
                      <Text style={styles.label}>Теплица</Text>
                      <TextInput
                        onChangeText={(value) => onChangeActionForm('greenhouseName', value)}
                        placeholder="Например: 1"
                        placeholderTextColor="#7C8A80"
                        style={styles.input}
                        value={actionForm.greenhouseName}
                      />
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.label}>Стеллаж</Text>
                      <TextInput
                        onChangeText={(value) => onChangeActionForm('rackName', value)}
                        placeholder="Например: B"
                        placeholderTextColor="#7C8A80"
                        style={styles.input}
                        value={actionForm.rackName}
                      />
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.label}>Полка</Text>
                      <TextInput
                        onChangeText={(value) => onChangeActionForm('shelfName', value)}
                        placeholder="Например: 3"
                        placeholderTextColor="#7C8A80"
                        style={styles.input}
                        value={actionForm.shelfName}
                      />
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.label}>Комментарий</Text>
                      <TextInput
                        multiline
                        onChangeText={(value) => onChangeActionForm('movementComment', value)}
                        placeholder="Комментарий"
                        placeholderTextColor="#7C8A80"
                        style={[styles.input, styles.multilineInput]}
                        value={actionForm.movementComment}
                      />
                    </View>
                  </>
                )}
                {actionType === 'quarantine' && (
                  <TextInput
                    multiline
                    onChangeText={(value) => onChangeActionForm('quarantineReason', value)}
                    placeholder="Причина карантина"
                    placeholderTextColor="#7C8A80"
                    style={[styles.input, styles.multilineInput]}
                    value={actionForm.quarantineReason}
                  />
                )}

                <View style={localStyles.photoField}>
                  <PhotoGallery
                    addLabel="Добавить фото"
                    addMoreLabel="Добавить еще фото"
                    editable
                    onAdd={onPickActionPhoto}
                    onRemove={onRemoveActionPhoto}
                    onReplace={onReplaceActionPhoto}
                    uris={photoUris}
                  />
                </View>
              </ScrollView>
            </View>
          </View>

          <View style={localStyles.footer}>
            <Pressable
              accessibilityRole="button"
              onPress={handleSavePress}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressedButton,
              ]}
            >
              <Text style={styles.primaryButtonText}>Сохранить</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsAlertVisible(false)}
        transparent
        visible={isAlertVisible}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => setIsAlertVisible(false)}
          style={StyleSheet.absoluteFill}
        />
        <View style={localStyles.alertOverlay}>
          <View style={localStyles.alertCard}>
            <Text style={localStyles.alertTitle}>Внимание</Text>
            <Text style={localStyles.alertMessage}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsAlertVisible(false)}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressedButton,
                localStyles.alertButton,
              ]}
            >
              <Text style={styles.primaryButtonText}>Закрыть</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const localStyles = {
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  fixedHeader: {
    flexShrink: 0,
  },
  contentArea: {
    flex: 1,
    minHeight: 0,
    paddingTop: 18,
  },
  whitePanel: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  actionTabsWrap: {
    marginBottom: 12,
  },
  scrollContent: {
    flexGrow: 1,
    gap: 14,
    paddingBottom: 2,
  },
  commentField: {
    gap: 12,
  },
  photoField: {
    gap: 12,
  },
  footer: {
    paddingBottom: 16,
    paddingTop: 18,
  },
  alertOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    gap: 14,
  },
  alertTitle: {
    color: '#1E3B2B',
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 24,
    lineHeight: 30,
  },
  alertMessage: {
    color: '#71837B',
    fontFamily: 'Nunito_400Regular',
    fontSize: 17,
    lineHeight: 24,
  },
  alertButton: {
    marginTop: 2,
  },
};

