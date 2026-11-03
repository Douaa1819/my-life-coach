import { type Goal, type GoalHorizon } from './goal.schema';

const horizonLabels: Record<GoalHorizon, string> = {
  '3_months': '3 months',
  '6_months': '6 months',
  '1_year': '1 year',
  '5_years': '5 years',
};

export function formatGoalHorizon(horizon: GoalHorizon): string {
  return horizonLabels[horizon];
}

/** Fraction of milestones completed, between 0 and 1. A goal with no milestones is 0. */
export function getGoalProgress(goal: Pick<Goal, 'milestonesCompleted' | 'milestonesTotal'>) {
  if (goal.milestonesTotal <= 0) return 0;
  return Math.min(goal.milestonesCompleted / goal.milestonesTotal, 1);
}
