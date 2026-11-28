import { z } from 'zod';

import { codePointLength } from '@/features/goals/goal.schema';
import { type Tables } from '@/lib/supabase/database.types';

/** Mirrors public.tasks check constraints. The database is the authority. */
export const TASK_TITLE_MAX_LENGTH = 120;
export const taskDurations = [5, 10, 15, 25, 45] as const;
export const taskEfforts = [1, 2, 3] as const;
export type TaskEffort = (typeof taskEfforts)[number];

export const taskEffortLabels: Record<TaskEffort, string> = {
  1: 'Easy',
  2: 'Steady',
  3: 'Hard',
};

export const taskStatuses = ['pending', 'completed', 'skipped'] as const;
export type TaskStatus = (typeof taskStatuses)[number];

export const TASK_COLUMNS =
  'id, user_id, goal_id, plan_item_id, task_date, position, title, duration_minutes, effort, source, status, completed_at, xp_awarded, created_at, updated_at';

type TaskRow = Tables<'tasks'>;

function hasControlCharacters(value: string) {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) return true;
  }
  return false;
}

export const taskTitleSchema = z
  .string()
  .trim()
  .refine((value) => codePointLength(value) >= 1, { error: 'Give the step a name.' })
  .refine((value) => codePointLength(value) <= TASK_TITLE_MAX_LENGTH, {
    error: `Keep it under ${TASK_TITLE_MAX_LENGTH} characters.`,
  })
  .refine((value) => !hasControlCharacters(value), { error: 'Remove special characters.' });

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2027-03-12.');

export const taskWriteSchema = z.object({
  title: taskTitleSchema,
  durationMinutes: z.number().int().min(1).max(240),
  effort: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  taskDate: isoDate,
  goalId: z.uuid().nullable(),
});

export type TaskWriteInput = z.output<typeof taskWriteSchema>;

export const taskRowSchema = z
  .object({
    id: z.uuid(),
    user_id: z.uuid(),
    goal_id: z.uuid().nullable(),
    plan_item_id: z.uuid().nullable(),
    task_date: z.string(),
    position: z.number(),
    title: z.string(),
    duration_minutes: z.number(),
    effort: z.number(),
    source: z.string(),
    status: z.enum(taskStatuses),
    completed_at: z.string().nullable(),
    xp_awarded: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
  } satisfies { [Key in keyof TaskRow]: z.ZodType<TaskRow[Key]> })
  .transform((row) => ({
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id,
    planItemId: row.plan_item_id,
    taskDate: row.task_date,
    position: row.position,
    title: row.title,
    durationMinutes: row.duration_minutes,
    effort: row.effort,
    source: row.source,
    status: row.status,
    completedAt: row.completed_at,
    xpAwarded: row.xp_awarded,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

export type Task = z.output<typeof taskRowSchema>;
export const taskListSchema = z.array(taskRowSchema);

/** What complete_task and undo_task return. */
export const xpResultSchema = z
  .object({
    xp_awarded: z.number().optional(),
    total_xp: z.number(),
    level: z.number(),
  })
  .transform((value) => ({
    xpAwarded: value.xp_awarded ?? 0,
    totalXp: value.total_xp,
    level: value.level,
  }));
export type XpResult = z.output<typeof xpResultSchema>;

export const xpTotalsRowSchema = z
  .object({ total_xp: z.number(), level: z.number() })
  .transform((value) => ({ totalXp: value.total_xp, level: value.level }));

export type XpTotals = { totalXp: number; level: number };

/** A person with no awards yet has no totals row: that is level 1 with no XP. */
export const NO_XP: XpTotals = { totalXp: 0, level: 1 };

/** The server only allows undo for 10 minutes after a completion. */
export const UNDO_WINDOW_MS = 10 * 60 * 1000;
