import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomBar, Button, StepProgress, Text } from '@/components/ui';
import { layout, motion, spacing, timingTo, useMotionPreference, useTheme } from '@/design';

import { PebbleStage } from '../components/pebble-stage';
import { completionBody, firstName } from '../onboarding-copy';
import { questionSteps } from '../onboarding.schema';

type CompletionScreenProps = {
  displayName: string;
  onSeePlan: () => void;
};

const QUESTION_COUNT = questionSteps.length;

/**
 * Success moment ≤ 1.6 s. The CTA is visible from the first frame so the
 * sequence never blocks leaving (docs/MOTION_GUIDELINES.md 5).
 */
export function CompletionScreen({ displayName, onSeePlan }: CompletionScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { reduceMotion } = useMotionPreference();
  const name = firstName(displayName);
  const title = name ? `Your first day is ready, ${name}.` : 'Your first day is ready.';

  const barOpacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      barOpacity.set(0);
      return;
    }
    barOpacity.set(timingTo(0, 'base', 'standard'));
  }, [reduceMotion, barOpacity]);

  const barStyle = useAnimatedStyle(() => ({ opacity: barOpacity.get() }));
  const textEntering = reduceMotion
    ? undefined
    : FadeIn.duration(motion.duration.base).delay(600).reduceMotion(ReduceMotion.Never);
  const bodyEntering = reduceMotion
    ? undefined
    : FadeIn.duration(motion.duration.base).delay(760).reduceMotion(ReduceMotion.Never);

  return (
    <View style={[styles.fill, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Animated.View style={[styles.progress, barStyle]}>
        <StepProgress current={QUESTION_COUNT} total={QUESTION_COUNT} label="Onboarding progress" />
      </Animated.View>

      <View style={styles.body}>
        <PebbleStage size={160} mood="celebrate" spark showPath celebratePath />
        <Animated.View entering={textEntering}>
          <Text variant="display" role="heading" align="center">
            {title}
          </Text>
        </Animated.View>
        <Animated.View entering={bodyEntering}>
          <Text color="textSecondary" align="center">
            {completionBody}
          </Text>
        </Animated.View>
      </View>

      <BottomBar>
        <Button label="See my plan" size="lg" fullWidth onPress={onSeePlan} />
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  progress: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.sm,
  },
  body: {
    flex: 1,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.screenPadding,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
});
