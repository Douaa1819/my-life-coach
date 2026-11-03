import { z } from 'zod';

export const goalHorizons = ['3_months', '6_months', '1_year', '5_years'] as const;

export const goalHorizonSchema = z.enum(goalHorizons);

export const goalSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().trim().min(1).max(120),
    horizon: goalHorizonSchema,
    milestonesTotal: z.number().int().min(0).max(100),
    milestonesCompleted: z.number().int().min(0),
  })
  .refine((goal) => goal.milestonesCompleted <= goal.milestonesTotal, {
    error: 'Completed milestones cannot exceed the total',
    path: ['milestonesCompleted'],
  });

export type GoalHorizon = z.infer<typeof goalHorizonSchema>;
export type Goal = z.infer<typeof goalSchema>;
