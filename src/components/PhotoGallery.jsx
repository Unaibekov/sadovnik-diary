import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import styles from '../../styles';
import { isRenderablePhotoUri } from '../domain/photoUri';
import PhotoViewerModal from './PhotoViewerModal';

export default function PhotoGallery({
  editable = false,
  initialIndex = 0,
  onAdd,
  onRemove,
  onReplace,
  thumbSize = 96,
  uris = [],
  addLabel = 'Добавить фото',
  addMoreLabel = 'Добавить еще фото',
}) {
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(initialIndex);
  const [viewerUris, setViewerUris] = useState([]);

  const normalizedUris = useMemo(
    () => (Array.isArray(uris) ? uris.filter((uri) => isRenderablePhotoUri(uri)) : []),
    [uris],
  );

  function openViewer(nextUris, index = 0) {
    setViewerUris(nextUris);
    setViewerIndex(index);
    setViewerVisible(true);
  }

  const thumbStyle = {
    height: thumbSize,
    width: thumbSize,
  };

  return (
    <View style={localStyles.root}>
      <PhotoViewerModal
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
        uris={viewerUris}
        visible={viewerVisible}
      />

      {normalizedUris.length > 0 ? (
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={localStyles.strip}
        >
          {normalizedUris.map((uri, index) => (
            <View key={`${uri}-${index}`} style={[localStyles.thumbWrap, thumbStyle]}>
              <Pressable
                accessibilityLabel={`Открыть фото ${index + 1}`}
                accessibilityRole="button"
                onPress={() => {
                  if (editable && typeof onReplace === 'function') {
                    onReplace(index);
                    return;
                  }

                  openViewer(normalizedUris, index);
                }}
                style={({ pressed }) => [
                  localStyles.thumb,
                  thumbStyle,
                  pressed && styles.linkButtonPressed,
                ]}
              >
                <Image source={{ uri }} style={localStyles.thumbImage} />
              </Pressable>
              {editable && typeof onRemove === 'function' && (
                <Pressable
                  accessibilityLabel={`Удалить фото ${index + 1}`}
                  accessibilityRole="button"
                  onPress={() => onRemove(index)}
                  style={({ pressed }) => [
                    localStyles.removeButton,
                    pressed && styles.linkButtonPressed,
                  ]}
                >
                  <Text style={localStyles.removeButtonText}>×</Text>
                </Pressable>
              )}

            </View>
          ))}
        </ScrollView>
      ) : null}

      {editable && (
        <View style={localStyles.actionsRow}>
          <Pressable
            accessibilityRole="button"
            onPress={onAdd}
            style={({ pressed }) => [
              styles.secondaryOutlineButton,
              styles.transparentOutlineButton,
              localStyles.addButton,
              pressed && styles.linkButtonPressed,
            ]}
          >
            <Text style={styles.secondaryOutlineButtonText}>
              {normalizedUris.length ? addMoreLabel : addLabel}
            </Text>
          </Pressable>

        </View>
      )}
    </View>
  );
}

const localStyles = {
  addButton: {
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  root: {
    gap: 12,
  },
  strip: {
    gap: 8,
  },
  removeButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D92D20',
    borderRadius: 999,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: -6,
    top: -6,
    width: 24,
    zIndex: 2,
  },
  removeButtonText: {
    color: '#D92D20',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
    marginTop: -2,
  },
  thumb: {
    backgroundColor: '#EEF2F0',
    borderColor: '#DCE7DE',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumbImage: {
    height: '100%',
    width: '100%',
  },
  thumbWrap: {},
};
