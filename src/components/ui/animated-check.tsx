import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { springTo, timingTo, useMotionPreference, useTheme } from '@/design';
import { playSound } from '@/lib/sound/play-sound';
import { vibrate } from '@/lib/vibration/vibrate';

import { Icon } from './icon';

type AnimatedCheckProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** What this box completes, for screen readers: "Walk for 20 minutes". */
  label: string;
  size?: number;
  /** Plays the soft "done" sound when the person checks it. Honors the sound preference. */
  sound?: boolean;
  disabled?: boolean;
};

/**
 * A checkbox that rewards the tap: a green fill grows from the center, the tick
 * appears, and a faint ring fades outward, all within about 320 ms. Under reduced
 * motion the state changes at once. The checked state is always a tick plus a fill,
 * never color alone, and the sound is optional.
 */
export function AnimatedCheck({
  checked,
  onChange,
  label,
  size = 32,
  sound = true,
  disabled = false,
}: AnimatedCheckProps) {
  const { colors } = useTheme();
  const { reduceMotion } = useMotionPreference();
  const fill = useSharedValue(checked ? 1 : 0);
  const ring = useSharedValue(1);
  const wasChecked = useRef(checked);

  useEffect(() => {
    if (reduceMotion) {
      fill.set(checked ? 1 : 0);
    } else {
      fill.set(springTo(checked ? 1 : 0, checked ? 'playful' : 'default'));
      if (checked && !wasChecked.current) {
        ring.set(0);
        ring.set(timingTo(1, 'moderate', 'decelerate'));
      }
    }
    wasChecked.current = checked;
  }, [checked, reduceMotion, fill, ring]);

  const fillStyle = useAnimatedStyle(() => ({
    opacity: Math.min(fill.get() * 2, 1),
    transform: [{ scale: Math.max(fill.get(), 0) }],
  }));
  const tickStyle = useAnimatedStyle(() => ({
    opacity: Math.min(Math.max(fill.get() - 0.3, 0) * 2, 1),
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: (1 - ring.get()) * 0.5,
    transform: [{ scale: 1 + ring.get() * 0.6 }],
  }));

  function toggle() {
    const next = !checked;
    onChange(next);
    if (next && sound) {
      playSound('taskDone');
      vibrate('taskDone');
    }
  }

  return (
    <Pressable
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={toggle}
      hitSlop={Math.max(0, (48 - size) / 2)}
      style={[styles.hit, { width: size, height: size }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fill,
          { borderRadius: size, borderColor: colors.successFill, borderWidth: 2 },
          ringStyle,
        ]}
      />
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size,
            borderColor: checked ? colors.successCheck : colors.borderStrong,
          },
        ]}>
        <Animated.View
          style={[
            styles.fill,
            { borderRadius: size, backgroundColor: colors.successCheck },
            fillStyle,
          ]}
        />
        <Animated.View style={tickStyle}>
          <Icon name="check" size={size * 0.56} color={colors.onPrimary} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: {
    ...StyleSheet.absoluteFill,
  },
});
