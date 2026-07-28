// Экран ввода PIN-кода и биометрического входа.
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogoElementIcon } from '../components/icons';

function PinDots({ length }) {
  return (
    <View style={pinStyles.pinDotsRow}>
      {Array.from({ length: 4 }).map((_, index) => (
        <View
          key={index}
          style={[pinStyles.pinDot, index < length && pinStyles.pinDotFilled]}
        />
      ))}
    </View>
  );
}

function PinKey({ label, onPress, wide = false, disabled = false, variant = 'default' }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        pinStyles.pinKey,
        wide && pinStyles.pinKeyWide,
        variant === 'ghost' && pinStyles.pinKeyGhost,
        disabled && pinStyles.pinKeyDisabled,
        pressed && !disabled && pinStyles.pressedButton,
      ]}
    >
      {typeof label === 'string' ? (
        <Text
          style={[
            pinStyles.pinKeyText,
            variant === 'ghost' && pinStyles.pinKeyGhostText,
            disabled && pinStyles.pinKeyDisabledText,
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

export default function PinCodeScreen({
  authPinStep = 'unlock',
  biometricDescription = '',
  error = '',
  isBiometricAvailable = false,
  isBiometricEnabled = false,
  isBiometricPromptVisible = false,
  notice = '',
  onEnableBiometricPress,
  onQuickAuthBiometricSubmit,
  onQuickAuthKeyPress,
  onQuickAuthSubmit,
  onResetQuickAuthPress,
  onSkipBiometricPress,
  quickAuthPinInput = '',
}) {
  const pinStepTitle = useMemo(() => {
    if (authPinStep === 'confirm') {
      return 'Повторите пин-код';
    }

    if (authPinStep === 'setup') {
      return 'Придумайте пин-код';
    }

    return 'Введите пин-код';
  }, [authPinStep]);

  const pinStepSubtitle = useMemo(() => {
    if (authPinStep === 'confirm') {
      return 'Введите код еще раз для подтверждения';
    }

    if (authPinStep === 'setup') {
      return 'Используйте 4 цифры. После этого можно включить Face ID или отпечаток пальца.';
    }

    return 'Введите 4-значный код для входа';
  }, [authPinStep]);

  return (
    <SafeAreaView style={pinStyles.screen}>
      <StatusBar style="light" />
      <ImageBackground
        source={require('../../assets/img/authBg.jpg')}
        resizeMode="cover"
        style={pinStyles.bg}
      >
        <View style={pinStyles.overlay} />
        <View style={pinStyles.content}>
          <View style={pinStyles.brandArea}>
            <View style={pinStyles.brandIconBox}>
              <LogoElementIcon color="#11863D" size={72} />
            </View>
            <Text style={pinStyles.brandText}>SADOVNIK DIARY</Text>
          </View>

          <View style={pinStyles.sheet}>
            {!isBiometricPromptVisible && (
              <>
                <View style={pinStyles.header}>
                  <Text style={pinStyles.title}>{pinStepTitle}</Text>
                  <Text style={pinStyles.subtitle}>{pinStepSubtitle}</Text>
                </View>

                <PinDots length={quickAuthPinInput?.length ?? 0} />

                {!!error && <Text style={pinStyles.errorText}>{error}</Text>}
                {!!notice && !error && <Text style={pinStyles.noticeText}>{notice}</Text>}
              </>
            )}

            {isBiometricPromptVisible ? (
              <View style={pinStyles.biometricCard}>
                <Text style={pinStyles.biometricTitle}>Включить биометрию?</Text>
                <Text style={pinStyles.biometricText}>
                  {biometricDescription
                    ? `Можно включить ${biometricDescription} для быстрого входа.`
                    : 'Можно включить биометрию для быстрого входа.'}
                </Text>
                <View style={pinStyles.actionRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={onEnableBiometricPress}
                    style={({ pressed }) => [
                      pinStyles.primaryAction,
                      pressed && pinStyles.pressedButton,
                    ]}
                  >
                    <Text style={pinStyles.primaryActionText}>Да, включить</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={onSkipBiometricPress}
                    style={({ pressed }) => [
                      pinStyles.secondaryAction,
                      pressed && pinStyles.pressedButton,
                    ]}
                  >
                    <Text style={pinStyles.secondaryActionText}>Позже</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={pinStyles.keypad}>
                <View style={pinStyles.row}>
                  <PinKey label="1" onPress={() => onQuickAuthKeyPress('1')} />
                  <PinKey label="2" onPress={() => onQuickAuthKeyPress('2')} />
                  <PinKey label="3" onPress={() => onQuickAuthKeyPress('3')} />
                </View>
                <View style={pinStyles.row}>
                  <PinKey label="4" onPress={() => onQuickAuthKeyPress('4')} />
                  <PinKey label="5" onPress={() => onQuickAuthKeyPress('5')} />
                  <PinKey label="6" onPress={() => onQuickAuthKeyPress('6')} />
                </View>
                <View style={pinStyles.row}>
                  <PinKey label="7" onPress={() => onQuickAuthKeyPress('7')} />
                  <PinKey label="8" onPress={() => onQuickAuthKeyPress('8')} />
                  <PinKey label="9" onPress={() => onQuickAuthKeyPress('9')} />
                </View>
                <View style={pinStyles.row}>
                  <PinKey
                    label="⌫"
                    onPress={() => onQuickAuthKeyPress('delete')}
                    variant="ghost"
                    wide
                  />
                  <PinKey label="0" onPress={() => onQuickAuthKeyPress('0')} />
                  <PinKey
                    label="OK"
                    disabled={(quickAuthPinInput?.length ?? 0) !== 4}
                    onPress={onQuickAuthSubmit}
                    variant="ghost"
                    wide
                  />
                </View>

                {isBiometricEnabled && (
                  <Pressable
                    accessibilityRole="button"
                    disabled={!isBiometricAvailable}
                    onPress={onQuickAuthBiometricSubmit}
                    style={({ pressed }) => [
                      pinStyles.biometricButton,
                      !isBiometricAvailable && pinStyles.biometricButtonDisabled,
                      pressed && isBiometricAvailable && pinStyles.pressedButton,
                    ]}
                  >
                    <Text
                      style={[
                        pinStyles.biometricButtonText,
                        !isBiometricAvailable && pinStyles.biometricButtonTextDisabled,
                      ]}
                    >
                      Войти по биометрии
                    </Text>
                  </Pressable>
                )}

                {!!biometricDescription && (
                  <Text style={pinStyles.hint}>Доступно: {biometricDescription}</Text>
                )}
                {!isBiometricAvailable && (
                  <Text style={pinStyles.hintMuted}>
                    Биометрия недоступна на этом устройстве.
                  </Text>
                )}
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              onPress={onResetQuickAuthPress}
              style={({ pressed }) => [
                pinStyles.resetButton,
                pressed && pinStyles.pressedButton,
              ]}
            >
              <Text style={pinStyles.resetButtonText}>Сбросить PIN и войти по логину</Text>
            </Pressable>
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const pinStyles = StyleSheet.create({
  screen: {
    backgroundColor: '#091C10',
    flex: 1,
    overflow: 'hidden',
    width: '100%',
  },
  bg: {
    flex: 1,
    overflow: 'hidden',
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0000002A',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 22,
    paddingHorizontal: 20,
    paddingTop: 36,
  },
  brandArea: {
    alignItems: 'center',
    gap: 14,
    paddingTop: 12,
  },
  brandIconBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    height: 88,
    justifyContent: 'center',
    width: 88,
  },
  brandText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.2,
    lineHeight: 28,
    textAlign: 'center',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#F0F2F4',
    boxShadow: '0px -10px 24px rgba(16, 32, 21, 0.08)',
    gap: 18,
    paddingHorizontal: 20,
    paddingTop: 26,
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
  subtitle: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  pinDotsRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 12,
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
  keypad: {
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
  biometricText: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 20,
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
    fontSize: 16,
    fontWeight: '700',
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
    fontSize: 16,
    fontWeight: '700',
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
  biometricButtonDisabled: {
    backgroundColor: '#F2F4F7',
    borderColor: '#E4E7EC',
    opacity: 1,
  },
  biometricButtonText: {
    color: '#15863F',
    fontSize: 16,
    fontWeight: '700',
  },
  biometricButtonTextDisabled: {
    color: '#98A2B3',
  },
  hint: {
    color: '#475467',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  hintMuted: {
    color: '#98A2B3',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  resetButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#FFF5F5',
    borderColor: '#FECACA',
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 50,
    marginTop: 8,
    paddingHorizontal: 16,
  },
  resetButtonText: {
    color: '#B42318',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
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
  pressedButton: {
    opacity: 0.82,
  },
});
