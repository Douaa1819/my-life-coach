import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';

import { Pebble } from '@/components/brand';
import { Button, Icon, type IconName, InlineMessage, Screen, Text } from '@/components/ui';
import {
  fadeTo,
  motion,
  radius,
  spacing,
  springTo,
  timingTo,
  useMotionPreference,
  useTheme,
} from '@/design';

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

/** Plays once per JS runtime while signed out; skipped when returning from Sign in. */
let welcomeEntrancePlayed = false;

export function resetWelcomeEntranceForTests() {
  welcomeEntrancePlayed = false;
}

export function WelcomeScreen() {
  const { colors } = useTheme();
  const { state } = useAuth();
  const { reduceMotion } = useMotionPreference();
  const skipMotion = reduceMotion || welcomeEntrancePlayed;

  const blobOpacity = useSharedValue(skipMotion ? 1 : 0);
  const blobScale = useSharedValue(skipMotion ? 1 : 0.96);
  const pebbleOpacity = useSharedValue(skipMotion ? 1 : 0);
  const pebbleLift = useSharedValue(skipMotion ? 0 : 16);
  const textOpacity = useSharedValue(skipMotion ? 1 : 0);
  const textLift = useSharedValue(skipMotion ? 0 : 8);
  const subtitleOpacity = useSharedValue(skipMotion ? 1 : 0);
  const subtitleLift = useSharedValue(skipMotion ? 0 : 8);
  const ctaOpacity = useSharedValue(skipMotion ? 1 : 0);

  useEffect(() => {
    if (skipMotion) {
      welcomeEntrancePlayed = true;
      return;
    }
    welcomeEntrancePlayed = true;
    blobOpacity.set(timingTo(1, 'slow', 'decelerate'));
    blobScale.set(timingTo(1, 'slow', 'decelerate'));
    pebbleOpacity.set(withDelay(80, fadeTo(1, 'base')));
    pebbleLift.set(withDelay(80, springTo(0, 'default')));
    textOpacity.set(withDelay(200, timingTo(1, 'base', 'decelerate')));
    textLift.set(withDelay(200, timingTo(0, 'base', 'decelerate')));
    subtitleOpacity.set(withDelay(260, timingTo(1, 'base', 'decelerate')));
    subtitleLift.set(withDelay(260, timingTo(0, 'base', 'decelerate')));
    ctaOpacity.set(withDelay(480, fadeTo(1, 'base')));
  }, [
    skipMotion,
    blobOpacity,
    blobScale,
    pebbleOpacity,
    pebbleLift,
    textOpacity,
    textLift,
    subtitleOpacity,
    subtitleLift,
    ctaOpacity,
  ]);

  const blobStyle = useAnimatedStyle(() => ({
    opacity: blobOpacity.get(),
    transform: [{ scale: blobScale.get() }],
  }));
  const pebbleStyle = useAnimatedStyle(() => ({
    opacity: pebbleOpacity.get(),
    transform: [{ translateY: pebbleLift.get() }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.get(),
    transform: [{ translateY: textLift.get() }],
  }));
  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.get(),
    transform: [{ translateY: subtitleLift.get() }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({ opacity: ctaOpacity.get() }));

  const highlightEntering = (index: number) =>
    skipMotion
      ? undefined
      : FadeIn.duration(motion.duration.base)
          .delay(360 + index * motion.duration.stagger)
          .reduceMotion(ReduceMotion.Never);

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.pebbleWrap}>
          <Animated.View
            style={[styles.blob, { backgroundColor: colors.primaryContainer }, blobStyle]}
          />
          <Animated.View style={pebbleStyle}>
            <Pebble size={96} mood="idle" blinkAfter={skipMotion ? undefined : 820} />
          </Animated.View>
        </View>
        <Animated.View style={titleStyle}>
          <Text variant="overline" color="primary">
            AI Coach
          </Text>
          <Text variant="display" role="heading">
            Small steps, every day.
          </Text>
        </Animated.View>
        <Animated.View style={subtitleStyle}>
          <Text color="textSecondary">
            Turn your goals into a calm, realistic plan for today, and keep going when motivation
            dips.
          </Text>
        </Animated.View>
      </View>

      <View style={styles.highlights}>
        {highlights.map((item, index) => (
          <Animated.View
            key={item.title}
            entering={highlightEntering(index)}
            style={styles.highlight}>
            <View style={[styles.highlightIcon, { backgroundColor: colors.surfaceMuted }]}>
              <Icon name={item.icon} size={20} color={colors.text} />
            </View>
            <View style={styles.highlightCopy}>
              <Text variant="bodyStrong">{item.title}</Text>
              <Text variant="caption" color="textSecondary">
                {item.body}
              </Text>
            </View>
          </Animated.View>
        ))}
      </View>

      <Animated.View style={[styles.actions, ctaStyle]}>
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
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  pebbleWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  blob: {
    position: 'absolute',
    width: 120,
    height: 88,
    borderRadius: 60,
    bottom: 8,
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
