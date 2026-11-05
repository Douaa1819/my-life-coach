import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LayoutAnimationConfig, ReduceMotion } from 'react-native-reanimated';

import { Pebble } from '@/components/brand';
import { motion, radius, spacing, typography, useTheme } from '@/design';

type CoachBubbleProps = {
  message: string;
  /** The 28 dp Pebble avatar; shown next to the first bubble of a group only. */
  showAvatar?: boolean;
  /** Announces message changes politely, for live previews (coach style step). */
  live?: boolean;
};

const AVATAR_SIZE = 28;

// A text change fades the new words in; the bubble itself does not move.
const textEntering = FadeIn.duration(motion.duration.fast).reduceMotion(ReduceMotion.Never);

/** A coach message (docs/DESIGN_SYSTEM.md 5.10), read as one element: "Coach: …". */
function CoachBubbleView({ message, showAvatar = true, live = false }: CoachBubbleProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <View style={styles.avatar}>{showAvatar && <Pebble size={AVATAR_SIZE} />}</View>
      <View
        accessible
        aria-label={`Coach: ${message}`}
        aria-live={live ? 'polite' : undefined}
        style={[styles.bubble, { backgroundColor: colors.primaryContainer }]}>
        {/* The first message appears as is; later changes fade in. */}
        <LayoutAnimationConfig skipEntering>
          <Animated.Text
            key={message}
            entering={textEntering}
            style={[typography.body, { color: colors.onPrimaryContainer }]}>
            {message}
          </Animated.Text>
        </LayoutAnimationConfig>
      </View>
    </View>
  );
}

export const CoachBubble = memo(CoachBubbleView);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  bubble: {
    flexShrink: 1,
    maxWidth: '80%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.card,
    borderTopLeftRadius: 6,
  },
});
