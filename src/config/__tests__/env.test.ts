import { isPrivilegedSupabaseKey, parsePublicEnv } from '@/config/env';

function fakeJwt(payload: Record<string, unknown>) {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

const productionOptions = { allowInsecureHttp: false };

describe('parsePublicEnv', () => {
  test('accepts an https project URL and a publishable key', () => {
    expect(
      parsePublicEnv(
        {
          EXPO_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co/',
          EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc123',
        },
        productionOptions,
      ),
    ).toEqual({
      success: true,
      env: {
        supabaseUrl: 'https://abc.supabase.co',
        supabasePublishableKey: 'sb_publishable_abc123',
      },
    });
  });

  test('reports missing variables by name', () => {
    const result = parsePublicEnv({}, productionOptions);
    expect(result).toEqual({
      success: false,
      problems: [
        'EXPO_PUBLIC_SUPABASE_URL is missing',
        'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing',
      ],
    });
  });

  test('rejects http URLs outside development', () => {
    const source = {
      EXPO_PUBLIC_SUPABASE_URL: 'http://192.168.1.7:54321',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc123',
    };
    expect(parsePublicEnv(source, productionOptions).success).toBe(false);
    expect(parsePublicEnv(source, { allowInsecureHttp: true }).success).toBe(true);
  });

  test('refuses secret keys without echoing them', () => {
    const secret = 'sb_secret_do_not_ship';
    const result = parsePublicEnv(
      {
        EXPO_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: secret,
      },
      productionOptions,
    );
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).not.toContain(secret);
  });
});

describe('isPrivilegedSupabaseKey', () => {
  test('flags service_role JWTs and secret keys', () => {
    expect(isPrivilegedSupabaseKey(fakeJwt({ role: 'service_role' }))).toBe(true);
    expect(isPrivilegedSupabaseKey('sb_secret_123')).toBe(true);
  });

  test('allows anon JWTs, publishable keys and malformed tokens', () => {
    expect(isPrivilegedSupabaseKey(fakeJwt({ role: 'anon' }))).toBe(false);
    expect(isPrivilegedSupabaseKey('sb_publishable_123')).toBe(false);
    expect(isPrivilegedSupabaseKey('not.a-valid.jwt')).toBe(false);
  });
});
