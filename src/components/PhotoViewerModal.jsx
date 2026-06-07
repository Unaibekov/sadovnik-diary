import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

export default function PhotoViewerModal({
  initialIndex = 0,
  onClose,
  uris = [],
  visible,
}) {
  const { width, height } = useWindowDimensions();
  const listRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const normalizedUris = useMemo(
    () => (Array.isArray(uris) ? uris.filter(Boolean) : []),
    [uris],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    const nextIndex = Math.min(
      Math.max(initialIndex, 0),
      Math.max(normalizedUris.length - 1, 0),
    );

    setCurrentIndex(nextIndex);

    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex?.({
        animated: false,
        index: nextIndex,
      });
    });
  }, [initialIndex, normalizedUris.length, visible]);

  if (!visible || normalizedUris.length === 0) {
    return null;
  }

  const slideWidth = width;
  const imageWidth = Math.max(width - 32, 0);
  const imageHeight = Math.max(height * 0.72, 240);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={localStyles.backdrop}>
        <Pressable onPress={onClose} style={localStyles.backdropPressable} />

        <View style={[localStyles.sheet, { width }]}>
          <View style={localStyles.header}>
            <Text style={localStyles.counterText}>
              {currentIndex + 1} / {normalizedUris.length}
            </Text>
            <Pressable
              accessibilityLabel="Закрыть просмотр фото"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                localStyles.closeButton,
                pressed && localStyles.closeButtonPressed,
              ]}
            >
              <Text style={localStyles.closeButtonText}>×</Text>
            </Pressable>
          </View>

          <FlatList
            data={normalizedUris}
            horizontal
            initialScrollIndex={initialIndex}
            keyExtractor={(item, index) => `${item}-${index}`}
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
              setCurrentIndex(nextIndex);
            }}
            onScrollToIndexFailed={(info) => {
              requestAnimationFrame(() => {
                listRef.current?.scrollToOffset?.({
                  animated: false,
                  offset: info.averageItemLength * info.index,
                });
              });
            }}
            pagingEnabled
            ref={listRef}
            renderItem={({ item }) => (
              <View style={[localStyles.slide, { width }]}>
                <Image
                  source={{ uri: item }}
                  style={[
                    localStyles.image,
                    {
                      height: imageHeight,
                      width: imageWidth,
                    },
                  ]}
                  resizeMode="contain"
                />
              </View>
            )}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(9, 18, 12, 0.78)',
    flex: 1,
    justifyContent: 'center',
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  closeButtonPressed: {
    opacity: 0.75,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 26,
    marginTop: -2,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  image: {
    backgroundColor: '#0B1410',
    borderRadius: 20,
  },
  sheet: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
