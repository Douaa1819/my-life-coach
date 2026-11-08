import { useFocusEffect, router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { BackHandler, type TextInputInstance } from 'react-native';

import { rootHref } from '@/components/navigation/tab-routes';
import { useAuth } from '@/features/auth/auth-provider';
import { useProfile } from '@/features/profile/use-profile';

import { OnboardingLayout } from '../components/onboarding-layout';
import { type Onboarding } from '../onboarding-gate';
import { questionCopy, stepMood } from '../onboarding-copy';
import { canContinue, hardwareBackAction } from '../onboarding-flow';
import { OnboardingSubmitError } from '../onboarding.api';
import { type OnboardingStep, onboardingSteps } from '../onboarding.schema';
import { CheckInStep } from './check-in-step';
import { CoachStyleStep } from './coach-style-step';
import { CompletionScreen } from './completion-screen';
import { DailyTimeStep } from './daily-time-step';
import { FocusAreasStep } from './focus-areas-step';
import { GoalStep } from './goal-step';
import { HorizonStep } from './horizon-step';
import { IntroScreen } from './intro-screen';
import { MotivationStep } from './motivation-step';
import { NameStep } from './name-step';
import { ReviewScreen } from './review-screen';

type OnboardingFlowScreenProps = {
  onboarding: Onboarding;
};

function stepIndex(step: OnboardingStep) {
  return onboardingSteps.indexOf(step);
}

function submitMessage(error: unknown) {
  if (error instanceof OnboardingSubmitError && error.kind === 'network') {
    return "Can't reach the server. Your answers are kept.";
  }
  if (error instanceof OnboardingSubmitError && error.kind === 'invalid') {
    return 'Some answers need a look.';
  }
  return 'Something went wrong. Your answers are kept.';
}

export function OnboardingFlowScreen({ onboarding }: OnboardingFlowScreenProps) {
  const { state, dispatch, isCompleted, submit, submitAnswers, finish } = onboarding;
  const { signOut } = useAuth();
  const profile = useProfile();
  const nameRef = useRef<TextInputInstance>(null);
  const [direction, setDirection] = useState<1 | -1>(1);

  const copy = questionCopy(state.step, state.answers);
  const continueCheck = canContinue(state.step, state.answers);
  const submitting = submit.isPending;
  const errorMessage = submit.isError ? submitMessage(submit.error) : null;

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        const action = hardwareBackAction(state.step, isCompleted);
        if (action === 'exit') return false;
        if (action === 'back') {
          setDirection(-1);
          dispatch({ type: 'back' });
        }
        return true;
      });
      return () => subscription.remove();
    }, [dispatch, isCompleted, state.step]),
  );

  function move(action: Parameters<typeof dispatch>[0], nextDirection: 1 | -1) {
    setDirection(nextDirection);
    dispatch(action);
  }

  if (isCompleted) {
    return (
      <CompletionScreen
        displayName={state.answers.displayName}
        onSeePlan={() => {
          void finish();
          router.replace(rootHref);
        }}
      />
    );
  }

  if (state.step === 'intro') {
    return (
      <IntroScreen onStart={() => move({ type: 'next' }, 1)} onSignOut={() => void signOut()} />
    );
  }

  return (
    <OnboardingLayout
      step={state.step}
      title={copy.title}
      why={copy.why}
      mood={stepMood[state.step]}
      continueCheck={continueCheck}
      continueLabel={
        state.step === 'review' ? (errorMessage ? 'Try again' : 'Build my first day') : 'Continue'
      }
      skipLabel="Skip"
      navigation={state.navigation}
      direction={direction}
      submitting={submitting}
      errorMessage={state.step === 'review' ? errorMessage : null}
      onBack={() => move({ type: 'back' }, -1)}
      onContinue={() => {
        if (state.step === 'review') submitAnswers();
        else move({ type: 'next' }, 1);
      }}
      onSkip={state.step === 'motivation' ? () => move({ type: 'skip' }, 1) : undefined}
      onInvalidAttempt={state.step === 'name' ? () => nameRef.current?.focus() : undefined}>
      {state.step === 'name' && (
        <NameStep
          answers={state.answers}
          inputRef={nameRef}
          onChange={(value) => dispatch({ type: 'setText', field: 'displayName', value })}
          onSubmit={() => move({ type: 'next' }, 1)}
        />
      )}
      {state.step === 'focusAreas' && (
        <FocusAreasStep
          answers={state.answers}
          blocked={state.notice === 'maxFocusAreas'}
          onToggle={(area) => dispatch({ type: 'toggleFocusArea', area })}
        />
      )}
      {state.step === 'goal' && (
        <GoalStep
          answers={state.answers}
          onChangeTitle={(value) => dispatch({ type: 'setText', field: 'goalTitle', value })}
          onChangeCategory={(area) => dispatch({ type: 'answer', patch: { goalCategory: area } })}
          onSubmit={() => move({ type: 'next' }, 1)}
        />
      )}
      {state.step === 'horizon' && (
        <HorizonStep
          answers={state.answers}
          onSelect={(horizon) => dispatch({ type: 'answer', patch: { horizon } })}
        />
      )}
      {state.step === 'motivation' && (
        <MotivationStep
          answers={state.answers}
          onChange={(value) => dispatch({ type: 'setText', field: 'motivation', value })}
          onSubmit={() => move({ type: 'next' }, 1)}
        />
      )}
      {state.step === 'dailyTime' && (
        <DailyTimeStep
          answers={state.answers}
          onSelect={(dailyMinutes) => dispatch({ type: 'answer', patch: { dailyMinutes } })}
        />
      )}
      {state.step === 'checkIn' && (
        <CheckInStep
          answers={state.answers}
          timeZone={profile.data?.timezone}
          onSelect={(checkIn) => dispatch({ type: 'answer', patch: { checkIn } })}
        />
      )}
      {state.step === 'coachStyle' && (
        <CoachStyleStep
          answers={state.answers}
          onSelect={(coachTone) => dispatch({ type: 'answer', patch: { coachTone } })}
        />
      )}
      {state.step === 'review' && (
        <ReviewScreen
          answers={state.answers}
          editingLocked={submitting}
          onEdit={(step) =>
            move({ type: 'edit', step }, stepIndex(step) >= stepIndex(state.step) ? 1 : -1)
          }
        />
      )}
    </OnboardingLayout>
  );
}
