import { StyleSheet, View } from 'react-native';

import { ErrorState, Screen, Text } from '@/components/ui';
import { radius, spacing, useTheme } from '@/design';

/**
 * Shown when public configuration is invalid. Problem lines name variables and
 * rules only, never values, and are hidden from release builds.
 */
export function ConfigErrorScreen({ problems }: { problems: readonly string[] }) {
  const { colors } = useTheme();

  return (
    <Screen>
      <ErrorState
        title="App configuration is incomplete"
        message={
          __DEV__
            ? 'Copy .env.example to .env, fill in the Supabase values, then restart Expo.'
            : 'Please update the app or try again later.'
        }
      />
      {__DEV__ && (
        <View style={[styles.details, { backgroundColor: colors.surfaceMuted }]}>
          {problems.map((problem) => (
            <Text key={problem} variant="caption" color="textSecondary">
              • {problem}
            </Text>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  details: {
    gap: spacing.xxs,
    padding: spacing.md,
    borderRadius: radius.md,
  },
});
