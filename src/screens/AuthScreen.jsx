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
import { LogoIcon } from '../components/icons';

export default function AuthScreen({
  error,
  firstName,
  focusedField,
  lastName,
  onFirstNameChange,
  onFocusedFieldChange,
  onLastNameChange,
  onLogin,
  safeAreaInsets,
}) {
  return (
    <SafeAreaView style={[styles.safeArea, styles.authSafeArea]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[
            styles.screen,
            {
              paddingBottom: Math.max((safeAreaInsets?.bottom || 0) + 32, 40),
              paddingTop: Math.max((safeAreaInsets?.top || 0) + 32, 40),
            },
          ]}>
            <View style={styles.brand}>
              <View style={styles.logoMark}>
                <LogoIcon size={44} />
              </View>
              <View style={styles.header}>
                <Text style={styles.title}>Sadovnik Diary</Text>
              </View>
            </View>

            <View style={styles.authPanel}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>ЛОГИН</Text>
              </View>

              <View style={styles.form}>
                <View style={styles.field}>
                  <TextInput
                    autoCapitalize="words"
                    autoCorrect={false}
                    inputMode="text"
                    onBlur={() => onFocusedFieldChange('')}
                    onChangeText={onFirstNameChange}
                    onFocus={() => onFocusedFieldChange('firstName')}
                    placeholder="Введите имя"
                    placeholderTextColor="#9AA3AF"
                    returnKeyType="next"
                    style={[
                      styles.authInput,
                      focusedField === 'firstName' && styles.authInputFocused,
                    ]}
                    value={firstName}
                  />
                </View>

                <View style={styles.field}>
                  <View style={styles.passwordRow}>
                    <Text style={styles.label}>ПАРОЛЬ</Text>
                    <Text style={styles.forgotPasswordText}>Забыли пароль?</Text>
                  </View>
                  <TextInput
                    autoCapitalize="words"
                    autoCorrect={false}
                    inputMode="text"
                    onBlur={() => onFocusedFieldChange('')}
                    onChangeText={onLastNameChange}
                    onFocus={() => onFocusedFieldChange('lastName')}
                    placeholder="Введите фамилию"
                    placeholderTextColor="#9AA3AF"
                    returnKeyType="done"
                    style={[
                      styles.authInput,
                      focusedField === 'lastName' && styles.authInputFocused,
                    ]}
                    value={lastName}
                  />
                </View>

                {!!error && <Text style={styles.errorText}>{error}</Text>}

                <Pressable
                  accessibilityRole="button"
                  onPress={onLogin}
                  style={({ pressed }) => [
                    styles.authPrimaryButton,
                    pressed && styles.pressedButton,
                  ]}
                >
                  <Text style={styles.authPrimaryButtonText}>ВОЙТИ</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
