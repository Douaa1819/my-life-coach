import { z } from 'zod';

import { type Tables } from '@/lib/supabase/database.types';

/** Mirrors the profiles_display_name_* constraints. The database is the authority. */
export const DISPLAY_NAME_MAX_LENGTH = 50;

/** Postgres [[:cntrl:]] in the UTF-8 locale also matches the C1 range U+0080–U+009F. */
function hasControlCharacters(value: string) {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) return true;
  }
  return false;
}

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Enter your first name.')
  .max(DISPLAY_NAME_MAX_LENGTH, `Keep it under ${DISPLAY_NAME_MAX_LENGTH} characters.`)
  .refine((value) => !hasControlCharacters(value), { error: 'Remove special characters.' });

export const PROFILE_COLUMNS = 'id, display_name, avatar_url, timezone, onboarding_completed';

type ProfileRow = Pick<
  Tables<'profiles'>,
  'id' | 'display_name' | 'avatar_url' | 'timezone' | 'onboarding_completed'
>;

/** Validates what the database returns before it reaches the UI. */
export const profileRowSchema = z
  .object({
    id: z.uuid(),
    display_name: z.string(),
    avatar_url: z.string().nullable(),
    timezone: z.string(),
    onboarding_completed: z.boolean(),
  } satisfies { [Key in keyof ProfileRow]: z.ZodType<ProfileRow[Key]> })
  .transform((row) => ({
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    timezone: row.timezone,
    onboardingCompleted: row.onboarding_completed,
  }));

export type Profile = z.output<typeof profileRowSchema>;

export const profileUpdateSchema = z.object({
  displayName: displayNameSchema,
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
