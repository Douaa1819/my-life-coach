import '@/global.css';

import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ConfigErrorScreen } from '@/components/layout/config-error-screen';
import { RootNavigator } from '@/components/navigation/root-navigator';
import { publicEnvResult } from '@/config/public-env';
import { useTheme } from '@/design';
import { AuthProvider } from '@/features/auth/auth-provider';
import { useSoundPreference } from '@/lib/sound/sound-preference';
import { useVibrationPreference } from '@/lib/vibration/vibration-preference';
import { AppProviders } from '@/providers/app-providers';

// Kept visible until the stored session has been restored, so no screen flashes.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { scheme } = useTheme();
  const [fontsLoaded, fontError] = useFonts({
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  // The saved sound choice must be known before any screen can play a sound.
  useEffect(() => {
    void useSoundPreference.getState().hydrate();
    void useVibrationPreference.getState().hydrate();
  }, []);

  if (!publicEnvResult.success) SplashScreen.hide();
  // The splash screen stays up until the fonts are ready. If they fail, the system font is used.
  if (!fontsLoaded && !fontError) return null;

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
