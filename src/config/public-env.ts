import { parsePublicEnv } from './env';

/**
 * Expo inlines EXPO_PUBLIC_* values only for direct `process.env.NAME` reads,
 * so each variable is referenced by name here.
 */
export const publicEnvResult = parsePublicEnv(
  {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
  { allowInsecureHttp: __DEV__ },
);
