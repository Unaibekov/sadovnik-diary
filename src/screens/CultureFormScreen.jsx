// Экран формы создания и редактирования культуры.
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from '../../styles';
import SelectBottomSheet from '../components/SelectBottomSheet';
import { ChevronDownIcon, QrGenerateIcon } from '../components/icons';
import StageHeader from '../components/StageHeader';
import { dateFromIso, formatDisplayDate, parseDisplayDate } from '../domain/dates';

const NativeDateTimePicker = Platform.OS === 'web'
  ? null
  : require('@react-native-community/datetimepicker').default;

export default function CultureFormScreen({
  canEditCurrentIdentity,
  canSaveCultureForm,
  cultureForm,
  cultureOptions,
  formError,
  handleDateChange,
  handleGenerateCode,
  handleSaveCultureCard,
  handleSelectCulture,
  handleSelectSpecies,
  handleSelectVariety,
  isAdaptationStage,
  isCloneStage,
  isCultureIntroStage,
  isEditingCard,
  isRequiredFieldMissing,
  onBack,
  openDropdown,
  selectedStage,
  setOpenDropdown,
  setShowDatePicker,
  showDatePicker,
  showIdentityAsText,
  sourceMaterialOptions,
  speciesOptions,
  updateCultureForm,
  varietyOptions,
}) {
  const [isSaving, setIsSaving] = useState(false);
  async function handleSavePress() {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await handleSaveCultureCard();
    } finally {
      setIsSaving(false);
    }
  }

  const title = isEditingCard
    ? 'Паспорт партии'
    : isCultureIntroStage
      ? 'Создать партию'
      : 'Добавить карточку';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <StageHeader
        onBack={onBack}
        subtitle={<Text style={styles.stageHeaderSubtitle}>{selectedStage}</Text>}
        title={title}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.cardsScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.cardsScreen}>
            <View style={styles.formPanel}>
              {isEditingCard && (
                <View style={styles.noticeBox}>
                  <Text style={styles.noticeText}>
                    Паспорт партии заблокирован после создания. В этой форме можно менять только настройки текущей стадии.
                  </Text>
                </View>
              )}

              <View style={styles.field}>
                <Text style={styles.label}>{isAdaptationStage ? 'Дата посадки *' : 'Дата создания *'}</Text>
                {showIdentityAsText ? (
                  <Text style={styles.readonlyValue}>
                    {formatDisplayDate(cultureForm.createdAt)}
                  </Text>
                ) : Platform.OS === 'web' ? (
                    <TextInput
                      editable={canEditCurrentIdentity}
                      onChangeText={(value) => {
                        updateCultureForm('createdAt', parseDisplayDate(value));
                      }}
                      placeholderTextColor="#7C8A80"
                      style={[
                        styles.input,
                      !canEditCurrentIdentity && styles.inputDisabled,
                      isRequiredFieldMissing('createdAt') && styles.inputInvalid,
                    ]}
                    value={formatDisplayDate(cultureForm.createdAt)}
                  />
                ) : (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      disabled={!canEditCurrentIdentity}
                      onPress={() => setShowDatePicker(true)}
                      style={({ pressed }) => [
                        styles.dateButton,
                        !canEditCurrentIdentity && styles.inputDisabled,
                        isRequiredFieldMissing('createdAt') && styles.inputInvalid,
                        pressed && styles.linkButtonPressed,
                      ]}
                    >
                      <Text style={styles.dateButtonText}>
                        {formatDisplayDate(cultureForm.createdAt)}
                      </Text>
                    </Pressable>

                    {showDatePicker && NativeDateTimePicker && (
                      <NativeDateTimePicker
                        mode="date"
                        onChange={handleDateChange}
                        value={dateFromIso(cultureForm.createdAt)}
                      />
                    )}
                  </>
                )}
              </View>

              <View style={styles.field}>
                {showIdentityAsText ? (
                  <Text style={styles.readonlyValue}>{cultureForm.cultureName}</Text>
                ) : (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      disabled={!canEditCurrentIdentity}
                      onPress={() => setOpenDropdown(openDropdown === 'culture' ? '' : 'culture')}
                      style={[
                        styles.selectButton,
                        !canEditCurrentIdentity && styles.selectButtonDisabled,
                        isRequiredFieldMissing('cultureName') && styles.inputInvalid,
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectButtonText,
                          !cultureForm.cultureName && styles.selectPlaceholder,
                        ]}
                      >
                        {cultureForm.cultureName || 'Выберите культуру'}
                      </Text>
                      <View style={styles.selectButtonArrow}>
                        <ChevronDownIcon />
                      </View>
                    </Pressable>

                    <SelectBottomSheet
                      onClose={() => setOpenDropdown('')}
                      onSelect={handleSelectCulture}
                      options={cultureOptions}
                      title="Выберите культуру"
                      visible={openDropdown === 'culture'}
                    />
                  </>
                )}
              </View>

              <View style={styles.field}>
                {showIdentityAsText ? (
                  <Text style={styles.readonlyValue}>{cultureForm.speciesName}</Text>
                ) : (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      disabled={!cultureForm.cultureName || !canEditCurrentIdentity}
                      onPress={() => setOpenDropdown(openDropdown === 'species' ? '' : 'species')}
                      style={[
                        styles.selectButton,
                        (!cultureForm.cultureName || !canEditCurrentIdentity) && styles.selectButtonDisabled,
                        isRequiredFieldMissing('speciesName') && styles.inputInvalid,
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectButtonText,
                          !cultureForm.speciesName && styles.selectPlaceholder,
                        ]}
                      >
                        {cultureForm.speciesName || 'Выберите вид'}
                      </Text>
                      <View style={styles.selectButtonArrow}>
                        <ChevronDownIcon />
                      </View>
                    </Pressable>

                    <SelectBottomSheet
                      onClose={() => setOpenDropdown('')}
                      onSelect={handleSelectSpecies}
                      options={speciesOptions}
                      title="Выберите вид"
                      visible={openDropdown === 'species'}
                    />
                  </>
                )}
              </View>

              <View style={styles.field}>
                {showIdentityAsText ? (
                  <Text style={styles.readonlyValue}>{cultureForm.varietyName}</Text>
                ) : (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      disabled={!cultureForm.speciesName || !canEditCurrentIdentity}
                      onPress={() => setOpenDropdown(openDropdown === 'variety' ? '' : 'variety')}
                      style={[
                        styles.selectButton,
                        (!cultureForm.speciesName || !canEditCurrentIdentity) && styles.selectButtonDisabled,
                        isRequiredFieldMissing('varietyName') && styles.inputInvalid,
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectButtonText,
                          !cultureForm.varietyName && styles.selectPlaceholder,
                        ]}
                      >
                        {cultureForm.varietyName || 'Выберите сорт'}
                      </Text>
                      <View style={styles.selectButtonArrow}>
                        <ChevronDownIcon />
                      </View>
                    </Pressable>

                    <SelectBottomSheet
                      onClose={() => setOpenDropdown('')}
                      onSelect={handleSelectVariety}
                      options={varietyOptions}
                      title="Выберите сорт"
                      visible={openDropdown === 'variety'}
                    />
                  </>
                )}
              </View>

              <View style={styles.field}>
                {showIdentityAsText ? (
                  <Text style={styles.readonlyValue}>{cultureForm.sourceMaterial}</Text>
                ) : (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setOpenDropdown(openDropdown === 'sourceMaterial' ? '' : 'sourceMaterial')}
                      style={[
                        styles.selectButton,
                        isRequiredFieldMissing('sourceMaterial') && styles.inputInvalid,
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectButtonText,
                          !cultureForm.sourceMaterial && styles.selectPlaceholder,
                        ]}
                      >
                        {cultureForm.sourceMaterial || 'Выберите источник материала'}
                      </Text>
                      <View style={styles.selectButtonArrow}>
                        <ChevronDownIcon />
                      </View>
                    </Pressable>

                    <SelectBottomSheet
                      customInputLabel="Указать свое"
                      customInputPlaceholder="Введите источник материала"
                      customInputValue={
                        sourceMaterialOptions.includes(cultureForm.sourceMaterial)
                          ? ''
                          : cultureForm.sourceMaterial
                      }
                      onChangeCustomInput={(value) => updateCultureForm('sourceMaterial', value)}
                      onClose={() => setOpenDropdown('')}
                      onSelect={(option) => {
                        updateCultureForm('sourceMaterial', option);
                        setOpenDropdown('');
                      }}
                      options={sourceMaterialOptions.filter((option) => option !== 'Другое')}
                      title="Выберите источник материала"
                      visible={openDropdown === 'sourceMaterial'}
                    />
                  </>
                )}
              </View>

              {isCultureIntroStage && (
                <View style={styles.field}>
                  <Text style={styles.label}>Гормон *</Text>
                  {showIdentityAsText ? (
                    <Text style={styles.readonlyValue}>{cultureForm.hasHormone ? 'Есть' : 'Нет'}</Text>
                  ) : (
                    <View style={styles.toggleRow}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => updateCultureForm('hasHormone', true)}
                        style={[
                          styles.toggleButton,
                          cultureForm.hasHormone && styles.toggleButtonActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.toggleButtonText,
                            cultureForm.hasHormone && styles.toggleButtonTextActive,
                          ]}
                        >
                          Есть
                        </Text>
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        onPress={() => updateCultureForm('hasHormone', false)}
                        style={[
                          styles.toggleButton,
                          !cultureForm.hasHormone && styles.toggleButtonActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.toggleButtonText,
                            !cultureForm.hasHormone && styles.toggleButtonTextActive,
                          ]}
                        >
                          Нет
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.field}>
                <Text style={styles.label}>Количество *</Text>
                {isEditingCard ? (
                  <Text style={styles.readonlyValue}>{cultureForm.quantity}</Text>
                ) : (
                    <TextInput
                      inputMode="numeric"
                      keyboardType="numeric"
                      onChangeText={(value) => updateCultureForm('quantity', value)}
                      placeholderTextColor="#7C8A80"
                      style={[
                        styles.input,
                      isRequiredFieldMissing('quantity') && styles.inputInvalid,
                    ]}
                    value={cultureForm.quantity}
                  />
                )}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Местоположение</Text>
                {showIdentityAsText ? (
                  <Text style={styles.readonlyValue}>
                    {cultureForm.locationDescription || 'Не указано'}
                  </Text>
                ) : (
                  <TextInput
                    editable={canEditCurrentIdentity}
                    onChangeText={(value) => updateCultureForm('locationDescription', value)}
                    placeholderTextColor="#7C8A80"
                    style={[
                      styles.input,
                      !canEditCurrentIdentity && styles.inputDisabled,
                    ]}
                    value={cultureForm.locationDescription}
                  />
                )}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Код партии *</Text>
                {showIdentityAsText ? (
                  <Text style={styles.readonlyValue}>{cultureForm.code}</Text>
                ) : (
                  <View style={styles.codeInputRow}>
                    <TextInput
                      autoCapitalize="characters"
                      editable={canEditCurrentIdentity}
                      onChangeText={(value) => updateCultureForm('code', value)}
                      placeholderTextColor="#7C8A80"
                      style={[
                        styles.input,
                        styles.codeInput,
                        !canEditCurrentIdentity && styles.inputDisabled,
                        isRequiredFieldMissing('code') && styles.inputInvalid,
                      ]}
                      value={cultureForm.code}
                    />
                    <Pressable
                      accessibilityLabel={isEditingCard ? 'Сгенерировать новый код партии' : 'Сгенерировать код партии'}
                      accessibilityRole="button"
                      disabled={!canEditCurrentIdentity}
                      onPress={handleGenerateCode}
                      style={({ pressed }) => [
                        styles.generateButton,
                        !canEditCurrentIdentity && styles.generateButtonDisabled,
                        pressed && styles.pressedButton,
                      ]}
                    >
                      <QrGenerateIcon
                        color={canEditCurrentIdentity ? '#15863F' : '#9CA3AF'}
                        size={28}
                      />
                    </Pressable>
                  </View>
                )}
              </View>

            </View>

            <View style={styles.cultureFormFooter}>
              {!!formError && <Text style={styles.errorText}>{formError}</Text>}

              {canSaveCultureForm && (
                <Pressable
                  accessibilityRole="button"
                  disabled={isSaving}
                  onPress={handleSavePress}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.pressedButton,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>
                    {isEditingCard ? 'Сохранить настройки' : isCultureIntroStage ? 'Создать партию' : 'Сохранить'}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const localStyles = {
  photoActionButton: {
    flex: 1,
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoCountText: {
    color: '#7C8A80',
    fontSize: 12,
    fontWeight: '700',
  },
  photoField: {
    gap: 12,
  },
  photoHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  photoReadonlyBlock: {
    gap: 10,
  },
  photoThumb: {
    height: 72,
    width: 72,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#EEF2F0',
    borderColor: '#DCE7DE',
    borderWidth: 1,
  },
  photoThumbImage: {
    height: '100%',
    width: '100%',
  },
  photoThumbPressable: {
    height: '100%',
    width: '100%',
  },
  photoThumbRemoveButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(217, 45, 32, 0.92)',
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    position: 'absolute',
    right: 4,
    top: 4,
    width: 20,
  },
  photoThumbRemoveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 14,
    marginTop: -1,
  },
  photoThumbStrip: {
    gap: 8,
  },
  photoRemoveButton: {
    borderColor: '#D92D20',
    flexShrink: 0,
    paddingHorizontal: 16,
  },
  photoRemoveButtonText: {
    color: '#D92D20',
    fontSize: 14,
    fontWeight: '800',
  },
};
