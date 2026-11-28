import { getSupabaseClient } from '@/lib/supabase/client';
import { toDataAccessError } from '@/lib/supabase/data-access-error';

import {
  CHECKIN_COLUMNS,
  type Adjustment,
  type Checkin,
  type CheckinWriteInput,
  type WeeklyReview,
  adjustmentRowSchema,
  checkinRowSchema,
  checkinWriteSchema,
  weeklyReviewSchema,
} from './checkin.schema';

/** The check-in for one local date, or null when the person skipped it (which is fine). */
export async function getCheckin(localDate: string): Promise<Checkin | null> {
  const { data, error } = await getSupabaseClient()
    .from('daily_checkins')
    .select(CHECKIN_COLUMNS)
    .eq('local_date', localDate)
    .maybeSingle();
  if (error) throw toDataAccessError(error);
  return data ? checkinRowSchema.parse(data) : null;
}

/** Skipped questions (0) are sent as nothing, not as a score. */
export async function saveCheckin(input: CheckinWriteInput): Promise<Checkin> {
  const parsed = checkinWriteSchema.safeParse(input);
  if (!parsed.success) throw toDataAccessError({ code: '22023', message: 'invalid_checkin' });
  const value = parsed.data;
  const orUndefined = (score: number) => (score === 0 ? undefined : score);
  const { data, error } = await getSupabaseClient().rpc('log_checkin', {
    p_mood: orUndefined(value.mood),
    p_energy: orUndefined(value.energy),
    p_stress: orUndefined(value.stress),
    p_sleep_quality: orUndefined(value.sleepQuality),
    p_effort_vs_results: orUndefined(value.effortVsResults),
    p_note: value.note === '' ? undefined : value.note,
  });
  if (error) throw toDataAccessError(error);
  return checkinRowSchema.parse(data);
}

export async function deleteCheckin(id: string): Promise<void> {
  const { data, error } = await getSupabaseClient()
    .from('daily_checkins')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw toDataAccessError(error);
  if (!data?.length) throw toDataAccessError({ code: 'PGRST116', message: 'not found' });
}

export async function getWeeklyReview(): Promise<WeeklyReview> {
  const { data, error } = await getSupabaseClient().rpc('get_weekly_review');
  if (error) throw toDataAccessError(error);
  return weeklyReviewSchema.parse(data);
}

export async function decideAdjustment(id: string, accept: boolean): Promise<Adjustment> {
  const { data, error } = await getSupabaseClient().rpc('decide_adjustment', {
    p_adjustment_id: id,
    p_accept: accept,
  });
  if (error) throw toDataAccessError(error);
  return adjustmentRowSchema.parse(data);
}
