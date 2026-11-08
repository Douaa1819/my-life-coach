import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomBar, Button, Text } from '@/components/ui';
import { layout, spacing, useTheme } from '@/design';

import { PebbleStage } from '../components/pebble-stage';
import { questionCopy } from '../onboarding-copy';
import { createInitialAnswers } from '../onboarding.schema';

type IntroScreenProps = {
  onStart: () => void;
  onSignOut: () => void;
};

export function IntroScreen({ onStart, onSignOut }: IntroScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const copy = questionCopy('intro', createInitialAnswers());

  return (
    <View style={[styles.fill, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.top}>
        <Pressable
          role="button"
          aria-label="Sign out"
          onPress={onSignOut}
          hitSlop={8}
          style={styles.signOut}>
          <Text variant="bodyStrong" color="primary">
            Sign out
          </Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <PebbleStage size={160} mood="idle" showPath blinkAfter={560} />
        <Text variant="display" role="heading" align="center">
          {copy.title}
        </Text>
        <Text color="textSecondary" align="center">
          {copy.why}
        </Text>
      </View>

      <BottomBar>
        <Button
          label="Let's start"
          size="lg"
          fullWidth
          trailingIcon="arrowRight"
          onPress={onStart}
        />
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  top: {
    alignItems: 'flex-end',
    paddingHorizontal: layout.screenPadding,
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
  },
  signOut: {
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
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
