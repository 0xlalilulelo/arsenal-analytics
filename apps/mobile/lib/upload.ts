import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { getToken } from './auth';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

async function uploadFormData(uri: string, mimeType: string, fileName: string, prefix: string): Promise<string | null> {
  const token = await getToken();

  const formData = new FormData();
  formData.append('file', { uri, name: fileName, type: mimeType } as unknown as Blob);
  formData.append('prefix', prefix);

  const res = await fetch(`${BASE_URL}/api/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token ?? ''}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Upload failed');
  }

  const { url } = await res.json();
  return url as string;
}

/**
 * Opens the system image library. Returns the uploaded URL, or null on cancel.
 */
export async function pickAndUpload(prefix = 'photos/'): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Required', 'Photo library access is needed to attach photos.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: true,
    aspect: [4, 3],
  });

  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];

  return uploadFormData(
    asset.uri,
    asset.mimeType ?? 'image/jpeg',
    asset.fileName ?? `photo_${Date.now()}.jpg`,
    prefix,
  );
}

/**
 * Opens the camera directly. Returns the uploaded URL, or null on cancel.
 */
export async function takeAndUpload(prefix = 'photos/'): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Required', 'Camera access is needed to take photos.');
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.8,
    allowsEditing: true,
    aspect: [4, 3],
  });

  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];

  return uploadFormData(
    asset.uri,
    asset.mimeType ?? 'image/jpeg',
    asset.fileName ?? `photo_${Date.now()}.jpg`,
    prefix,
  );
}
