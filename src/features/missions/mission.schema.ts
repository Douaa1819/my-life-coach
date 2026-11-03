import { z } from 'zod';

export const missionSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(140),
  goalTitle: z.string().trim().min(1).max(120).nullable(),
  durationMinutes: z.number().int().min(1).max(480),
  isCompleted: z.boolean(),
});

export type Mission = z.infer<typeof missionSchema>;
