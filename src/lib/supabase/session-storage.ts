import * as SecureStore from 'expo-secure-store';

import { createChunkedStorage } from './chunked-storage';

/**
 * Sessions are encrypted at rest by the Android Keystore and the iOS Keychain.
 * The expo-secure-store config plugin excludes them from Android Auto Backup.
 */
export const sessionStorage = createChunkedStorage({
  getItemAsync: (key) => SecureStore.getItemAsync(key),
  setItemAsync: (key, value) => SecureStore.setItemAsync(key, value),
  deleteItemAsync: (key) => SecureStore.deleteItemAsync(key),
});
