import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { publicEnvResult } from '@/config/public-env';

import { type Database } from './database.types';
import { sessionStorage } from './session-storage';

export type AppSupabaseClient = SupabaseClient<Database>;

export class SupabaseConfigurationError extends Error {
  constructor() {
    super('Supabase is not configured. Check EXPO_PUBLIC_SUPABASE_* in .env.');
    this.name = 'SupabaseConfigurationError';
  }
}

let client: AppSupabaseClient | undefined;

function keepTokenRefreshInSyncWithAppState(supabase: AppSupabaseClient) {
  if (Platform.OS === 'web') return;
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}

/**
 * Lazily creates the single client for the app. It only holds the publishable
 * key, so every query runs as `anon` or `authenticated` and stays subject to
 * Row Level Security. Privileged work belongs in Edge Functions.
 */
export function getSupabaseClient(): AppSupabaseClient {
  if (client) return client;
  if (!publicEnvResult.success) throw new SupabaseConfigurationError();

  client = createClient<Database>(
    publicEnvResult.env.supabaseUrl,
    publicEnvResult.env.supabasePublishableKey,
    {
      auth: {
        storage: sessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    },
  );
  keepTokenRefreshInSyncWithAppState(client);
  return client;
}
