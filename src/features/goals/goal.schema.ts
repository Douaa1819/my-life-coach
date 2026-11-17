import { z } from 'zod';

import { type Tables } from '@/lib/supabase/database.types';

/** Mirrors public.goals check constraints. The database is the authority. */
export const goalCategories = [
  'health',
  'career',
  'learning',
  'finance',
  'relationships',
  'personal',
] as const;
export type GoalCategory = (typeof goalCategories)[number];

export const goalHorizons = ['3_months', '6_months', '1_year', '5_years'] as const;
export type GoalHorizon = (typeof goalHorizons)[number];

export const goalStatuses = ['active', 'paused', 'completed', 'archived'] as const;
export type GoalStatus = (typeof goalStatuses)[number];

export const goalCategoryLabels: Record<GoalCategory, string> = {
  health: 'Health & fitness',
  career: 'Career',
  learning: 'Learning',
  finance: 'Money',
  relationships: 'Relationships',
  personal: 'Personal growth',
};

export const goalSuggestions: Record<GoalCategory, readonly [string, string, string]> = {
  health: ['Run 5 km', 'Sleep before 11 pm', 'Cook at home more'],
  career: ['Ask for a promotion', 'Learn a new skill for work', 'Update my CV'],
  learning: ['Read 12 books this year', 'Learn basic Spanish', 'Finish an online course'],
  finance: ['Save an emergency fund', 'Track my spending', 'Pay off a debt'],
  relationships: ['Call my family weekly', 'Make new friends', 'Plan more date nights'],
  personal: ['Meditate daily', 'Journal every evening', 'Spend less time on my phone'],
};

export const goalHorizonLabels: Record<GoalHorizon, string> = {
  '3_months': '3 months',
  '6_months': '6 months',
  '1_year': '1 year',
  '5_years': '5 years',
};

export const goalHorizonOptions: readonly {
  value: GoalHorizon;
  label: string;
  description: string;
}[] = [
  { value: '3_months', label: 'In 3 months', description: 'A focused sprint' },
  { value: '6_months', label: 'In 6 months', description: 'Steady progress' },
  { value: '1_year', label: 'In a year', description: 'A real change' },
  { value: '5_years', label: 'In 5 years', description: 'A long journey' },
];

export const goalStatusLabels: Record<GoalStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  completed: 'Reached',
  archived: 'Archived',
};

export const GOAL_TITLE_MIN_LENGTH = 3;
export const GOAL_TITLE_MAX_LENGTH = 120;
export const GOAL_DESCRIPTION_MAX_LENGTH = 280;

export const GOAL_COLUMNS =
  'id, user_id, title, description, category, horizon, status, target_date, completed_at, created_at, updated_at';

type GoalRow = Tables<'goals'>;

export const codePointLength = (value: string) => Array.from(value).length;

export function clampToCodePoints(value: string, limit: number) {
  const characters = Array.from(value);
  return characters.length > limit ? characters.slice(0, limit).join('') : value;
}

function hasControlCharacters(value: string, allowNewlines: boolean) {
  for (const character of value) {
    if (allowNewlines && character === '\n') continue;
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) return true;
  }
  return false;
}

export const goalTitleSchema = z
  .string()
  .trim()
  .refine((value) => codePointLength(value) >= GOAL_TITLE_MIN_LENGTH, {
    error: 'Tell me a bit more, at least 3 characters.',
  })
  .refine((value) => codePointLength(value) <= GOAL_TITLE_MAX_LENGTH, {
    error: `Keep it under ${GOAL_TITLE_MAX_LENGTH} characters.`,
  })
  .refine((value) => !hasControlCharacters(value, false), { error: 'Remove special characters.' });

/** Empty or omitted means skipped. Accepts the form string and the parsed `null`. */
export const goalDescriptionSchema = z
  .string()
  .nullish()
  .transform((value) => (value ?? '').trim())
  .refine((value) => codePointLength(value) <= GOAL_DESCRIPTION_MAX_LENGTH, {
    error: `Keep it under ${GOAL_DESCRIPTION_MAX_LENGTH} characters.`,
  })
  .refine((value) => !hasControlCharacters(value, true), { error: 'Remove special characters.' })
  .transform((value) => (value === '' ? null : value));

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function isCalendarDate(value: string) {
  if (!isoDatePattern.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export const goalDeadlineSchema = z
  .string()
  .nullish()
  .transform((value) => (value ?? '').trim())
  .transform((value) => (value === '' ? null : value))
  .refine((value) => value === null || isCalendarDate(value), {
    error: 'Use a date like 2027-03-12.',
  });

export const goalWriteSchema = z.object({
  title: goalTitleSchema,
  description: goalDescriptionSchema,
  category: z.enum(goalCategories, 'Choose what this goal is about.'),
  horizon: z.enum(goalHorizons, 'Choose a time horizon.'),
  targetDate: goalDeadlineSchema,
});

export type GoalWriteInput = z.output<typeof goalWriteSchema>;

export const goalRowSchema = z
  .object({
    id: z.uuid(),
    user_id: z.uuid(),
    title: z.string(),
    description: z.string().nullable(),
    category: z.enum(goalCategories),
    horizon: z.enum(goalHorizons),
    status: z.enum(goalStatuses),
    target_date: z.string().nullable(),
    completed_at: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  } satisfies { [Key in keyof GoalRow]: z.ZodType<GoalRow[Key]> })
  .transform((row) => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    category: row.category,
    horizon: row.horizon,
    status: row.status,
    targetDate: row.target_date,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

export type Goal = z.output<typeof goalRowSchema>;

export const goalListSchema = z.array(goalRowSchema);
