import { z } from 'zod';

import { codePointLength } from '@/features/goals/goal.schema';
import { type Tables } from '@/lib/supabase/database.types';

/** Mirrors public.daily_checkins. Every answer is optional; 1 is low and 5 is high. */
export const CHECKIN_NOTE_MAX_LENGTH = 280;
export const CHECKIN_COLUMNS =
  'id, user_id, local_date, mood, energy, stress, sleep_quality, effort_vs_results, note, created_at, updated_at';

export const checkinQuestions = [
  {
    key: 'mood',
    label: 'How is your mood?',
    labels: ['Low', 'Down', 'Okay', 'Good', 'Great'],
  },
  {
    key: 'energy',
    label: 'How is your energy?',
    labels: ['Drained', 'Low', 'Okay', 'Good', 'Full'],
  },
  {
    key: 'stress',
    label: 'How stressed do you feel?',
    labels: ['Calm', 'A little', 'Some', 'A lot', 'Very'],
  },
  {
    key: 'sleepQuality',
    label: 'How did you sleep?',
    labels: ['Badly', 'Lightly', 'Okay', 'Well', 'Great'],
  },
  {
    key: 'effortVsResults',
    label: 'Is your effort paying off?',
    labels: ['Not yet', 'A little', 'Fairly', 'Well', 'Very much'],
  },
] as const;

export type CheckinKey = (typeof checkinQuestions)[number]['key'];

/** 0 means "skip": nothing is stored for that question. */
const answer = z.number().int().min(0).max(5);

export const checkinWriteSchema = z
  .object({
    mood: answer,
    energy: answer,
    stress: answer,
    sleepQuality: answer,
    effortVsResults: answer,
    note: z
      .string()
      .trim()
      .refine((value) => codePointLength(value) <= CHECKIN_NOTE_MAX_LENGTH, {
        error: `Keep it under ${CHECKIN_NOTE_MAX_LENGTH} characters.`,
      }),
  })
  .refine(
    (value) =>
      value.mood + value.energy + value.stress + value.sleepQuality + value.effortVsResults > 0 ||
      value.note !== '',
    { error: 'Answer one question, or skip today.', path: ['mood'] },
  );

export type CheckinWriteInput = z.output<typeof checkinWriteSchema>;

type CheckinRow = Tables<'daily_checkins'>;

export const checkinRowSchema = z
  .object({
    id: z.uuid(),
    user_id: z.uuid(),
    local_date: z.string(),
    mood: z.number().nullable(),
    energy: z.number().nullable(),
    stress: z.number().nullable(),
    sleep_quality: z.number().nullable(),
    effort_vs_results: z.number().nullable(),
    note: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  } satisfies { [Key in keyof CheckinRow]: z.ZodType<CheckinRow[Key]> })
  .transform((row) => ({
    id: row.id,
    localDate: row.local_date,
    mood: row.mood,
    energy: row.energy,
    stress: row.stress,
    sleepQuality: row.sleep_quality,
    effortVsResults: row.effort_vs_results,
    note: row.note,
  }));

export type Checkin = z.output<typeof checkinRowSchema>;

const reviewRowSchema = z
  .object({
    id: z.uuid(),
    week_start: z.string(),
    planned: z.number(),
    completed: z.number(),
    completion_rate: z.number().nullable(),
    band: z.enum(['under_60', '60_75', '75_85', 'over_85']).nullable(),
    wellness_score: z.number().nullable(),
    wellness_confidence: z.enum(['none', 'low', 'medium', 'high']),
    checkin_days: z.number(),
  })
  .transform((row) => ({
    id: row.id,
    weekStart: row.week_start,
    planned: row.planned,
    completed: row.completed,
    completionRate: row.completion_rate,
    band: row.band,
    wellnessScore: row.wellness_score,
    wellnessConfidence: row.wellness_confidence,
    checkinDays: row.checkin_days,
  }));

export const adjustmentStatuses = ['proposed', 'accepted', 'declined', 'expired'] as const;

export const adjustmentRowSchema = z
  .object({
    id: z.uuid(),
    review_id: z.uuid(),
    kind: z.enum(['reduce_15', 'maintain', 'consider_increase_10']),
    percent_change: z.number(),
    reason: z.string(),
    status: z.enum(adjustmentStatuses),
    decided_at: z.string().nullable(),
  })
  .transform((row) => ({
    id: row.id,
    reviewId: row.review_id,
    kind: row.kind,
    percentChange: row.percent_change,
    reason: row.reason,
    status: row.status,
    decidedAt: row.decided_at,
  }));

export type Adjustment = z.output<typeof adjustmentRowSchema>;

export const weeklyReviewSchema = z.object({
  review: reviewRowSchema,
  adjustment: adjustmentRowSchema.nullable(),
});

export type WeeklyReview = z.output<typeof weeklyReviewSchema>;
