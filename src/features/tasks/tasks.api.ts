import { getSupabaseClient } from '@/lib/supabase/client';
import { toDataAccessError } from '@/lib/supabase/data-access-error';

import {
  NO_XP,
  TASK_COLUMNS,
  type Task,
  type TaskWriteInput,
  type XpResult,
  type XpTotals,
  taskListSchema,
  taskRowSchema,
  taskWriteSchema,
  xpResultSchema,
  xpTotalsRowSchema,
} from './task.schema';

export async function listTasks(taskDate: string): Promise<Task[]> {
  const { data, error } = await getSupabaseClient()
    .from('tasks')
    .select(TASK_COLUMNS)
    .eq('task_date', taskDate)
    .order('position', { ascending: true });
  if (error) throw toDataAccessError(error);
  return taskListSchema.parse(data);
}

export async function createTask(input: TaskWriteInput): Promise<Task> {
  const parsed = taskWriteSchema.safeParse(input);
  if (!parsed.success) throw toDataAccessError({ code: '22023', message: 'invalid_task' });
  const { data, error } = await getSupabaseClient()
    .from('tasks')
    .insert({
      title: parsed.data.title,
      duration_minutes: parsed.data.durationMinutes,
      effort: parsed.data.effort,
      task_date: parsed.data.taskDate,
      goal_id: parsed.data.goalId,
    })
    .select(TASK_COLUMNS)
    .single();
  if (error) throw toDataAccessError(error);
  return taskRowSchema.parse(data);
}

export async function deleteTask(id: string): Promise<void> {
  const { data, error } = await getSupabaseClient()
    .from('tasks')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw toDataAccessError(error);
  if (!data?.length) throw toDataAccessError({ code: 'PGRST116', message: 'not found' });
}

/** Completing, undoing and skipping are server functions: only they can award or take back XP. */
export async function completeTask(id: string): Promise<XpResult> {
  const { data, error } = await getSupabaseClient().rpc('complete_task', { p_task_id: id });
  if (error) throw toDataAccessError(error);
  return xpResultSchema.parse(data);
}

export async function undoTask(id: string): Promise<XpResult> {
  const { data, error } = await getSupabaseClient().rpc('undo_task', { p_task_id: id });
  if (error) throw toDataAccessError(error);
  return xpResultSchema.parse(data);
}

export async function skipTask(id: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('skip_task', { p_task_id: id });
  if (error) throw toDataAccessError(error);
}

export async function getXpTotals(): Promise<XpTotals> {
  const { data, error } = await getSupabaseClient()
    .from('xp_totals')
    .select('total_xp, level')
    .maybeSingle();
  if (error) throw toDataAccessError(error);
  return data ? xpTotalsRowSchema.parse(data) : NO_XP;
}
