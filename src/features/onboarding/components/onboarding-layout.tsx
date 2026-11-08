import { type ReactNode, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pebble, type PebbleMood } from '@/components/brand';
import { BottomBar, Button, Icon, InlineMessage, StepProgress, Text } from '@/components/ui';
import { layout, spacing, useTheme } from '@/design';

import { type ContinueCheck, questionNumber } from '../onboarding-flow';
import { type OnboardingStep, questionSteps } from '../onboarding.schema';
import { StepTransition } from './step-transition';

type OnboardingLayoutProps = {
  step: OnboardingStep;
  title: string;
  why: string;
  mood: PebbleMood;
  continueCheck: ContinueCheck;
  continueLabel?: string;
  skipLabel?: string;
  navigation: number;
  direction: 1 | -1;
  submitting?: boolean;
  errorMessage?: string | null;
  children: ReactNode;
  onBack: () => void;
  onContinue: () => void;
  onSkip?: () => void;
  onInvalidAttempt?: () => void;
};

const QUESTION_COUNT = questionSteps.length;

export function OnboardingLayout({
  step,
  title,
  why,
  mood,
  continueCheck,
  continueLabel = 'Continue',
  skipLabel,
  navigation,
  direction,
  submitting = false,
  errorMessage,
  children,
  onBack,
  onContinue,
  onSkip,
  onInvalidAttempt,
}: OnboardingLayoutProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [attemptedOn, setAttemptedOn] = useState<number | null>(null);
  const number = questionNumber(step);
  const progress = step === 'review' ? QUESTION_COUNT : (number ?? 0);
  const stepLabel = number ? `Step ${number} of ${QUESTION_COUNT}` : 'Review';
  const announcement = `${stepLabel}. ${title}`;
  const reason = continueCheck.ok ? undefined : continueCheck.reason;
  const showReason = attemptedOn === navigation && Boolean(reason);

  function handleContinue() {
    if (submitting) return;
    if (!continueCheck.ok) {
      setAttemptedOn(navigation);
      onInvalidAttempt?.();
      return;
    }
    setAttemptedOn(null);
    onContinue();
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.fill}>
      <View style={[styles.fill, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable
            role="button"
            aria-label="Back"
            onPress={onBack}
            hitSlop={8}
            style={styles.back}>
            <Icon name="chevronLeft" size={22} color={colors.text} />
          </Pressable>
          <Text variant="caption" color="textSecondary" accessibilityElementsHidden>
            {stepLabel}
          </Text>
        </View>

        <View style={styles.progress}>
          <StepProgress current={progress} total={QUESTION_COUNT} label="Onboarding progress" />
        </View>

        <StepTransition navigation={navigation} direction={direction}>
          <View style={styles.body}>
            <View style={styles.heading} accessibilityLiveRegion="polite">
              <Pebble size={40} mood={mood} />
              <Text variant="title" role="heading" aria-label={announcement}>
                {title}
              </Text>
              <Text color="textSecondary">{why}</Text>
            </View>
            <ScrollView
              style={styles.answer}
              contentContainerStyle={styles.answerContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          </View>
        </StepTransition>

        <BottomBar>
          {errorMessage && <InlineMessage tone="danger" message={errorMessage} />}
          {showReason && <InlineMessage tone="info" message={reason ?? ''} />}
          <Button
            label={continueLabel}
            size="lg"
            fullWidth
            trailingIcon={continueLabel === 'Continue' ? 'arrowRight' : undefined}
            loading={submitting}
            accessibilityHint={reason}
            onPress={handleContinue}
          />
          {onSkip && (
            <Button variant="ghost" label={skipLabel ?? 'Skip'} onPress={onSkip} fullWidth />
          )}
        </BottomBar>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    minHeight: layout.minTouchTarget,
  },
  back: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.sm,
  },
  body: {
    flex: 1,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.screenPadding,
    gap: spacing.lg,
  },
  heading: {
    gap: spacing.xs,
    paddingTop: spacing.lg,
  },
  answer: {
    flex: 1,
  },
  answerContent: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
});
