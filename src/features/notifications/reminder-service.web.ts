import { type ReminderPreferences } from './notification.schema';

/** Scheduled reminders are a phone feature. On the web everything here does nothing. */
export const remindersSupported = false;

export type PermissionResult = 'granted' | 'denied' | 'blocked';
export type SyncResult = 'scheduled' | 'off' | 'no-permission';

export function configureReminderHandler() {}

export async function hasReminderPermission(): Promise<boolean> {
  return false;
}

export async function requestReminderPermission(): Promise<PermissionResult> {
  return 'denied';
}

export async function cancelReminders(): Promise<void> {}

export async function syncReminders(
  _prefs: ReminderPreferences,
  _now: Date = new Date(),
): Promise<SyncResult> {
  return 'no-permission';
}
