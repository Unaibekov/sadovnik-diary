import { Platform } from 'react-native';

export function isRenderablePhotoUri(uri) {
  if (typeof uri !== 'string' || !uri.trim()) {
    return false;
  }

  if (Platform.OS === 'web' && uri.startsWith('blob:')) {
    return false;
  }

  return true;
}

export function filterRenderablePhotoUris(uris) {
  if (!Array.isArray(uris)) {
    return [];
  }

  return uris.filter(isRenderablePhotoUri);
}
