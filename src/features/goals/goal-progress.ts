import {
  type Goal,
  type GoalHorizon,
  type GoalStatus,
  goalHorizonLabels,
  goalStatusLabels,
} from './goal.schema';

export function formatGoalHorizon(horizon: GoalHorizon): string {
  return goalHorizonLabels[horizon];
}

export function formatGoalStatus(status: GoalStatus): string {
  return goalStatusLabels[status];
}

export function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

export function horizonEndDate(horizon: GoalHorizon, from = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  switch (horizon) {
    case '3_months':
      date.setMonth(date.getMonth() + 3);
      break;
    case '6_months':
      date.setMonth(date.getMonth() + 6);
      break;
    case '1_year':
      date.setFullYear(date.getFullYear() + 1);
      break;
    case '5_years':
      date.setFullYear(date.getFullYear() + 5);
      break;
  }
  return formatIsoDate(date);
}

const shortDate = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
const longDate = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from: Date, to: Date) {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000);
}

/** Honest deadline copy. Never a fake completion percentage. */
export function formatGoalDeadline(
  targetDate: string | null,
  status: GoalStatus,
  now = new Date(),
): string | null {
  if (!targetDate) return null;
  const date = parseIsoDate(targetDate);
  if (!date) return null;
  const formatted =
    date.getFullYear() === now.getFullYear() ? shortDate.format(date) : longDate.format(date);
  const remaining = daysBetween(now, date);
  if (status === 'completed') return `Reached · was ${formatted}`;
  if (remaining === 0) return 'Due today';
  if (remaining > 0) return `By ${formatted}`;
  return `This date has passed · ${formatted}`;
}

export function isFocusGoal(goal: Pick<Goal, 'status'>) {
  return goal.status === 'active' || goal.status === 'paused';
}

export function groupGoalsByHorizon(goals: readonly Goal[]) {
  const groups: { horizon: GoalHorizon; goals: Goal[] }[] = [
    { horizon: '3_months', goals: [] },
    { horizon: '6_months', goals: [] },
    { horizon: '1_year', goals: [] },
    { horizon: '5_years', goals: [] },
  ];
  for (const goal of goals) {
    groups.find((group) => group.horizon === goal.horizon)?.goals.push(goal);
  }
  return groups.filter((group) => group.goals.length > 0);
}
