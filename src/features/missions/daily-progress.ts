import { type Mission } from './mission.schema';

export type DailyProgress = {
  completed: number;
  total: number;
  /** Between 0 and 1. */
  ratio: number;
};

export function getDailyProgress(missions: readonly Pick<Mission, 'isCompleted'>[]): DailyProgress {
  const total = missions.length;
  const completed = missions.filter((mission) => mission.isCompleted).length;
  return { completed, total, ratio: total === 0 ? 0 : completed / total };
}

export function getProgressMessage({ completed, total }: DailyProgress): string {
  if (total === 0) return 'No missions planned for today. Rest counts too.';
  if (completed === 0) return 'Start with the smallest one. Momentum follows.';
  if (completed === total) return 'Every mission done. Take a moment to notice that.';
  if (completed / total >= 0.5) return 'More than halfway there. Keep the pace gentle.';
  return 'Good start. One more step is enough for now.';
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
