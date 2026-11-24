import type * as ReactNative from 'react-native';

import type * as ClientModule from '../client';

type AppStateStatus = ReactNative.AppStateStatus;

const mockCreateClient = jest.fn();
const mockStartAutoRefresh = jest.fn();
const mockStopAutoRefresh = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

jest.mock('../session-storage', () => ({ sessionStorage: { marker: 'secure-storage' } }));

function loadClient(env: { success: true; env: object } | { success: false; problems: string[] }) {
  jest.resetModules();
  jest.doMock('@/config/public-env', () => ({ publicEnvResult: env }));
  // Fresh module registry: spy on the same react-native instance the client will import.
  const { AppState } = jest.requireActual<typeof ReactNative>('react-native');
  const addListener = jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_e, listener) => {
      appStateListener = listener;
      return { remove: jest.fn() };
    });
  const client = jest.requireActual<typeof ClientModule>('../client');
  return { ...client, addListener };
}

const validEnv = {
  success: true as const,
  env: { supabaseUrl: 'https://example.supabase.co', supabasePublishableKey: 'sb_publishable_x' },
};

let appStateListener: ((state: AppStateStatus) => void) | undefined;

beforeEach(() => {
  jest.clearAllMocks();
  appStateListener = undefined;
  mockCreateClient.mockReturnValue({
    auth: { startAutoRefresh: mockStartAutoRefresh, stopAutoRefresh: mockStopAutoRefresh },
  });
});

afterEach(() => jest.restoreAllMocks());

describe('getSupabaseClient', () => {
  test('refuses to start without a valid public configuration', () => {
    const { getSupabaseClient, SupabaseConfigurationError } = loadClient({
      success: false,
      problems: ['EXPO_PUBLIC_SUPABASE_URL is missing'],
    });

    expect(() => getSupabaseClient()).toThrow(SupabaseConfigurationError);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  test('uses the publishable key, secure storage and the PKCE flow', () => {
    const { getSupabaseClient } = loadClient(validEnv);
    getSupabaseClient();

    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'sb_publishable_x',
      {
        auth: expect.objectContaining({
          storage: { marker: 'secure-storage' },
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          flowType: 'pkce',
        }),
      },
    );
  });

  test('creates a single client and a single app-state listener', () => {
    const { getSupabaseClient, addListener } = loadClient(validEnv);

    expect(getSupabaseClient()).toBe(getSupabaseClient());
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(addListener).toHaveBeenCalledTimes(1);
  });

  test('refreshes tokens only while the app is in the foreground', () => {
    const { getSupabaseClient } = loadClient(validEnv);
    getSupabaseClient();

    appStateListener?.('background');
    expect(mockStopAutoRefresh).toHaveBeenCalledTimes(1);
    expect(mockStartAutoRefresh).not.toHaveBeenCalled();

    appStateListener?.('active');
    expect(mockStartAutoRefresh).toHaveBeenCalledTimes(1);

    appStateListener?.('inactive');
    expect(mockStopAutoRefresh).toHaveBeenCalledTimes(2);
  });
});
