import { useEffect } from 'react';
import { AppState } from 'react-native';

import { configureReminderHandler, remindersSupported, syncReminders } from './reminder-service';
import { useReminderPreferences } from './use-notifications';

/**
 * Keeps the phone's scheduled reminders in step with the saved choices: when they load or
 * change, and each time the app comes back to the front (which also moves the "welcome back"
 * note forward, so it only arrives after the person has really been away). Renders nothing.
 */
export function ReminderSync() {
  const preferences = useReminderPreferences();
  const data = preferences.data;

  useEffect(() => {
    if (remindersSupported) configureReminderHandler();
  }, []);

  useEffect(() => {
    if (!remindersSupported || !data) return;
    void syncReminders(data);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncReminders(data);
    });
    return () => subscription.remove();
  }, [data]);

  return null;
}
