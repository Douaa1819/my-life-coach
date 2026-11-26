import { type Href, router } from 'expo-router';

/**
 * Goes back when there is history, otherwise to `fallback`. A refresh or a deep link
 * on the web (or a cold-start link on native) opens a goal screen with nothing behind it.
 */
export function leaveScreen(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
