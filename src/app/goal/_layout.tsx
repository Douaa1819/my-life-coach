import { Stack } from 'expo-router';

import { typography, useTheme } from '@/design';

export default function GoalLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: typography.headline.fontFamily },
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="new" options={{ title: 'New goal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Goal' }} />
      <Stack.Screen name="edit/[id]" options={{ title: 'Edit goal' }} />
    </Stack>
  );
}
