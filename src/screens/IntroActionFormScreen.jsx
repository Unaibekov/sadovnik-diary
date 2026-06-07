// Экран формы стартового действия для культуры.
import { StatusBar } from 'expo-status-bar';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from '../../styles';
import PhotoGallery from '../components/PhotoGallery';
import StageHeader from '../components/StageHeader';
import { getCardCurrentQuantity, getCardDisplayName } from '../domain/batch';
import { isRenderablePhotoUri } from '../domain/photoUri';

const introActionCommands = [
  ['comment', 'Комментарий'],
  ['photo', 'Фото'],
  ['contamination', 'Контаминация'],
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
  onReplaceActionPhoto,
  onSave,
  onSelectActionType,
  selectedCard,
}) {
  const selectedActionLabel =
    introActionCommands.find(([value]) => value === actionType)?.[1] || 'Запись';
  const photoUris = (
    Array.isArray(actionForm.photoUris) && actionForm.photoUris.length > 0
      ? actionForm.photoUris
      : actionForm.photoUri
        ? [actionForm.photoUri]
        : []
  ).filter((uri) => isRenderablePhotoUri(uri));

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <StageHeader
        onBack={onBack}
        title={isEditing ? 'Редактировать действие' : 'Добавить действие'}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.cultureFormScrollContent,
            localStyles.scrollContentCompact,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.cardsScreen, localStyles.cardsScreenCompact]}>
            <View style={styles.cardsHeader}>
              <Text style={styles.eventFormCardTitle}>
                {getCardDisplayName(selectedCard)}
              </Text>
              <Text style={styles.cardsSubtitle}>
                Текущее количество: {getCardCurrentQuantity(selectedCard)} шт.
              </Text>
            </View>

            <View style={[styles.surfacePanel, styles.formPanel]}>
              {isEditing ? (
                <Text style={styles.editActionTitle}>{selectedActionLabel}</Text>
              ) : (
                <View style={styles.actionGrid}>
                  {introActionCommands.map(([value, label]) => (
                    <Pressable
                      accessibilityRole="button"
                      key={value}
                      onPress={() => onSelectActionType(value)}
                      style={[
                        styles.actionChip,
                        actionType === value && styles.actionChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.actionChipText,
                          actionType === value && styles.actionChipTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {actionType === 'comment' && (
                <TextInput
                  multiline
                  onChangeText={(value) => onChangeActionForm('comment', value)}
                  placeholder="Комментарий"
                  placeholderTextColor="#7C8A80"
                  style={[styles.input, styles.multilineInput]}
                  value={actionForm.comment}
                />
              )}
              {actionType === 'photo' && (
                <View style={localStyles.photoField}>
                  <PhotoGallery
                    addLabel="Добавить фото"
                    addMoreLabel="Добавить еще фото"
                    editable
                    onAdd={onPickActionPhoto}
                    onReplace={onReplaceActionPhoto}
                    uris={photoUris}
                  />
                  <TextInput
                    multiline
                    onChangeText={(value) => onChangeActionForm('photoNote', value)}
                    placeholder="Описание фото"
                    placeholderTextColor="#7C8A80"
                    style={[styles.input, styles.multilineInput]}
                    value={actionForm.photoNote}
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

              {!!error && <Text style={styles.errorText}>{error}</Text>}

              <Pressable
                accessibilityRole="button"
                onPress={onSave}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressedButton,
                ]}
              >
                <Text style={styles.primaryButtonText}>Сохранить</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const localStyles = {
  cardsScreenCompact: {
    flex: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  scrollContentCompact: {
    paddingTop: 0,
  },
  photoField: {
    gap: 12,
  },
};

