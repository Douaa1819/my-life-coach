import * as Notifications from 'expo-notifications';

import { DEFAULT_PREFERENCES, type ReminderPreferences } from '../notification.schema';
import { cancelReminders, requestReminderPermission, syncReminders } from '../reminder-service';

const NOW = new Date(2026, 10, 28, 12, 0, 0);
const on: ReminderPreferences = {
  ...DEFAULT_PREFERENCES,
  enabled: true,
  morningTime: '09:00',
  eveningTime: '20:00',
  types: ['morning_plan', 'evening_checkin'],
};

const mocked = jest.mocked(Notifications);

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getPermissionsAsync.mockResolvedValue({
    granted: true,
    canAskAgain: true,
    status: 'granted',
  } as never);
});

describe('syncReminders', () => {
  test('turning reminders off cancels everything and schedules nothing', async () => {
    await expect(syncReminders({ ...on, enabled: false }, NOW)).resolves.toBe('off');
    expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test("without the phone's permission nothing is scheduled", async () => {
    mocked.getPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: false,
      status: 'denied',
    } as never);
    await expect(syncReminders(on, NOW)).resolves.toBe('no-permission');
    expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('with permission it replaces everything with exactly the planned reminders', async () => {
    await expect(syncReminders(on, NOW)).resolves.toBe('scheduled');
    expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(14);
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: 'A small step for today?', sound: false }),
        trigger: expect.objectContaining({ type: 'weekly', weekday: 1, hour: 9, minute: 0 }),
      }),
    );
  });

  test('a failure while scheduling never throws into the app', async () => {
    mocked.scheduleNotificationAsync.mockRejectedValueOnce(new Error('boom'));
    await expect(syncReminders(on, NOW)).resolves.toBe('no-permission');
  });
});

describe('requestReminderPermission', () => {
  test('already allowed: no prompt', async () => {
    await expect(requestReminderPermission()).resolves.toBe('granted');
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  test('asks once when the phone still allows it', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: true,
      status: 'undetermined',
    } as never);
    mocked.requestPermissionsAsync.mockResolvedValue({
      granted: true,
      canAskAgain: true,
      status: 'granted',
    } as never);
    await expect(requestReminderPermission()).resolves.toBe('granted');
    expect(mocked.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  test('a refusal is respected and reported as such', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: true,
      status: 'undetermined',
    } as never);
    mocked.requestPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: true,
      status: 'denied',
    } as never);
    await expect(requestReminderPermission()).resolves.toBe('denied');
  });

  test('when the phone no longer allows asking, it does not ask', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: false,
      status: 'denied',
    } as never);
    await expect(requestReminderPermission()).resolves.toBe('blocked');
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe('cancelReminders', () => {
  test('cancels everything', async () => {
    await cancelReminders();
    expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  });
});
