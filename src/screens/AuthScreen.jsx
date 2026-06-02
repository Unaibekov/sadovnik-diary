import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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
  const brandProgress = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formShift = useRef(new Animated.Value(70)).current;

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
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(formOpacity, {
          duration: 700,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(formShift, {
          duration: 860,
          easing: Easing.inOut(Easing.cubic),
          toValue: 0,
          useNativeDriver: true,
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
  const topZoneFlex = brandProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.6],
  });
  const bottomZoneFlex = brandProgress.interpolate({
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
          behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
          style={authStyles.keyboardView}
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
                    onPress={onSubmitLogin}
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
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}

const authStyles = StyleSheet.create({
  authFullScreen: {
    backgroundColor: '#091C10',
    flex: 1,
    height: '100%',
    overflow: 'hidden',
    width: '100%',
  },
  authBg: {
    flex: 1,
    height: '100%',
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
    ...Platform.select({
      android: {
        elevation: 12,
        shadowColor: '#102015',
      },
      default: {
        shadowColor: '#102015',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
      },
    }),
  },
  authPanelFloating: {
    alignSelf: 'stretch',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    height: '100%',
    paddingHorizontal: 24,
    paddingTop: 24,
    width: '100%',
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
    ...Platform.select({
      android: {
        elevation: 4,
        shadowColor: '#101828',
      },
      default: {
        shadowColor: '#101828',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
    }),
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
    ...Platform.select({
      android: {
        elevation: 7,
        shadowColor: '#15863F',
      },
      default: {
        shadowColor: '#15863F',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 12,
      },
    }),
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
