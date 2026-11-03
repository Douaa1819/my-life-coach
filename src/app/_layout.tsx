import '@/global.css';

import { SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ConfigErrorScreen } from '@/components/layout/config-error-screen';
import { RootNavigator } from '@/components/navigation/root-navigator';
import { publicEnvResult } from '@/config/public-env';
import { useTheme } from '@/design';
import { AuthProvider } from '@/features/auth/auth-provider';
import { AppProviders } from '@/providers/app-providers';

// Kept visible until the stored session has been restored, so no screen flashes.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { scheme } = useTheme();

  if (!publicEnvResult.success) SplashScreen.hide();

  return (
    <AppProviders>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {publicEnvResult.success ? (
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      ) : (
        <ConfigErrorScreen problems={publicEnvResult.problems} />
      )}
    </AppProviders>
  );
}
