import { z } from 'zod';

import { type Tables } from '@/lib/supabase/database.types';

/** Mirrors public.notification_preferences. The database is the authority. */
export const reminderTypes = [
  'morning_plan',
  'evening_checkin',
  'weekly_review',
  'gentle_return',
] as const;
export type ReminderType = (typeof reminderTypes)[number];

export const reminderTypeLabels: Record<ReminderType, { title: string; hint: string }> = {
  morning_plan: { title: 'Morning plan', hint: 'A nudge to look at today.' },
  evening_checkin: { title: 'Evening check-in', hint: 'A moment to notice how you feel.' },
  weekly_review: { title: 'Weekly look-back', hint: 'Mondays, at your morning time.' },
  gentle_return: { title: 'Gentle welcome back', hint: 'One kind note after a few quiet days.' },
};

/** Never more than two reminders on any day. The database enforces the same cap. */
export const MAX_REMINDERS_PER_DAY = 2;

export const morningTimes = ['08:00', '09:00', '10:00', '11:00'] as const;
export const eveningTimes = ['17:00', '18:00', '19:00', '20:00', '21:00'] as const;
export const quietStarts = ['21:30', '22:00', '23:00'] as const;
export const quietEnds = ['06:00', '07:00', '08:00'] as const;

export const DEFAULT_QUIET_START = '21:30';
export const DEFAULT_QUIET_END = '08:00';

export const NOTIFICATION_COLUMNS =
  'user_id, enabled, morning_time, evening_time, quiet_start, quiet_end, max_per_day, types, permission_asked_at';

type PreferencesRow = Tables<'notification_preferences'>;

/** Postgres returns times as HH:MM:SS; the app works in HH:MM. */
const hhmm = (value: string) => value.slice(0, 5);

export const preferencesRowSchema = z
  .object({
    user_id: z.uuid(),
    enabled: z.boolean(),
    morning_time: z.string().nullable(),
    evening_time: z.string().nullable(),
    quiet_start: z.string(),
    quiet_end: z.string(),
    max_per_day: z.number(),
    types: z.array(z.string()),
    permission_asked_at: z.string().nullable(),
  } satisfies {
    [Key in keyof Omit<PreferencesRow, 'created_at' | 'updated_at'>]: z.ZodType<
      PreferencesRow[Key]
    >;
  })
  .transform((row) => ({
    enabled: row.enabled,
    morningTime: row.morning_time ? hhmm(row.morning_time) : null,
    eveningTime: row.evening_time ? hhmm(row.evening_time) : null,
    quietStart: hhmm(row.quiet_start),
    quietEnd: hhmm(row.quiet_end),
    maxPerDay: Math.min(row.max_per_day, MAX_REMINDERS_PER_DAY),
    types: row.types.filter((type): type is ReminderType =>
      (reminderTypes as readonly string[]).includes(type),
    ),
    permissionAskedAt: row.permission_asked_at,
  }));

export type ReminderPreferences = z.output<typeof preferencesRowSchema>;

/** What a brand-new person has: everything off. */
export const DEFAULT_PREFERENCES: ReminderPreferences = {
  enabled: false,
  morningTime: null,
  eveningTime: null,
  quietStart: DEFAULT_QUIET_START,
  quietEnd: DEFAULT_QUIET_END,
  maxPerDay: MAX_REMINDERS_PER_DAY,
  types: [],
  permissionAskedAt: null,
};

export type ReminderPreferencesInput = Pick<
  ReminderPreferences,
  'enabled' | 'morningTime' | 'eveningTime' | 'quietStart' | 'quietEnd' | 'types'
> & { permissionAskedAt?: string | null };
