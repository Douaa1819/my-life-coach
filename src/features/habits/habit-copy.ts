import { type Habit, type Streak, cadenceLabels, dayLabels } from './habit.schema';

/** One short line describing when a habit happens. */
export function describeCadence(habit: Pick<Habit, 'cadence' | 'daysOfWeek' | 'targetPerPeriod'>) {
  switch (habit.cadence) {
    case 'custom':
      return [...habit.daysOfWeek]
        .sort((a, b) => a - b)
        .map((day) => dayLabels[day])
        .join(', ');
    case 'weekly':
      return `${habit.targetPerPeriod} ${habit.targetPerPeriod === 1 ? 'time' : 'times'} a week`;
    default:
      return cadenceLabels[habit.cadence];
  }
}

/**
 * The streak line. It only ever celebrates or welcomes: there is no "broken", "lost" or
 * "missed" wording, and a restart is described as a fresh start.
 */
export function streakMessage(habit: Pick<Habit, 'cadence'>, streak: Streak | undefined) {
  if (!streak) return '';
  const unit = habit.cadence === 'weekly' ? 'week' : 'day';
  const plural = (count: number) => `${count} ${unit}${count === 1 ? '' : 's'}`;

  if (streak.welcomeBack) return 'Welcome back. Today is a fresh start.';
  if (streak.current >= 1) return `${plural(streak.current)} in a row`;
  if (streak.best >= 1) return `Fresh start today. Your best is ${plural(streak.best)}.`;
  return 'Ready when you are.';
}
