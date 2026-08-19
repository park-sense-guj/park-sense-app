import * as ImagePicker from 'expo-image-picker';
import { InteractionManager, Platform } from 'react-native';

const MAX_EDGE = 240;
const MAX_DATA_URL_CHARS = 80_000;

export type PhotoSource = 'camera' | 'library';

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForUiIdle() {
  await new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => resolve());
  });
  await wait(Platform.OS === 'ios' ? 450 : 250);
}

async function ensurePermission(source: PhotoSource): Promise<boolean> {
  if (source === 'camera') {
    const current = await ImagePicker.getCameraPermissionsAsync();
    if (current.granted) {
      return true;
    }
    const next = await ImagePicker.requestCameraPermissionsAsync();
    return next.granted;
  }

  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted || current.accessPrivileges === 'limited') {
    return true;
  }
  const next = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return next.granted || next.accessPrivileges === 'limited';
}

async function compressToDataUrl(uri: string): Promise<string> {
  const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');
  let width = MAX_EDGE;
  let quality = 0.55;
  let dataUrl = '';

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const result = await manipulateAsync(
      uri,
      [{ resize: { width } }],
      {
        compress: quality,
        format: SaveFormat.JPEG,
        base64: true,
      },
    );
    if (!result.base64) {
      throw new Error('Could not prepare that photo. Try another image.');
    }
    dataUrl = `data:image/jpeg;base64,${result.base64}`;
    if (dataUrl.length <= MAX_DATA_URL_CHARS) {
      return dataUrl;
    }
    width = Math.max(160, Math.round(width * 0.75));
    quality = Math.max(0.28, quality - 0.12);
  }

  throw new Error('That photo is too large for profile storage. Try a simpler image.');
}

/**
 * Opens camera or library after the current UI has settled.
 * Avoids Alert + picker races and keeps Firebase payloads small.
 */
export async function pickProfilePhoto(source: PhotoSource): Promise<string | null> {
  await waitForUiIdle();

  const allowed = await ensurePermission(source);
  if (!allowed) {
    throw new Error(
      source === 'camera'
        ? 'Allow camera access in Settings to take a profile photo.'
        : 'Allow photo access in Settings to set a profile picture.',
    );
  }

  await wait(150);

  const options: ImagePicker.ImagePickerOptions = {
    allowsEditing: false,
    quality: 1,
    exif: false,
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  };

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync({
          ...options,
          mediaTypes: ['images'],
          selectionLimit: 1,
        });

  if (result.canceled || !result.assets[0]?.uri) {
    return null;
  }

  return compressToDataUrl(result.assets[0].uri);
}
