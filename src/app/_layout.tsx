import '@/global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ConfigErrorScreen } from '@/components/layout/config-error-screen';
import { publicEnvResult } from '@/config/public-env';
import { typography, useTheme } from '@/design';
import { AppProviders } from '@/providers/app-providers';

export default function RootLayout() {
  const { colors, scheme } = useTheme();

  return (
    <AppProviders>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {publicEnvResult.success ? (
        <Stack
          screenOptions={{
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: typography.headline.fontWeight },
            contentStyle: { backgroundColor: colors.background },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="missions" options={{ title: "Today's missions" }} />
          <Stack.Screen name="progress" options={{ title: 'Progress' }} />
          <Stack.Screen name="+not-found" options={{ title: 'Not found' }} />
        </Stack>
      ) : (
        <ConfigErrorScreen problems={publicEnvResult.problems} />
      )}
    </AppProviders>
  );
}
