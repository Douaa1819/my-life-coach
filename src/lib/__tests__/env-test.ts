import { parsePublicEnv } from '@/lib/env';

describe('parsePublicEnv', () => {
  test('treats missing public configuration as empty strings', () => {
    expect(parsePublicEnv({})).toEqual({
      EXPO_PUBLIC_SUPABASE_URL: '',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: '',
    });
  });

  test('returns the public values it was given', () => {
    expect(
      parsePublicEnv({
        EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      }),
    ).toEqual({
      EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    });
  });
});
