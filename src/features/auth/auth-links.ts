import { type EmailOtpType } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

/** Routes that Supabase email links open. Each must be in the Auth redirect allow-list. */
export const authRedirectPaths = {
  verifyEmail: 'verify-email',
  resetPassword: 'reset-password',
} as const;

export type AuthRedirectPath = (typeof authRedirectPaths)[keyof typeof authRedirectPaths];

/** aicoach://verify-email in builds, exp://<host>/--/verify-email in Expo Go. */
export function getAuthRedirectUrl(path: AuthRedirectPath) {
  return Linking.createURL(path);
}

export type AuthLink =
  | { kind: 'code'; code: string }
  | { kind: 'tokenHash'; tokenHash: string; type: EmailOtpType }
  | { kind: 'implicit'; accessToken: string; refreshToken: string }
  | { kind: 'error'; errorCode: string | null }
  | { kind: 'none' };

const acceptedOtpTypes = new Set<EmailOtpType>(['signup', 'email', 'recovery']);
const tokenPattern = /^[\w-]{6,512}$/;
const jwtPattern = /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/;
const refreshTokenPattern = /^[\w.-]{8,2048}$/;

type Params = Record<string, string>;

function parseParamString(value: string | undefined): Params {
  const params: Params = {};
  if (!value) return params;
  for (const pair of value.split('&')) {
    const [rawKey, rawValue = ''] = pair.split('=');
    if (!rawKey) continue;
    try {
      params[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue.replace(/\+/g, ' '));
    } catch {
      // Malformed escape sequences are ignored rather than trusted.
    }
  }
  return params;
}

/** Reads both the query string and the fragment: Supabase reports errors in either. */
export function parseAuthUrl(url: string | null): Params {
  if (!url) return {};
  const [beforeHash, fragment] = url.split('#', 2);
  const query = beforeHash?.split('?', 2)[1];
  return { ...parseParamString(query), ...parseParamString(fragment) };
}

/** Accepts only well-formed values; anything else is treated as an invalid link. */
export function toAuthLink(params: Params): AuthLink {
  if (params.error || params.error_code) {
    return { kind: 'error', errorCode: params.error_code ?? params.error ?? null };
  }

  const code = params.code;
  if (code !== undefined) {
    return tokenPattern.test(code) ? { kind: 'code', code } : { kind: 'error', errorCode: null };
  }

  const tokenHash = params.token_hash;
  const type = params.type as EmailOtpType | undefined;
  if (tokenHash !== undefined) {
    return tokenPattern.test(tokenHash) && type && acceptedOtpTypes.has(type)
      ? { kind: 'tokenHash', tokenHash, type }
      : { kind: 'error', errorCode: null };
  }

  // Hosted recovery emails land with tokens in the hash when PKCE is not used.
  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;
  if (accessToken !== undefined || refreshToken !== undefined) {
    return accessToken &&
      refreshToken &&
      jwtPattern.test(accessToken) &&
      refreshTokenPattern.test(refreshToken) &&
      type &&
      acceptedOtpTypes.has(type)
      ? { kind: 'implicit', accessToken, refreshToken }
      : { kind: 'error', errorCode: null };
  }

  return { kind: 'none' };
}
