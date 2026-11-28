import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { type ReminderPreferences } from './notification.schema';
import { planReminders } from './schedule';

export const remindersSupported = true;

const CHANNEL_ID = 'reminders';

export type PermissionResult = 'granted' | 'denied' | 'blocked';
export type SyncResult = 'scheduled' | 'off' | 'no-permission';

/** Banners only: no sound, no badge. Reminders are meant to be quiet. */
export function configureReminderHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Android 13 and newer only show the permission prompt once a channel exists. */
async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Gentle reminders',
    // eslint-disable-next-line import/namespace -- the enum is re-exported through `export *`, which the linter cannot follow; TypeScript checks it
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function hasReminderPermission(): Promise<boolean> {
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Asks only when the phone still allows asking. Never throws. */
export async function requestReminderPermission(): Promise<PermissionResult> {
  try {
    await ensureChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return 'granted';
    if (!current.canAskAgain) return 'blocked';
    const result = await Notifications.requestPermissionsAsync();
    if (result.granted) return 'granted';
    return result.canAskAgain ? 'denied' : 'blocked';
  } catch {
    return 'denied';
  }
}

export async function cancelReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Nothing was scheduled that could be cancelled.
  }
}

/**
 * Makes the phone's scheduled reminders match the person's choices exactly: everything is
 * cancelled first, then only what is allowed is scheduled. Turning reminders off, or the
 * phone refusing permission, leaves nothing scheduled.
 */
export async function syncReminders(
  prefs: ReminderPreferences,
  now: Date = new Date(),
): Promise<SyncResult> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!prefs.enabled) return 'off';
    if (!(await hasReminderPermission())) return 'no-permission';
    await ensureChannel();

    for (const reminder of planReminders(prefs, now)) {
      const content = { title: reminder.title, body: reminder.body, sound: false };
      await Notifications.scheduleNotificationAsync({
        content,
        trigger:
          reminder.kind === 'weekly'
            ? {
                type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                weekday: reminder.weekday,
                hour: reminder.hour,
                minute: reminder.minute,
                channelId: CHANNEL_ID,
              }
            : {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: reminder.date,
                channelId: CHANNEL_ID,
              },
      });
    }
    return 'scheduled';
  } catch {
    return 'no-permission';
  }
}
