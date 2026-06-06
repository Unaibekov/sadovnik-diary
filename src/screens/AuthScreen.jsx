// Экран входа по логину, паролю и PIN.
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DeleteIcon,
  EyeOffIcon,
  EyeOnIcon,
  LogoElementIcon,
  LoginInputIcon,
  PasswordInputIcon,
  TouchIdIcon,
} from '../components/icons';

function PinKey({
  label,
  onPress,
  wide = false,
  disabled = false,
  variant = 'default',
  haptic = false,
}) {
  const handlePress = () => {
    if (haptic) {
      Vibration.vibrate(12);
    }

    onPress?.();
  };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      android_ripple={
        Platform.OS === 'android' && !disabled
          ? { color: 'rgba(21, 134, 63, 0.14)', borderless: false }
          : undefined
      }
      onPress={handlePress}
      style={({ pressed }) => [
        authStyles.pinKey,
        wide && authStyles.pinKeyWide,
        variant === 'ghost' && authStyles.pinKeyGhost,
        disabled && authStyles.pinKeyDisabled,
        pressed && !disabled && authStyles.pinKeyPressed,
      ]}
    >
      {typeof label === 'string' ? (
        <Text
          style={[
            authStyles.pinKeyText,
            variant === 'ghost' && authStyles.pinKeyGhostText,
            disabled && authStyles.pinKeyDisabledText,
          ]}
        >
          {label}
        </Text>
      ) : (
        label
      )}
    </Pressable>
  );
}

export default function AuthScreen({
  authMode = 'credentials',
  authPinStep = 'unlock',
  error,
  focusedField,
  isBiometricAvailable = false,
  isBiometricEnabled = false,
  isBiometricPromptVisible = false,
  login,
  notice,
  onEnableBiometricPress,
  onFocusedFieldChange,
  onLoginChange,
  onPasswordChange,
  onResetPermanentPassword,
  onQuickAuthBiometricSubmit,
  onQuickAuthKeyPress,
  onQuickAuthSubmit,
  onBackFromQuickAuthPress,
  onResetQuickAuthPress,
  onSkipBiometricPress,
  onSubmitLogin,
  password,
  quickAuthPinInput = '',
  safeAreaInsets,
}) {
  const windowHeight = useWindowDimensions().height;
  const [isLogoFinal, setIsLogoFinal] = useState(false);
  const [isForgotPasswordVisible, setIsForgotPasswordVisible] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPinMode = authMode !== 'credentials';
  const brandProgress = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const panelHeight = useRef(new Animated.Value(0)).current;
  const panelOpacity = useRef(new Animated.Value(0)).current;
  const submitLoginRef = useRef(onSubmitLogin);
  const initializedRef = useRef(false);

  const loginPanelHeight = Math.max(Math.round(windowHeight * 0.46), 340);
  const pinPanelHeight = Math.max(Math.round(windowHeight * 0.65), 440);
  const targetPanelHeight = isPinMode ? pinPanelHeight : loginPanelHeight;

  useEffect(() => {
    submitLoginRef.current = onSubmitLogin;
  }, [onSubmitLogin]);

  useEffect(() => {
    const listenerId = brandProgress.addListener(({ value }) => {
      setIsLogoFinal(value >= 0.55);
    });

    Animated.sequence([
      Animated.delay(900),
      Animated.parallel([
        Animated.timing(brandProgress, {
          duration: 900,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: false,
        }),
        Animated.timing(titleOpacity, {
          duration: 700,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: false,
        }),
      ]),
      Animated.parallel([
        Animated.timing(panelHeight, {
          duration: 860,
          easing: Easing.inOut(Easing.cubic),
          toValue: targetPanelHeight,
          useNativeDriver: false,
        }),
        Animated.timing(panelOpacity, {
          duration: 700,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: false,
        }),
      ]),
    ]).start(() => {
      initializedRef.current = true;
    });

    return () => {
      brandProgress.removeListener(listenerId);
    };
  }, [brandProgress, panelHeight, panelOpacity, targetPanelHeight, titleOpacity]);

  useEffect(() => {
    if (!initializedRef.current) {
      return;
    }

    Animated.timing(panelHeight, {
      duration: 420,
      easing: Easing.inOut(Easing.cubic),
      toValue: targetPanelHeight,
      useNativeDriver: false,
    }).start();
  }, [panelHeight, targetPanelHeight]);

  const handleSubmitPress = () => {
    if (isPinMode) {
      onQuickAuthSubmit();
      return;
    }

    if (Platform.OS !== 'android') {
      onSubmitLogin();
      return;
    }

    const subscription = Keyboard.addListener('keyboardDidHide', () => {
      subscription.remove();
      submitLoginRef.current();
    });

    Keyboard.dismiss();
  };

  const logoBackgroundColor = brandProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0)', '#FFFFFF'],
  });
  const logoBorderColor = brandProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FFFFFF', '#FFFFFF'],
  });
  const logoBoxSize = brandProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [116, 78],
  });
  const logoBoxRadius = brandProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 16],
  });

  const renderCredentialsForm = () => (
    <View style={authStyles.form}>
      <View style={authStyles.authInputsGroup}>
        <View style={authStyles.field}>
          <View style={authStyles.authInputRow}>
            <View style={authStyles.authInputIcon}>
              <LoginInputIcon color="#9AA3AF" size={18} />
            </View>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              inputMode="text"
              onBlur={() => onFocusedFieldChange('')}
              onChangeText={onLoginChange}
              onFocus={() => onFocusedFieldChange('login')}
              placeholder="Логин"
              placeholderTextColor="#9AA3AF"
              returnKeyType="next"
              style={[
                authStyles.authInput,
                authStyles.authInputWithIcon,
                focusedField === 'login' && authStyles.authInputFocused,
              ]}
              value={login}
            />
          </View>
        </View>

        <View style={authStyles.field}>
          <View style={authStyles.authInputRow}>
            <View style={authStyles.authInputIcon}>
              <PasswordInputIcon color="#9AA3AF" size={18} />
            </View>
            <Pressable
              accessibilityLabel={isPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'}
              accessibilityRole="button"
              onPress={() => setIsPasswordVisible((current) => !current)}
              style={authStyles.authInputRightIcon}
            >
              {isPasswordVisible ? (
                <EyeOnIcon color="#9AA3AF" size={20} />
              ) : (
                <EyeOffIcon color="#9AA3AF" size={20} />
              )}
            </Pressable>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              inputMode="text"
              onBlur={() => onFocusedFieldChange('')}
              onChangeText={onPasswordChange}
              onFocus={() => onFocusedFieldChange('password')}
              onSubmitEditing={handleSubmitPress}
              placeholder="Пароль"
              placeholderTextColor="#9AA3AF"
              returnKeyType="done"
              secureTextEntry={!isPasswordVisible}
              style={[
                authStyles.authInput,
                authStyles.authInputWithIcon,
                authStyles.authInputWithRightIcon,
                focusedField === 'password' && authStyles.authInputFocused,
              ]}
              value={password}
            />
          </View>
        </View>
      </View>

      <View style={authStyles.authMessageSlot}>
        {!!error && <Text style={authStyles.errorText}>{error}</Text>}
        {!!notice && !error && <Text style={authStyles.noticeText}>{notice}</Text>}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={handleSubmitPress}
        style={({ pressed }) => [
          authStyles.authPrimaryButton,
          pressed && authStyles.pressedButton,
        ]}
      >
        <Text style={authStyles.authPrimaryButtonText}>Войти</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => setIsForgotPasswordVisible(true)}
        style={({ pressed }) => [
          authStyles.forgotPasswordLink,
          pressed && authStyles.forgotPasswordLinkPressed,
        ]}
      >
        <Text style={authStyles.forgotPasswordLinkText}>Забыли пароль?</Text>
      </Pressable>
    </View>
  );

  const renderPinForm = () => (
    <View style={authStyles.pinContent}>
      {!isBiometricPromptVisible && (
        <>
          <View style={authStyles.header}>
            <Text style={authStyles.title}>
              {authPinStep === 'confirm'
                ? 'Повторите пин-код'
                : authPinStep === 'setup'
                  ? 'Придумайте пин-код'
                  : 'Введите пин-код'}
            </Text>
          </View>

          <View style={authStyles.pinDotsRow}>
            {Array.from({ length: 4 }).map((_, index) => (
              <View
                key={index}
                style={[authStyles.pinDot, index < quickAuthPinInput.length && authStyles.pinDotFilled]}
              />
            ))}
          </View>

          <View style={authStyles.pinMessageSlot}>
            {!!error && <Text style={authStyles.errorText}>{error}</Text>}
            {!!notice && !error && <Text style={authStyles.noticeText}>{notice}</Text>}
          </View>
        </>
      )}

      <View style={authStyles.pinKeypad}>
          <View style={authStyles.row}>
            <PinKey label="1" haptic onPress={() => onQuickAuthKeyPress('1')} />
            <PinKey label="2" haptic onPress={() => onQuickAuthKeyPress('2')} />
            <PinKey label="3" haptic onPress={() => onQuickAuthKeyPress('3')} />
          </View>
          <View style={authStyles.row}>
            <PinKey label="4" haptic onPress={() => onQuickAuthKeyPress('4')} />
            <PinKey label="5" haptic onPress={() => onQuickAuthKeyPress('5')} />
            <PinKey label="6" haptic onPress={() => onQuickAuthKeyPress('6')} />
          </View>
          <View style={authStyles.row}>
            <PinKey label="7" haptic onPress={() => onQuickAuthKeyPress('7')} />
            <PinKey label="8" haptic onPress={() => onQuickAuthKeyPress('8')} />
            <PinKey label="9" haptic onPress={() => onQuickAuthKeyPress('9')} />
          </View>
          <View style={authStyles.row}>
            <PinKey
              label={<DeleteIcon color="#15863F" size={24} />}
              haptic
              onPress={() => onQuickAuthKeyPress('delete')}
              variant="ghost"
              wide
            />
            <PinKey label="0" haptic onPress={() => onQuickAuthKeyPress('0')} />
            {isBiometricEnabled && isBiometricAvailable ? (
              <PinKey
                label={<TouchIdIcon color="#15863F" size={24} />}
                onPress={onQuickAuthBiometricSubmit}
                variant="ghost"
                wide
              />
            ) : (
              <View
                style={[
                  authStyles.pinKey,
                  authStyles.pinKeyGhost,
                  authStyles.pinKeyPlaceholder,
                  authStyles.pinKeyWide,
                ]}
              />
            )}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={authPinStep === 'unlock' ? onResetQuickAuthPress : onBackFromQuickAuthPress}
            style={({ pressed }) => [
              authStyles.resetLink,
              pressed && authStyles.resetLinkPressed,
            ]}
          >
            <Text style={authStyles.resetLinkText}>
              {authPinStep === 'unlock' ? 'СБРОСИТЬ ПИН-КОД' : 'Назад'}
            </Text>
          </Pressable>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={onSkipBiometricPress}
        transparent
        visible={isBiometricAvailable && isBiometricPromptVisible}
      >
        <View style={authStyles.confirmModalRoot}>
          <Pressable
            accessibilityRole="button"
            onPress={onSkipBiometricPress}
            style={authStyles.confirmModalBackdrop}
          />
          <View style={authStyles.confirmModal}>
            <Text style={authStyles.confirmModalTitle}>Включить биометрию?</Text>
            <Text style={authStyles.confirmModalText}>
              Быстрый вход по Face ID или отпечатку пальца можно включить
              сразу после подтверждения.
            </Text>
            <View style={authStyles.confirmModalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={onSkipBiometricPress}
                style={({ pressed }) => [
                  authStyles.confirmModalButton,
                  authStyles.confirmModalSecondaryButton,
                  pressed && authStyles.pressedButton,
                ]}
              >
                <Text style={authStyles.confirmModalSecondaryText}>Позже</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onEnableBiometricPress}
                style={({ pressed }) => [
                  authStyles.confirmModalButton,
                  authStyles.confirmModalPrimaryButton,
                  pressed && authStyles.pressedButton,
                ]}
              >
                <Text style={authStyles.confirmModalPrimaryText}>Да, включить</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  return (
    <SafeAreaView style={authStyles.authFullScreen}>
      <StatusBar style="light" />
      <ImageBackground
        source={require('../../assets/img/authBg.jpg')}
        resizeMode="cover"
        style={authStyles.authBg}
      >
        <View style={authStyles.authOverlay} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? safeAreaInsets?.top || 0 : 0}
          style={authStyles.keyboardView}
        >
          <View style={authStyles.authScene}>
            <Animated.View
              style={[
                authStyles.authTopZone,
                {
                  bottom: panelHeight,
                },
              ]}
            >
              <View style={authStyles.authBrandStart}>
                <Animated.View
                  style={[
                    authStyles.authLogoOutline,
                    {
                      backgroundColor: logoBackgroundColor,
                      borderColor: logoBorderColor,
                      borderRadius: logoBoxRadius,
                      height: logoBoxSize,
                      width: logoBoxSize,
                    },
                  ]}
                >
                  <LogoElementIcon color={isLogoFinal ? '#11863D' : '#FFFFFF'} size={72} />
                </Animated.View>
                {isPinMode && (
                  <Animated.View style={[authStyles.authBrandPinTitle, { opacity: titleOpacity }]}>
                    <Text style={authStyles.authBrandText}>SADOVNIK DIARY</Text>
                  </Animated.View>
                )}
                {!isPinMode && (
                  <Animated.View style={[authStyles.authBrandFinal, { opacity: titleOpacity }]}>
                    <Text style={authStyles.authBrandText}>SADOVNIK DIARY</Text>
                  </Animated.View>
                )}
              </View>
            </Animated.View>

            <Animated.View
              style={[
                authStyles.authBottomZone,
                {
                  height: panelHeight,
                  opacity: panelOpacity,
                },
              ]}
            >
              <Animated.View
                style={[
                  authStyles.authPanel,
                  isPinMode && authStyles.authPanelPinMode,
                  {
                    paddingBottom: Math.max((safeAreaInsets?.bottom || 0) + 18, 20),
                  },
                ]}
              >
                {isPinMode ? renderPinForm() : renderCredentialsForm()}
              </Animated.View>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>

        <Modal
          animationType="fade"
          onRequestClose={() => setIsForgotPasswordVisible(false)}
          transparent
          visible={isForgotPasswordVisible}
        >
          <View style={authStyles.confirmModalRoot}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsForgotPasswordVisible(false)}
              style={authStyles.confirmModalBackdrop}
            />
            <View style={authStyles.confirmModal}>
              <Text style={authStyles.confirmModalTitle}>Сбросить пароль?</Text>
              <Text style={authStyles.confirmModalText}>
                Данные карточек и стадий сохранятся. Будут сброшены только
                настройки входа.
              </Text>
              <View style={authStyles.confirmModalActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIsForgotPasswordVisible(false)}
                  style={({ pressed }) => [
                    authStyles.confirmModalButton,
                    authStyles.confirmModalSecondaryButton,
                    pressed && authStyles.pressedButton,
                  ]}
                >
                  <Text style={authStyles.confirmModalSecondaryText}>Нет</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={async () => {
                    await onResetPermanentPassword();
                    setIsForgotPasswordVisible(false);
                  }}
                  style={({ pressed }) => [
                    authStyles.confirmModalButton,
                    authStyles.confirmModalPrimaryButton,
                    pressed && authStyles.pressedButton,
                  ]}
                >
                  <Text style={authStyles.confirmModalPrimaryText}>Да</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </ImageBackground>
    </SafeAreaView>
  );
}

const authStyles = StyleSheet.create({
  authFullScreen: {
    backgroundColor: '#091C10',
    flex: 1,
    overflow: 'hidden',
    width: '100%',
  },
  authBg: {
    flex: 1,
    overflow: 'hidden',
    width: '100%',
  },
  authOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0000002A',
  },
  keyboardView: {
    flex: 1,
    overflow: 'hidden',
    width: '100%',
  },
  authScene: {
    flex: 1,
    position: 'relative',
    width: '100%',
  },
  authTopZone: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  authBottomZone: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    width: '100%',
  },
  authBrandStart: {
    alignItems: 'center',
  },
  authBrandFinal: {
    alignItems: 'center',
    marginTop: 14,
  },
  authBrandPinTitle: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: '112%',
  },
  authLogoOutline: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 2,
    height: 116,
    justifyContent: 'center',
    width: 116,
  },
  authBrandText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginTop: 16,
    textAlign: 'center',
  },
  authPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F0F2F4',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    boxShadow: '0px -10px 24px rgba(16, 32, 21, 0.08)',
    height: '100%',
    paddingHorizontal: 24,
    paddingTop: 22,
  },
  authPanelPinMode: {
    paddingTop: 22,
  },
  form: {
    gap: 14,
  },
  authInputsGroup: {
    gap: 8,
  },
  field: {
    gap: 4,
  },
  authInputRow: {
    justifyContent: 'center',
    position: 'relative',
  },
  authInputIcon: {
    left: 18,
    position: 'absolute',
    zIndex: 2,
  },
  authInput: {
    backgroundColor: '#F9FAFB',
    borderColor: '#EEF0F2',
    borderRadius: 16,
    borderWidth: 1,
    color: '#101828',
    fontSize: 16,
    minHeight: 56,
    paddingHorizontal: 18,
    boxShadow: '0px 4px 12px 0px rgba(16, 24, 40, 0.12)',
  },
  authInputWithIcon: {
    paddingLeft: 50,
  },
  authInputWithRightIcon: {
    paddingRight: 50,
  },
  authInputRightIcon: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 14,
    width: 28,
    zIndex: 2,
  },
  authInputFocused: {
    borderColor: '#15863F',
    borderWidth: 2,
    paddingLeft: 49,
    paddingHorizontal: 17,
  },
  errorText: {
    color: '#B42318',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  noticeText: {
    color: '#2563EB',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  authPrimaryButton: {
    alignItems: 'center',
    backgroundColor: '#15863F',
    borderRadius: 999,
    justifyContent: 'center',
    marginTop: 4,
    minHeight: 54,
    paddingHorizontal: 18,
    boxShadow: '0px 8px 12px 0px rgba(21, 134, 63, 0.14)',
  },
  authPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  forgotPasswordLink: {
    alignSelf: 'center',
    marginTop: 10,
  },
  forgotPasswordLinkPressed: {
    opacity: 0.75,
  },
  forgotPasswordLinkText: {
    color: '#15863F',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  authMessageSlot: {
    justifyContent: 'center',
    minHeight: 28,
  },
  pinContent: {
    gap: 18,
    height: '100%',
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#101828',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
    textAlign: 'center',
  },
  pinDotsRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  pinMessageSlot: {
    justifyContent: 'center',
    minHeight: 28,
  },
  pinDot: {
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    height: 14,
    width: 14,
  },
  pinDotFilled: {
    backgroundColor: '#15863F',
  },
  pinKeypad: {
    gap: 12,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  pinKey: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E7ECEF',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 58,
  },
  pinKeyWide: {
    flex: 1,
  },
  pinKeyGhost: {
    backgroundColor: '#FFFFFF',
  },
  pinKeyPlaceholder: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    boxShadow: 'none',
  },
  pinKeyText: {
    color: '#101828',
    fontSize: 20,
    fontWeight: '800',
  },
  pinKeyGhostText: {
    color: '#15863F',
  },
  pinKeyDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  pinKeyDisabledText: {
    color: '#98A2B3',
  },
  biometricCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E7ECEF',
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  biometricTitle: {
    color: '#101828',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: '#15863F',
    borderRadius: 999,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 14,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE4DC',
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 14,
  },
  secondaryActionText: {
    color: '#15863F',
    fontSize: 15,
    fontWeight: '800',
  },
  biometricButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE4DC',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 50,
    marginTop: 8,
    paddingHorizontal: 18,
  },
  biometricButtonText: {
    color: '#15863F',
    fontSize: 15,
    fontWeight: '800',
  },
  resetLink: {
    alignSelf: 'center',
    marginTop: 8,
  },
  resetLinkPressed: {
    opacity: 0.8,
  },
  resetLinkText: {
    color: '#15863F',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressedButton: {
    opacity: 0.82,
  },
  pinKeyPressed: {
    backgroundColor: '#EAF7EF',
    borderColor: '#BEE6CC',
    opacity: 0.9,
    transform: [{ scale: 0.965 }],
  },
  confirmModalRoot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  confirmModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
  },
  confirmModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    gap: 12,
    padding: 20,
  },
  confirmModalTitle: {
    color: '#101828',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  confirmModalText: {
    color: '#667085',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  confirmModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  confirmModalButton: {
    alignItems: 'center',
    borderRadius: 999,
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
  },
  confirmModalSecondaryButton: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E7ECEF',
    borderWidth: 1,
  },
  confirmModalPrimaryButton: {
    backgroundColor: '#15863F',
  },
  confirmModalSecondaryText: {
    color: '#344054',
    fontSize: 15,
    fontWeight: '700',
  },
  confirmModalPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
