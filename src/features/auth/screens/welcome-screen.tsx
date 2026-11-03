import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Icon, type IconName, InlineMessage, Screen, Text } from '@/components/ui';
import { radius, spacing, useTheme } from '@/design';

import { getAuthErrorMessage } from '../auth-errors';
import { useAuth } from '../auth-provider';

const highlights: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'goals',
    title: 'Goals that feel reachable',
    body: 'Break big ambitions into clear steps.',
  },
  { icon: 'habits', title: 'Habits that stick', body: 'Small routines, tracked without pressure.' },
  { icon: 'coach', title: 'A coach in your pocket', body: 'Guidance when you feel stuck.' },
];

export function WelcomeScreen() {
  const { colors } = useTheme();
  const { state } = useAuth();

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={[styles.mark, { backgroundColor: colors.primaryContainer }]}>
          <Icon name="sparkle" size={28} color={colors.primary} />
        </View>
        <Text variant="overline" color="primary">
          AI Coach
        </Text>
        <Text variant="display" role="heading">
          Small steps, every day.
        </Text>
        <Text color="textSecondary">
          Turn your goals into a calm, realistic plan for today, and keep going when motivation
          dips.
        </Text>
      </View>

      <View style={styles.highlights}>
        {highlights.map((item) => (
          <View key={item.title} style={styles.highlight}>
            <View style={[styles.highlightIcon, { backgroundColor: colors.surfaceMuted }]}>
              <Icon name={item.icon} size={20} color={colors.text} />
            </View>
            <View style={styles.highlightCopy}>
              <Text variant="bodyStrong">{item.title}</Text>
              <Text variant="caption" color="textSecondary">
                {item.body}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        {state.notice === 'sessionExpired' && (
          <InlineMessage tone="info" message={getAuthErrorMessage('sessionExpired')} />
        )}
        <Button
          label="Create an account"
          size="lg"
          fullWidth
          onPress={() => router.push('/sign-up')}
        />
        <Button
          variant="secondary"
          label="I already have an account"
          size="lg"
          fullWidth
          onPress={() => router.push('/sign-in')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.sm,
    paddingTop: spacing.xl,
  },
  mark: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  highlights: {
    gap: spacing.md,
  },
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  highlightIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightCopy: {
    flex: 1,
    gap: 2,
  },
  actions: {
    marginTop: 'auto',
    gap: spacing.sm,
  },
});
