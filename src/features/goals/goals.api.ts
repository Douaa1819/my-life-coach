import { getSupabaseClient } from '@/lib/supabase/client';
import { toDataAccessError } from '@/lib/supabase/data-access-error';

import {
  GOAL_COLUMNS,
  type Goal,
  type GoalStatus,
  type GoalWriteInput,
  goalListSchema,
  goalRowSchema,
  goalWriteSchema,
} from './goal.schema';

function toRow(input: GoalWriteInput) {
  return {
    title: input.title,
    description: input.description,
    category: input.category,
    horizon: input.horizon,
    target_date: input.targetDate,
  };
}

export async function listGoals(): Promise<Goal[]> {
  const { data, error } = await getSupabaseClient()
    .from('goals')
    .select(GOAL_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw toDataAccessError(error);
  return goalListSchema.parse(data);
}

export async function getGoal(id: string): Promise<Goal> {
  const { data, error } = await getSupabaseClient()
    .from('goals')
    .select(GOAL_COLUMNS)
    .eq('id', id)
    .single();
  if (error) throw toDataAccessError(error);
  return goalRowSchema.parse(data);
}

function parseWriteInput(input: GoalWriteInput) {
  const parsed = goalWriteSchema.safeParse(input);
  if (!parsed.success) throw toDataAccessError({ code: '22023', message: 'invalid_goal' });
  return parsed.data;
}

export async function createGoal(input: GoalWriteInput): Promise<Goal> {
  const parsed = parseWriteInput(input);
  const { data, error } = await getSupabaseClient()
    .from('goals')
    .insert({ ...toRow(parsed), status: 'active' })
    .select(GOAL_COLUMNS)
    .single();
  if (error) throw toDataAccessError(error);
  return goalRowSchema.parse(data);
}

export async function updateGoal(id: string, input: GoalWriteInput): Promise<Goal> {
  const parsed = parseWriteInput(input);
  const { data, error } = await getSupabaseClient()
    .from('goals')
    .update(toRow(parsed))
    .eq('id', id)
    .select(GOAL_COLUMNS)
    .single();
  if (error) throw toDataAccessError(error);
  return goalRowSchema.parse(data);
}

export async function updateGoalStatus(id: string, status: GoalStatus): Promise<Goal> {
  const { data, error } = await getSupabaseClient()
    .from('goals')
    .update({ status })
    .eq('id', id)
    .select(GOAL_COLUMNS)
    .single();
  if (error) throw toDataAccessError(error);
  return goalRowSchema.parse(data);
}

export async function deleteGoal(id: string): Promise<void> {
  const { data, error } = await getSupabaseClient()
    .from('goals')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw toDataAccessError(error);
  if (!data?.length) throw toDataAccessError({ code: 'PGRST116', message: 'not found' });
}
