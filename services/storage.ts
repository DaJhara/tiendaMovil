
import { Platform } from 'react-native';
import * as ExpoSecureStore from 'expo-secure-store';

export async function getItemAsync(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined'
      ? localStorage.getItem(key)
      : null;
  }

  return ExpoSecureStore.getItemAsync(key);
}

export async function setItemAsync(
  key: string,
  value: string
): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
    return;
  }

  await ExpoSecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
    return;
  }

  await ExpoSecureStore.deleteItemAsync(key);
}
