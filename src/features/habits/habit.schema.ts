import { z } from 'zod';

import { codePointLength } from '@/features/goals/goal.schema';
import { type Tables } from '@/lib/supabase/database.types';

/** Mirrors public.habits check constraints. The database is the authority. */
export const HABIT_TITLE_MAX_LENGTH = 80;
export const habitCadences = ['daily', 'weekdays', 'weekly', 'custom'] as const;
export type HabitCadence = (typeof habitCadences)[number];

export const cadenceLabels: Record<HabitCadence, string> = {
  daily: 'Every day',
  weekdays: 'Weekdays',
  weekly: 'A few times a week',
  custom: 'Pick days',
};

/** 0 is Sunday, matching the database. */
export const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const restDayOptions = [0, 1, 2] as const;
export type RestDays = (typeof restDayOptions)[number];

export const HABIT_COLUMNS =
  'id, user_id, goal_id, title, cadence, days_of_week, target_per_period, rest_days_per_week, is_active, created_at, updated_at';

type HabitRow = Tables<'habits'>;

function hasControlCharacters(value: string) {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) return true;
  }
  return false;
}

export const habitTitleSchema = z
  .string()
  .trim()
  .refine((value) => codePointLength(value) >= 1, { error: 'Give the habit a name.' })
  .refine((value) => codePointLength(value) <= HABIT_TITLE_MAX_LENGTH, {
    error: `Keep it under ${HABIT_TITLE_MAX_LENGTH} characters.`,
  })
  .refine((value) => !hasControlCharacters(value), { error: 'Remove special characters.' });

export const habitWriteSchema = z
  .object({
    title: habitTitleSchema,
    cadence: z.enum(habitCadences),
    daysOfWeek: z.array(z.number().int().min(0).max(6)),
    targetPerPeriod: z.number().int().min(1).max(7),
    restDaysPerWeek: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    goalId: z.uuid().nullable(),
  })
  .refine((value) => (value.cadence === 'custom') === value.daysOfWeek.length > 0, {
    error: 'Pick the days for this habit.',
    path: ['daysOfWeek'],
  })
  .refine((value) => new Set(value.daysOfWeek).size === value.daysOfWeek.length, {
    error: 'Each day can only be picked once.',
    path: ['daysOfWeek'],
  });

export type HabitWriteInput = z.output<typeof habitWriteSchema>;

export const habitRowSchema = z
  .object({
    id: z.uuid(),
    user_id: z.uuid(),
    goal_id: z.uuid().nullable(),
    title: z.string(),
    cadence: z.enum(habitCadences),
    days_of_week: z.array(z.number()),
    target_per_period: z.number(),
    rest_days_per_week: z.number(),
    is_active: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
  } satisfies { [Key in keyof HabitRow]: z.ZodType<HabitRow[Key]> })
  .transform((row) => ({
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id,
    title: row.title,
    cadence: row.cadence,
    daysOfWeek: row.days_of_week,
    targetPerPeriod: row.target_per_period,
    restDaysPerWeek: row.rest_days_per_week,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

export type Habit = z.output<typeof habitRowSchema>;
export const habitListSchema = z.array(habitRowSchema);

export const streakSchema = z
  .object({
    current: z.number(),
    best: z.number(),
    checked_today: z.boolean(),
    days_since_last: z.number().nullable(),
    welcome_back: z.boolean(),
  })
  .transform((value) => ({
    current: value.current,
    best: value.best,
    checkedToday: value.checked_today,
    daysSinceLast: value.days_since_last,
    welcomeBack: value.welcome_back,
  }));

export type Streak = z.output<typeof streakSchema>;

export const checkResultSchema = z
  .object({
    xp_awarded: z.number().optional(),
    total_xp: z.number(),
    level: z.number(),
    streak: streakSchema,
  })
  .transform((value) => ({
    xpAwarded: value.xp_awarded ?? 0,
    totalXp: value.total_xp,
    level: value.level,
    streak: value.streak,
  }));

export type CheckResult = z.output<typeof checkResultSchema>;
