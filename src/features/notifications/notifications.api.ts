import { getSupabaseClient } from '@/lib/supabase/client';
import { toDataAccessError } from '@/lib/supabase/data-access-error';

import {
  DEFAULT_PREFERENCES,
  NOTIFICATION_COLUMNS,
  type ReminderPreferences,
  type ReminderPreferencesInput,
  preferencesRowSchema,
} from './notification.schema';

/** A person who has never touched the setting has no row: that means everything is off. */
export async function getReminderPreferences(): Promise<ReminderPreferences> {
  const { data, error } = await getSupabaseClient()
    .from('notification_preferences')
    .select(NOTIFICATION_COLUMNS)
    .maybeSingle();
  if (error) throw toDataAccessError(error);
  return data ? preferencesRowSchema.parse(data) : DEFAULT_PREFERENCES;
}

export async function saveReminderPreferences(
  input: ReminderPreferencesInput,
): Promise<ReminderPreferences> {
  const { data, error } = await getSupabaseClient()
    .from('notification_preferences')
    .upsert(
      {
        enabled: input.enabled,
        morning_time: input.morningTime,
        evening_time: input.eveningTime,
        quiet_start: input.quietStart,
        quiet_end: input.quietEnd,
        types: input.types,
        ...(input.permissionAskedAt !== undefined
          ? { permission_asked_at: input.permissionAskedAt }
          : {}),
      },
      { onConflict: 'user_id' },
    )
    .select(NOTIFICATION_COLUMNS)
    .single();
  if (error) throw toDataAccessError(error);
  return preferencesRowSchema.parse(data);
}
