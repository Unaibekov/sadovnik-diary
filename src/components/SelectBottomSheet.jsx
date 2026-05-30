import { useRef } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import styles from '../../styles';

const SWIPE_CLOSE_DISTANCE = 80;

export default function SelectBottomSheet({
  visible,
  title,
  options,
  customInputLabel,
  customInputPlaceholder,
  customInputValue,
  getKey = (option) => String(option),
  getLabel = (option) => String(option),
  onChangeCustomInput,
  onClose,
  onSelect,
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => (
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 8
      ),
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > SWIPE_CLOSE_DISTANCE || gestureState.vy > 0.8) {
          translateY.setValue(0);
          onClose();
          return;
        }

        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.bottomSheetRoot}>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={styles.bottomSheetBackdrop}
        />
        <Animated.View
          style={[
            styles.bottomSheetPanel,
            { transform: [{ translateY }] },
          ]}
        >
          <View {...panResponder.panHandlers}>
            <View style={styles.bottomSheetHandle} />
            {title ? (
              <Text style={styles.bottomSheetTitle}>{title}</Text>
            ) : null}
          </View>
          <ScrollView
            contentContainerStyle={styles.bottomSheetOptions}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {options.map((option) => {
              const key = getKey(option);

              return (
                <Pressable
                  accessibilityRole="button"
                  key={key}
                  onPress={() => onSelect(option)}
                  style={({ pressed }) => [
                    styles.bottomSheetOption,
                    pressed && styles.linkButtonPressed,
                  ]}
                >
                  <Text style={styles.bottomSheetOptionText}>
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
      </View>
    </Modal>
  );
}
