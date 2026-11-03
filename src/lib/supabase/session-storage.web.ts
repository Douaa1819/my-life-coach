import { type SessionStorage } from './chunked-storage';

/**
 * SecureStore has no web implementation. The browser has no equivalent of the
 * Keystore, so the web build keeps the session in localStorage, which any script
 * on the page can read. Treat the web target as lower trust than Android.
 */
function getBrowserStorage(): Storage | undefined {
  return typeof window === 'undefined' ? undefined : window.localStorage;
}

export const sessionStorage: SessionStorage = {
  async getItem(key) {
    return getBrowserStorage()?.getItem(key) ?? null;
  },
  async setItem(key, value) {
    getBrowserStorage()?.setItem(key, value);
  },
  async removeItem(key) {
    getBrowserStorage()?.removeItem(key);
  },
};
