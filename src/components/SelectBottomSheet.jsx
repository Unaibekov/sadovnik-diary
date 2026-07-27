// Универсальная нижняя панель выбора значения.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  ScrollView,
  Text,
  TextInput,
  Platform,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styles from '../../styles';

const SWIPE_CLOSE_DISTANCE = 80;
const ANIMATION_DURATION = 220;
const supportsNativeDriver = Platform.OS !== 'web';

export default function SelectBottomSheet({
  visible,
  title,
  options,
  selectedKey,
  customInputLabel,
  customInputPlaceholder,
  customInputValue,
  getKey = (option) => String(option),
  getLabel = (option) => String(option),
  onChangeCustomInput,
  onClose,
  onSelect,
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const [isMounted, setIsMounted] = useState(visible);

  const translateY = useRef(new Animated.Value(height)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);

  const openSheet = useCallback(() => {
    setIsMounted(true);
    isClosingRef.current = false;

    translateY.setValue(height);
    backdropOpacity.setValue(0);

    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: supportsNativeDriver,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: supportsNativeDriver,
        }),
      ]).start();
    });
  }, [backdropOpacity, height, translateY]);

  const closeSheet = useCallback(() => {
    if (isClosingRef.current) {
      return;
    }

    isClosingRef.current = true;

    let finished = false;
    const finishClose = () => {
      if (finished) {
        return;
      }

      finished = true;
      setIsMounted(false);
      isClosingRef.current = false;
      onClose();
    };

    const fallbackTimer = setTimeout(finishClose, ANIMATION_DURATION + 120);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: height,
        duration: ANIMATION_DURATION,
        useNativeDriver: supportsNativeDriver,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: supportsNativeDriver,
      }),
    ]).start(() => {
      clearTimeout(fallbackTimer);
      finishClose();
    });
  }, [backdropOpacity, height, onClose, translateY]);

  useEffect(() => {
    if (visible) {
      openSheet();
    } else if (isMounted && !isClosingRef.current) {
      closeSheet();
    }
  }, [visible, isMounted, openSheet, closeSheet]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
          gestureState.dy > 8,

        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            translateY.setValue(gestureState.dy);
          }
        },

        onPanResponderRelease: (_, gestureState) => {
          if (
            gestureState.dy > SWIPE_CLOSE_DISTANCE ||
            gestureState.vy > 0.8
          ) {
            closeSheet();
            return;
          }

          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: supportsNativeDriver,
          }).start();
        },
      }),
    [closeSheet, translateY],
  );

  if (!isMounted) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      onRequestClose={closeSheet}
      transparent
      visible={isMounted}
    >
      <View style={styles.bottomSheetRoot}>
        <Animated.View
          style={[
            styles.bottomSheetBackdrop,
            { opacity: backdropOpacity },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            onPress={closeSheet}
            style={{ flex: 1 }}
          />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <Animated.View
            style={[
              styles.bottomSheetPanel,
              {
                paddingBottom: insets.bottom + 16,
                transform: [{ translateY }],
              },
            ]}
          >
            <View {...panResponder.panHandlers}>
              <View style={styles.bottomSheetHandle} />

              {title ? (
                <Text style={styles.bottomSheetTitle}>{title}</Text>
              ) : null}
            </View>

            <ScrollView
              contentContainerStyle={[
                styles.bottomSheetOptions,
                { paddingBottom: insets.bottom + 24 },
              ]}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {options.map((option) => {
                const key = getKey(option);
                const isSelected = selectedKey !== undefined && key === selectedKey;

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={key}
                    onPress={() => {
                      onSelect(option);
                      closeSheet();
                    }}
                    style={({ pressed }) => [
                      styles.bottomSheetOption,
                      isSelected && sheetStyles.bottomSheetOptionSelected,
                      pressed && styles.linkButtonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.bottomSheetOptionText,
                        isSelected && sheetStyles.bottomSheetOptionTextSelected,
                      ]}
                    >
                      {getLabel(option)}
                    </Text>
                  </Pressable>
                );
              })}

              {onChangeCustomInput ? (
                <View style={styles.bottomSheetCustomField}>
                  {customInputLabel ? (
                    <Text style={styles.bottomSheetCustomLabel}>
                      {customInputLabel}
                    </Text>
                  ) : null}

                  <TextInput
                    onChangeText={onChangeCustomInput}
                    placeholder={customInputPlaceholder}
                    placeholderTextColor="#7C8A80"
                    style={styles.bottomSheetInput}
                    value={customInputValue}
                  />
                </View>
              ) : null}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  bottomSheetOptionSelected: {
    backgroundColor: '#F0FAF4',
  },
  bottomSheetOptionText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  bottomSheetOptionTextSelected: {
    color: '#15863F',
    fontWeight: '700',
  },
});
