import { parseAuthUrl, toAuthLink } from '../auth-links';

describe('parseAuthUrl', () => {
  test('reads query parameters', () => {
    expect(parseAuthUrl('aicoach://verify-email?code=abc-123_XYZ')).toEqual({
      code: 'abc-123_XYZ',
    });
  });

  test('reads fragment parameters, where Supabase reports some errors', () => {
    expect(
      parseAuthUrl(
        'exp://192.168.1.5:8081/--/reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid',
      ),
    ).toEqual({
      error: 'access_denied',
      error_code: 'otp_expired',
      error_description: 'Email link is invalid',
    });
  });

  test('ignores malformed escapes', () => {
    expect(parseAuthUrl('aicoach://x?code=%E0%A4%A&ok=1')).toEqual({ ok: '1' });
  });

  test('handles a missing URL', () => {
    expect(parseAuthUrl(null)).toEqual({});
  });
});

describe('toAuthLink', () => {
  test('recognizes a PKCE code', () => {
    expect(toAuthLink({ code: '7c2f6b3e-1d2a-4f60-9b1e-2a1c3d4e5f60' })).toEqual({
      kind: 'code',
      code: '7c2f6b3e-1d2a-4f60-9b1e-2a1c3d4e5f60',
    });
  });

  test('recognizes a token hash with an accepted type', () => {
    expect(toAuthLink({ token_hash: 'pkce_abcdef123456', type: 'recovery' })).toEqual({
      kind: 'tokenHash',
      tokenHash: 'pkce_abcdef123456',
      type: 'recovery',
    });
  });

  test('rejects unexpected token types', () => {
    expect(toAuthLink({ token_hash: 'abcdef123456', type: 'phone_change' }).kind).toBe('error');
  });

  test('rejects malformed codes instead of sending them to the server', () => {
    expect(toAuthLink({ code: "abc'; drop table" }).kind).toBe('error');
    expect(toAuthLink({ code: 'x'.repeat(600) }).kind).toBe('error');
  });

  test('reports errors from Supabase', () => {
    expect(toAuthLink({ error: 'access_denied', error_code: 'otp_expired' })).toEqual({
      kind: 'error',
      errorCode: 'otp_expired',
    });
  });

  test('is none when the route was opened without a link', () => {
    expect(toAuthLink({})).toEqual({ kind: 'none' });
  });

  test('recognizes implicit recovery tokens from the URL hash', () => {
    const accessToken = `eyJhbGciOiJIUzI1NiJ9.${'a'.repeat(40)}.${'b'.repeat(40)}`;
    expect(
      toAuthLink({
        access_token: accessToken,
        refresh_token: 'refresh-token-value',
        type: 'recovery',
      }),
    ).toEqual({
      kind: 'implicit',
      accessToken,
      refreshToken: 'refresh-token-value',
    });
  });

  test('rejects implicit tokens that are not a recovery or signup session', () => {
    const accessToken = `eyJhbGciOiJIUzI1NiJ9.${'a'.repeat(40)}.${'b'.repeat(40)}`;
    expect(
      toAuthLink({
        access_token: accessToken,
        refresh_token: 'refresh-token-value',
        type: 'phone_change',
      }).kind,
    ).toBe('error');
  });
});
