import { getSupabaseClient } from '@/lib/supabase/client';
import { toDataAccessError } from '@/lib/supabase/data-access-error';

import {
  PROFILE_COLUMNS,
  type Profile,
  profileRowSchema,
  type ProfileUpdateInput,
} from './profile.schema';

/** RLS limits this to the signed-in user's row; the id filter only selects it. */
export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .single();
  if (error) throw toDataAccessError(error);
  return profileRowSchema.parse(data);
}

/** Only editable columns are sent. The database rejects every other column. */
export async function updateProfile(userId: string, input: ProfileUpdateInput): Promise<Profile> {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .update({ display_name: input.displayName })
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .single();
  if (error) throw toDataAccessError(error);
  return profileRowSchema.parse(data);
}
