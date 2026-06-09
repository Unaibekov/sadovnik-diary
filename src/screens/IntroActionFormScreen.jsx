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
import StatusFilterTabs from '../components/StatusFilterTabs';
import { INTRO_STAGE } from '../domain/constants';
import { getCardCurrentQuantity, getCardDisplayName } from '../domain/batch';
import { isRenderablePhotoUri } from '../domain/photoUri';

const introActionCommands = [
  ['comment', 'Комментарий'],
  ['photo', 'Фото'],
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
        subtitle={<Text style={styles.stageHeaderSubtitle}>{selectedCard.stage || INTRO_STAGE}</Text>}
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

            <View style={[styles.surfacePanel, styles.formPanel]}>
              {isEditing && (
                <Text style={styles.editActionTitle}>{selectedActionLabel}</Text>
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
  actionTabsWrap: {
    marginBottom: 12,
  },
  scrollContentCompact: {
    paddingTop: 0,
  },
  photoField: {
    gap: 12,
  },
};

