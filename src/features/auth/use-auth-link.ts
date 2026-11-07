import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import { completeAuthLink } from './auth.api';
import { type AuthLink, type AuthRedirectPath, parseAuthUrl, toAuthLink } from './auth-links';
import { type AuthErrorKind, classifyAuthError } from './auth-errors';

export type AuthLinkStatus =
  | { status: 'none' }
  | { status: 'pending' }
  | { status: 'success' }
  | { status: 'error'; kind: AuthErrorKind };

function stringParams(params: Record<string, string | string[] | undefined>) {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') result[key] = value;
  }
  return result;
}

/** Reads the email link that opened this route, from the route params and the raw URL. */
export function useAuthLink(path: AuthRedirectPath): AuthLink {
  const searchParams = useLocalSearchParams();
  const url = Linking.useLinkingURL();

  return useMemo(() => {
    const fromUrl = url?.includes(path) ? parseAuthUrl(url) : {};
    return toAuthLink({ ...stringParams(searchParams), ...fromUrl });
  }, [path, searchParams, url]);
}

/** Redeems the link once and reports the outcome. */
export function useAuthLinkExchange(link: AuthLink): AuthLinkStatus {
  const [result, setResult] = useState<AuthLinkStatus | null>(null);
  const linkKey =
    link.kind === 'code'
      ? link.code
      : link.kind === 'tokenHash'
        ? link.tokenHash
        : link.kind === 'implicit'
          ? link.accessToken
          : null;

  useEffect(() => {
    if (link.kind !== 'code' && link.kind !== 'tokenHash' && link.kind !== 'implicit') return;
    let isCurrent = true;
    completeAuthLink(link).then(
      () => isCurrent && setResult({ status: 'success' }),
      (error: unknown) =>
        isCurrent && setResult({ status: 'error', kind: classifyAuthError(error) }),
    );
    return () => {
      isCurrent = false;
    };
    // The link object is rebuilt on every URL read; its key is what identifies it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkKey]);

  if (link.kind === 'error') return { status: 'error', kind: 'linkExpired' };
  if (link.kind === 'none') return { status: 'none' };
  return result ?? { status: 'pending' };
}
