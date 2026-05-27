import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from '../../styles';
import StageHeader from '../components/StageHeader';
import { getCardDisplayName } from '../domain/batch';

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
  onSave,
  onSelectActionType,
  selectedCard,
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <StageHeader
        onBack={onBack}
        subtitle={<Text style={styles.stageHeaderSubtitle}>{getCardDisplayName(selectedCard)}</Text>}
        title={isEditing ? 'Редактировать действие' : 'Добавить действие'}
      />

      <ScrollView contentContainerStyle={styles.cultureFormScrollContent}>
        <View style={styles.cardsScreen}>
          <View style={[styles.surfacePanel, styles.formPanel]}>
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
                  <Text style={[
                    styles.actionChipText,
                    actionType === value && styles.actionChipTextActive,
                  ]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

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
              <TextInput
                multiline
                onChangeText={(value) => onChangeActionForm('photoNote', value)}
                placeholder="Описание фото или ссылка"
                placeholderTextColor="#7C8A80"
                style={[styles.input, styles.multilineInput]}
                value={actionForm.photoNote}
              />
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
    </SafeAreaView>
  );
}
