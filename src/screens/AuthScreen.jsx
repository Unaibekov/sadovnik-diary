// Экран входа в приложение.
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  EyeOffIcon,
  EyeOnIcon,
  LogoElementIcon,
  LoginInputIcon,
  PasswordInputIcon,
} from '../components/icons';

export default function AuthScreen({
  error,
  login,
  focusedField,
  password,
  onLoginChange,
  onFocusedFieldChange,
  onPasswordChange,
  onSubmitLogin,
  safeAreaInsets,
}) {
  const [isLogoFinal, setIsLogoFinal] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isAndroid = Platform.OS === 'android';
  const useNativeDriver = Platform.OS !== 'web';
  const brandProgress = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formShift = useRef(new Animated.Value(70)).current;
  const submitLoginRef = useRef(onSubmitLogin);

  useEffect(() => {
    submitLoginRef.current = onSubmitLogin;
  }, [onSubmitLogin]);

  const handleSubmitPress = () => {
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
          useNativeDriver,
        }),
      ]),
      Animated.parallel([
        Animated.timing(formOpacity, {
          duration: 700,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver,
        }),
        Animated.timing(formShift, {
          duration: 860,
          easing: Easing.inOut(Easing.cubic),
          toValue: 0,
          useNativeDriver,
        }),
      ]),
    ]).start();

    return () => {
      brandProgress.removeListener(listenerId);
    };
  }, [brandProgress, formOpacity, formShift, titleOpacity]);

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
    outputRange: [116, 77.33],
  });
  const logoBoxRadius = brandProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 16],
  });
  const topZoneFlex = isAndroid
    ? 1
    : brandProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.6],
      });
  const bottomZoneFlex = isAndroid
    ? 0.42
    : brandProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.4],
      });

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
          <ScrollView
            style={authStyles.authScroll}
            contentContainerStyle={authStyles.authScrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View style={authStyles.authScene}>
              <Animated.View style={[authStyles.authTopZone, { flex: topZoneFlex }]}>
                <View style={authStyles.authBrandStart}>
                  <Animated.View
                    style={[
                      authStyles.authLogoOutline,
                      {
                        borderRadius: logoBoxRadius,
                        backgroundColor: logoBackgroundColor,
                        borderColor: logoBorderColor,
                        height: logoBoxSize,
                        width: logoBoxSize,
                      },
                    ]}
                  >
                    <LogoElementIcon color={isLogoFinal ? '#11863D' : '#FFFFFF'} size={72} />
                  </Animated.View>
                  <Animated.View style={[authStyles.authBrandFinal, { opacity: titleOpacity }]}>
                    <Text style={authStyles.authBrandText}>SADOVNIK DIARY</Text>
                  </Animated.View>
                </View>
              </Animated.View>

              <Animated.View style={[authStyles.authBottomZone, { flex: bottomZoneFlex }]}>
                <Animated.View
                  style={[
                    authStyles.authPanel,
                    authStyles.authPanelFloating,
                    {
                      opacity: formOpacity,
                      paddingBottom: Math.max((safeAreaInsets?.bottom || 0) + 18, 20),
                      transform: [{ translateY: formShift }],
                    },
                  ]}
                >
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

                    {!!error && <Text style={authStyles.errorText}>{error}</Text>}

                    <Pressable
                      accessibilityRole="button"
                      onPress={handleSubmitPress}
                      style={({ pressed }) => [
                        authStyles.authPrimaryButton,
                        pressed && authStyles.pressedButton,
                      ]}
                    >
                      <Text style={authStyles.authPrimaryButtonText}>ВОЙТИ</Text>
                    </Pressable>

                    <Pressable accessibilityRole="button">
                      <Text style={authStyles.forgotPasswordTextCenter}>Забыли пароль?</Text>
                    </Pressable>
                  </View>
                </Animated.View>
              </Animated.View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  authScroll: {
    flex: 1,
    width: '100%',
  },
  authScrollContent: {
    flexGrow: 1,
  },
  authScene: {
    alignSelf: 'stretch',
    flex: 1,
    overflow: 'hidden',
    width: '100%',
  },
  authTopZone: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  authBottomZone: {
    justifyContent: 'flex-end',
    overflow: 'visible',
    width: '100%',
  },
  authBrandStart: {
    alignItems: 'center',
  },
  authBrandFinal: {
    alignItems: 'center',
    marginTop: 14,
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
    borderRadius: 24,
    borderWidth: 1,
    paddingBottom: 28,
    paddingHorizontal: 24,
    paddingTop: 26,
    boxShadow: '0px 14px 24px 0px rgba(16, 32, 21, 0.06)',
  },
  authPanelFloating: {
    alignSelf: 'stretch',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 24,
    paddingTop: 24,
    width: '100%',
    height: Platform.OS === 'android' ? undefined : '100%',
  },
  form: {
    gap: 22,
  },
  authInputsGroup: {
    gap: 10,
  },
  field: {
    gap: 6,
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
    paddingHorizontal: 17,
    paddingLeft: 49,
  },
  errorText: {
    color: '#B42318',
    fontSize: 14,
    lineHeight: 20,
  },
  authPrimaryButton: {
    alignItems: 'center',
    backgroundColor: '#15863F',
    borderRadius: 999,
    justifyContent: 'center',
    marginTop: 4,
    minHeight: 58,
    paddingHorizontal: 18,
    boxShadow: '0px 8px 12px 0px rgba(21, 134, 63, 0.14)',
  },
  authPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  forgotPasswordTextCenter: {
    color: '#15863F',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    textAlign: 'center',
  },
  pressedButton: {
    opacity: 0.82,
  },
});
