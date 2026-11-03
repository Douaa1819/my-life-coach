import { z } from 'zod';

/**
 * Everything here is compiled into the app bundle and is readable by anyone who
 * installs the app. Only public values belong here: the project URL and the
 * publishable (or legacy anon) key. Row Level Security is what protects data.
 */
export type PublicEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

export type PublicEnvSource = {
  EXPO_PUBLIC_SUPABASE_URL?: string;
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
};

export type PublicEnvResult =
  { success: true; env: PublicEnv } | { success: false; problems: string[] };

type ParseOptions = {
  /** Allow http:// URLs, for a local Supabase stack during development only. */
  allowInsecureHttp: boolean;
};

function decodeJwtRole(token: string): string | undefined {
  const payload = token.split('.')[1];
  if (!payload) return undefined;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded: unknown = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
    if (typeof decoded === 'object' && decoded !== null && 'role' in decoded) {
      return typeof decoded.role === 'string' ? decoded.role : undefined;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/** Secret keys bypass Row Level Security. Refuse to start if one is configured. */
export function isPrivilegedSupabaseKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true;
  return decodeJwtRole(key) === 'service_role';
}

function createSchema({ allowInsecureHttp }: ParseOptions) {
  return z.object({
    EXPO_PUBLIC_SUPABASE_URL: z
      .string({ error: 'is missing' })
      .trim()
      .min(1, 'is missing')
      .pipe(
        z.url({
          protocol: allowInsecureHttp ? /^https?$/ : /^https$/,
          error: allowInsecureHttp ? 'must be a valid URL' : 'must be an https:// URL',
        }),
      ),
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
      .string({ error: 'is missing' })
      .trim()
      .min(1, 'is missing')
      .refine((key) => !isPrivilegedSupabaseKey(key), {
        error: 'is a secret or service_role key. Use the publishable key instead',
      }),
  });
}

/** Problems name the variable and the rule. They never echo the value. */
export function parsePublicEnv(source: PublicEnvSource, options: ParseOptions): PublicEnvResult {
  const result = createSchema(options).safeParse(source);
  if (!result.success) {
    return {
      success: false,
      problems: result.error.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`),
    };
  }
  return {
    success: true,
    env: {
      supabaseUrl: result.data.EXPO_PUBLIC_SUPABASE_URL.replace(/\/+$/, ''),
      supabasePublishableKey: result.data.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    },
  };
}
