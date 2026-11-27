import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { Pebble } from '@/components/brand';
import { Button, Icon, Text } from '@/components/ui';
import { fadeTo, layout, radius, spacing, timingTo, useTheme } from '@/design';
import { playSound } from '@/lib/sound/play-sound';

import { ConfettiDots } from './confetti-dots';

type GoalReachedSheetProps = {
  goalTitle: string;
  reached: number;
  total: number;
  onChooseNext: () => void;
  onDismiss: () => void;
};

const PEBBLE_SIZE = 140;
const SHEET_TRAVEL = 360;

/**
 * The reward moment (docs: Today, goal reached). Rises once, Pebble hops once, a few
 * green dots drift and fade, and a short sound plays if sound is on. Nothing loops.
 * Under reduced motion the sheet fades in and Pebble and the dots stay still.
 */
export function GoalReachedSheet({
  goalTitle,
  reached,
  total,
  onChooseNext,
  onDismiss,
}: GoalReachedSheetProps) {
  const { colors } = useTheme();
  const scrim = useSharedValue(0);
  const sheet = useSharedValue(0);
  const rise = useSharedValue(SHEET_TRAVEL);

  useEffect(() => {
    scrim.set(fadeTo(1, 'base'));
    sheet.set(fadeTo(1, 'base'));
    rise.set(timingTo(0, 'moderate', 'decelerate'));
    playSound('goalReached');
  }, [scrim, sheet, rise]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.get() }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheet.get(),
    transform: [{ translateY: rise.get() }],
  }));

  const progressLabel = `${reached} of ${total} ${total === 1 ? 'goal' : 'goals'} reached`;

  return (
    <Modal transparent animationType="none" onRequestClose={onDismiss} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, scrimStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onDismiss}
            aria-label="Close"
            accessibilityRole="button"
          />
        </Animated.View>

        <Animated.View
          role="dialog"
          aria-modal
          aria-label="Goal reached"
          accessibilityViewIsModal
          style={[styles.sheet, { backgroundColor: colors.surface }, sheetStyle]}>
          <View style={[styles.handle, { backgroundColor: colors.primaryBorder }]} />

          <View style={[styles.hero, { width: PEBBLE_SIZE, height: PEBBLE_SIZE }]}>
            <ConfettiDots size={PEBBLE_SIZE} />
            <Pebble size={PEBBLE_SIZE} mood="celebrate" spark />
          </View>

          <View style={styles.copy}>
            <View style={[styles.badge, { backgroundColor: colors.successContainer }]}>
              <Icon name="check" size={14} color={colors.successText} />
              <Text variant="caption" style={{ color: colors.successText }}>
                {progressLabel}
              </Text>
            </View>
            <Text variant="display" align="center" role="heading">
              Goal reached!
            </Text>
            <Text color="textSecondary" align="center">
              You finished <Text variant="bodyStrong">{goalTitle}</Text>. That took real, steady
              effort.
            </Text>
          </View>

          <View style={styles.actions}>
            <Button label="Choose your next goal" size="lg" fullWidth onPress={onChooseNext} />
            <Button label="Not now" variant="ghost" fullWidth onPress={onDismiss} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: radius.xl + 4,
    borderTopRightRadius: radius.xl + 4,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: radius.pill,
  },
  hero: {
    marginTop: spacing.xs,
  },
  copy: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    minHeight: 28,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  actions: {
    width: '100%',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
