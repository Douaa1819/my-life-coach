import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { type ColorSchemeName, springTo, timingTo, useMotionPreference, useTheme } from '@/design';

/**
 * Pebble expresses state through posture and eyes only (docs/DESIGN_SYSTEM.md 6.1):
 * leaning forward to encourage, stretching taller to grow, resting flat, hopping to celebrate.
 */
export type PebbleMood = 'idle' | 'encourage' | 'grow' | 'rest' | 'celebrate';

type PebbleProps = {
  /** Width and height of the drawing box, in dp. Works from 28 (avatar) to 240. */
  size?: number;
  mood?: PebbleMood;
  /** One peach spark beside Pebble. Replaces the cheeks, so only one peach detail shows. */
  spark?: boolean;
  /** Blinks once this many ms after mounting (Welcome). Skipped under reduced motion. */
  blinkAfter?: number;
  /** Pebble is decorative unless this is set. */
  accessibilityLabel?: string;
};

type Posture = { rotate: number; scaleX: number; scaleY: number; lookX: number; lookY: number };

const postures: Record<PebbleMood, Posture> = {
  idle: { rotate: 0, scaleX: 1, scaleY: 1, lookX: 0, lookY: 0 },
  encourage: { rotate: 7, scaleX: 1, scaleY: 0.98, lookX: 0.04, lookY: 0 },
  grow: { rotate: 0, scaleX: 0.94, scaleY: 1.1, lookX: 0, lookY: -0.04 },
  rest: { rotate: 0, scaleX: 1.1, scaleY: 0.84, lookX: 0, lookY: 0.02 },
  celebrate: { rotate: 0, scaleX: 1, scaleY: 1, lookX: 0, lookY: 0 },
};

/** Illustration palette (6.2): dark mode keeps Pebble light on ink, never neon. */
const pebbleColors: Record<
  ColorSchemeName,
  { body: string; shade: string; eye: string; ground: string; cheek: string }
> = {
  light: {
    body: '#7968E8',
    shade: '#5B4BC4',
    eye: '#242238',
    ground: 'rgba(91, 75, 196, 0.14)',
    cheek: '#F5B8A8',
  },
  dark: {
    body: '#A99DF7',
    shade: '#8A7EEA',
    eye: '#15122E',
    ground: 'rgba(169, 157, 247, 0.18)',
    cheek: '#F5B8A8',
  },
};

const BLINK_HALF_MS = 80;

function PebbleView({
  size = 96,
  mood = 'idle',
  spark = false,
  blinkAfter,
  accessibilityLabel,
}: PebbleProps) {
  const { scheme } = useTheme();
  const { reduceMotion } = useMotionPreference();
  const colors = pebbleColors[scheme];

  const bodyWidth = size * 0.86;
  const bodyHeight = size * 0.72;
  const hopHeight = Math.min(12, size * 0.12);
  const eyeSize = Math.max(3, size * 0.1);

  const posture = postures[mood];
  const rotate = useSharedValue(posture.rotate);
  const scaleX = useSharedValue(posture.scaleX);
  const scaleY = useSharedValue(posture.scaleY);
  const lookX = useSharedValue(posture.lookX);
  const lookY = useSharedValue(posture.lookY);
  const lift = useSharedValue(0);
  const eyeOpen = useSharedValue(1);

  useEffect(() => {
    const target = postures[mood];
    const move = (value: typeof rotate, to: number) =>
      value.set(reduceMotion ? to : springTo(to, 'default'));
    move(rotate, target.rotate);
    move(scaleX, target.scaleX);
    move(scaleY, target.scaleY);
    move(lookX, target.lookX);
    move(lookY, target.lookY);

    if (mood === 'celebrate' && !reduceMotion) {
      lift.set(withSequence(timingTo(-hopHeight, 'fast', 'decelerate'), springTo(0, 'playful')));
    } else {
      lift.set(0);
    }
  }, [mood, reduceMotion, hopHeight, rotate, scaleX, scaleY, lookX, lookY, lift]);

  useEffect(() => {
    if (blinkAfter === undefined || reduceMotion) return;
    eyeOpen.set(
      withDelay(
        blinkAfter,
        withSequence(
          withTiming(0.1, { duration: BLINK_HALF_MS }),
          withTiming(1, { duration: BLINK_HALF_MS }),
        ),
      ),
    );
  }, [blinkAfter, reduceMotion, eyeOpen]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: lift.get() },
      { rotate: `${rotate.get()}deg` },
      { scaleX: scaleX.get() },
      { scaleY: scaleY.get() },
    ],
  }));

  const eyesStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: lookX.get() * bodyWidth },
      { translateY: lookY.get() * bodyHeight },
      { scaleY: eyeOpen.get() },
    ],
  }));

  // The ground shadow shrinks while Pebble is in the air.
  const groundStyle = useAnimatedStyle(() => {
    const air = hopHeight > 0 ? -lift.get() / hopHeight : 0;
    return { opacity: 1 - air * 0.5, transform: [{ scaleX: 1 - air * 0.3 }] };
  });

  const a11y = accessibilityLabel
    ? ({ accessible: true, role: 'img', 'aria-label': accessibilityLabel } as const)
    : ({ 'aria-hidden': true, importantForAccessibility: 'no-hide-descendants' } as const);

  const showCheeks = !spark && (mood === 'celebrate' || mood === 'encourage') && size >= 40;

  return (
    <View testID="pebble" style={{ width: size, height: size }} {...a11y}>
      {size >= 40 && (
        <Animated.View
          testID="pebble-ground"
          style={[
            styles.ground,
            {
              width: size * 0.56,
              height: size * 0.08,
              left: size * 0.22,
              borderRadius: size,
              backgroundColor: colors.ground,
            },
            groundStyle,
          ]}
        />
      )}

      <Animated.View
        testID="pebble-body"
        style={[
          styles.body,
          {
            width: bodyWidth,
            height: bodyHeight,
            left: (size - bodyWidth) / 2,
            bottom: size * 0.04,
            backgroundColor: colors.body,
            // An asymmetric squircle between a stone and a seed: fuller crown, flatter base.
            borderTopLeftRadius: bodyHeight * 0.54,
            borderTopRightRadius: bodyHeight * 0.46,
            borderBottomLeftRadius: bodyHeight * 0.24,
            borderBottomRightRadius: bodyHeight * 0.3,
          },
          bodyStyle,
        ]}>
        {/* Belly shade: the top of a large circle, so its edge curves like the body. */}
        <View
          style={[
            styles.absolute,
            {
              width: bodyWidth * 1.1,
              height: bodyWidth * 1.1,
              left: -bodyWidth * 0.02,
              top: bodyHeight * 0.64,
              borderRadius: bodyWidth,
              backgroundColor: colors.shade,
            },
          ]}
        />
        <View
          style={[
            styles.absolute,
            styles.highlight,
            {
              width: bodyWidth * 0.26,
              height: bodyHeight * 0.14,
              left: bodyWidth * 0.16,
              top: bodyHeight * 0.12,
              borderRadius: bodyWidth,
            },
          ]}
        />

        <Animated.View
          testID="pebble-eyes"
          style={[styles.eyes, { top: bodyHeight * 0.34, gap: bodyWidth * 0.2 }, eyesStyle]}>
          <Eye mood={mood} size={eyeSize} color={colors.eye} glint={size >= 64} />
          <Eye mood={mood} size={eyeSize} color={colors.eye} glint={size >= 64} />
        </Animated.View>

        {showCheeks && (
          <View
            testID="pebble-cheeks"
            style={[styles.cheeks, { top: bodyHeight * 0.5, gap: bodyWidth * 0.36 }]}>
            {[0, 1].map((cheek) => (
              <View
                key={cheek}
                style={{
                  width: bodyWidth * 0.13,
                  height: bodyWidth * 0.07,
                  borderRadius: bodyWidth,
                  backgroundColor: colors.cheek,
                }}
              />
            ))}
          </View>
        )}
      </Animated.View>

      {spark && <Spark size={size * 0.16} color={colors.cheek} right={0} top={size * 0.06} />}
    </View>
  );
}

function Eye({
  mood,
  size,
  color,
  glint,
}: {
  mood: PebbleMood;
  size: number;
  color: string;
  glint: boolean;
}) {
  if (mood === 'rest') {
    return (
      <View
        testID="pebble-eye-closed"
        style={{
          width: size * 1.3,
          height: Math.max(1.5, size * 0.28),
          borderRadius: size,
          backgroundColor: color,
        }}
      />
    );
  }

  if (mood === 'celebrate') {
    // A happy arc: the top half of a ring.
    const stroke = Math.max(1.5, size * 0.32);
    return (
      <View
        testID="pebble-eye-happy"
        style={{
          width: size * 1.3,
          height: size * 0.65,
          borderTopLeftRadius: size,
          borderTopRightRadius: size,
          borderTopWidth: stroke,
          borderLeftWidth: stroke,
          borderRightWidth: stroke,
          borderColor: color,
        }}
      />
    );
  }

  return (
    <View
      testID="pebble-eye"
      style={{ width: size, height: size * 1.15, borderRadius: size, backgroundColor: color }}>
      {glint && (
        <View
          style={[
            styles.absolute,
            styles.glint,
            { width: size * 0.36, height: size * 0.36, top: size * 0.18, right: size * 0.14 },
          ]}
        />
      )}
    </View>
  );
}

/** A soft four-point spark: two rounded bars crossed. */
function Spark({
  size,
  color,
  right,
  top,
}: {
  size: number;
  color: string;
  right: number;
  top: number;
}) {
  const bar = { width: size * 0.3, height: size, borderRadius: size, backgroundColor: color };
  return (
    <View
      testID="pebble-spark"
      style={[styles.absolute, styles.spark, { width: size, height: size, right, top }]}>
      <View style={bar} />
      <View
        style={[styles.absolute, bar, { left: size * 0.35, transform: [{ rotate: '90deg' }] }]}
      />
    </View>
  );
}

export const Pebble = memo(PebbleView);

const styles = StyleSheet.create({
  absolute: {
    position: 'absolute',
  },
  ground: {
    position: 'absolute',
    bottom: 0,
  },
  body: {
    position: 'absolute',
    overflow: 'hidden',
    transformOrigin: 'bottom',
  },
  highlight: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    transform: [{ rotate: '-24deg' }],
  },
  eyes: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cheeks: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  glint: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
  },
  spark: {
    alignItems: 'center',
    transform: [{ rotate: '12deg' }],
  },
});
