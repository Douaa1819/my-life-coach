import { SplashScreen, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LoadingState } from '@/components/ui';
import { typography, useTheme } from '@/design';
import { getAppRedirect } from '@/features/auth/access';
import { useAccess } from '@/features/auth/use-access';

import { rootHref } from './tab-routes';

/** Past this, a slow session restore (e.g. offline token refresh) shows a loader instead. */
const SPLASH_TIMEOUT_MS = 4000;

/**
 * While the session is restored (behind the splash screen) the auth screens are
 * the open branch, so no protected screen renders before access is known.
 */
export function RootNavigator() {
  const { colors } = useTheme();
  const access = useAccess();
  const isLoading = access === 'loading';
  const [splashTimedOut, setSplashTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hide();
      return;
    }
    const timer = setTimeout(() => {
      setSplashTimedOut(true);
      SplashScreen.hide();
    }, SPLASH_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isLoading]);

  return (
    <>
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: typography.headline.fontWeight },
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Protected guard={access === 'app'} redirectTo={getAppRedirect(access)}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="missions" options={{ title: "Today's missions" }} />
          <Stack.Screen name="progress" options={{ title: 'Progress' }} />
        </Stack.Protected>
        <Stack.Protected guard={access === 'onboarding'} redirectTo={rootHref}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected
          guard={access === 'signedOut' || access === 'loading'}
          redirectTo={rootHref}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        {/* Email links land here whatever the session state. */}
        <Stack.Screen
          name="reset-password"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="verify-email" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ title: 'Not found' }} />
      </Stack>
      {isLoading && splashTimedOut && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}>
          <LoadingState label="Restoring your session" />
        </View>
      )}
    </>
  );
}
