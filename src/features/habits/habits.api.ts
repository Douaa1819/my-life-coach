import { getSupabaseClient } from '@/lib/supabase/client';
import { toDataAccessError } from '@/lib/supabase/data-access-error';

import {
  HABIT_COLUMNS,
  type CheckResult,
  type Habit,
  type HabitWriteInput,
  type Streak,
  checkResultSchema,
  habitListSchema,
  habitRowSchema,
  habitWriteSchema,
  streakSchema,
} from './habit.schema';

export async function listHabits(): Promise<Habit[]> {
  const { data, error } = await getSupabaseClient()
    .from('habits')
    .select(HABIT_COLUMNS)
    .order('created_at', { ascending: true });
  if (error) throw toDataAccessError(error);
  return habitListSchema.parse(data);
}

export async function createHabit(input: HabitWriteInput): Promise<Habit> {
  const parsed = habitWriteSchema.safeParse(input);
  if (!parsed.success) throw toDataAccessError({ code: '22023', message: 'invalid_habit' });
  const { data, error } = await getSupabaseClient()
    .from('habits')
    .insert({
      title: parsed.data.title,
      cadence: parsed.data.cadence,
      days_of_week: parsed.data.daysOfWeek,
      target_per_period: parsed.data.targetPerPeriod,
      rest_days_per_week: parsed.data.restDaysPerWeek,
      goal_id: parsed.data.goalId,
    })
    .select(HABIT_COLUMNS)
    .single();
  if (error) throw toDataAccessError(error);
  return habitRowSchema.parse(data);
}

export async function setHabitActive(id: string, isActive: boolean): Promise<Habit> {
  const { data, error } = await getSupabaseClient()
    .from('habits')
    .update({ is_active: isActive })
    .eq('id', id)
    .select(HABIT_COLUMNS)
    .single();
  if (error) throw toDataAccessError(error);
  return habitRowSchema.parse(data);
}

export async function deleteHabit(id: string): Promise<void> {
  const { data, error } = await getSupabaseClient()
    .from('habits')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw toDataAccessError(error);
  if (!data?.length) throw toDataAccessError({ code: 'PGRST116', message: 'not found' });
}

/** Checking in and unchecking are server functions: only they can award or take back XP. */
export async function checkHabit(id: string): Promise<CheckResult> {
  const { data, error } = await getSupabaseClient().rpc('check_habit', { p_habit_id: id });
  if (error) throw toDataAccessError(error);
  return checkResultSchema.parse(data);
}

export async function uncheckHabit(id: string): Promise<CheckResult> {
  const { data, error } = await getSupabaseClient().rpc('uncheck_habit', { p_habit_id: id });
  if (error) throw toDataAccessError(error);
  return checkResultSchema.parse(data);
}

export async function getHabitStreak(id: string): Promise<Streak> {
  const { data, error } = await getSupabaseClient().rpc('habit_streak', { p_habit_id: id });
  if (error) throw toDataAccessError(error);
  return streakSchema.parse(data);
}
