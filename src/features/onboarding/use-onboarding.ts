import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useReducer, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { type Profile } from '@/features/profile/profile.schema';
import { profileQueryKeys } from '@/features/profile/use-profile';

import { completeOnboarding, OnboardingSubmitError } from './onboarding.api';
import { onboardingDraftStore as defaultDraftStore } from './onboarding-draft';
import { type OnboardingDraftStore } from './onboarding-draft-store';
import { createInitialState, onboardingReducer, type OnboardingState } from './onboarding-flow';
import { type OnboardingAnswers } from './onboarding.schema';

type UseOnboardingOptions = {
  userId: string;
  /** Prefills the name step from the profile. Read when the flow starts for a user. */
  initialName: string;
  draftStore?: OnboardingDraftStore;
};

type Submission = { userId: string; answers: OnboardingAnswers };

export function useOnboarding({
  userId,
  initialName,
  draftStore = defaultDraftStore,
}: UseOnboardingOptions) {
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(onboardingReducer, null, (): OnboardingState =>
    createInitialState(initialName, userId, true),
  );
  const [completedFor, setCompletedFor] = useState<string | null>(null);

  // Until the reset below runs, the state may still hold the previous user's answers.
  const isCurrentUser = state.ownerId === userId;
  /** Editable fields must not be shown while true: the draft is still being read. */
  const isRestoring = !isCurrentUser || state.restoring;
  const isCompleted = completedFor === userId;
  const canSave = isCurrentUser && !isRestoring && !isCompleted;

  const latest = useRef({ state, userId, initialName, canSave, draftStore });
  useEffect(() => {
    latest.current = { state, userId, initialName, canSave, draftStore };
  });

  useEffect(() => {
    let active = true;
    dispatch({ type: 'reset', ownerId: userId, displayName: latest.current.initialName });
    // An unreadable draft only means starting over; it must never block the flow.
    void draftStore
      .load(userId)
      .catch(() => null)
      .then((draft) => {
        if (active) dispatch({ type: 'restore', userId, draft });
      });
    return () => {
      active = false;
    };
  }, [draftStore, userId]);

  useEffect(() => {
    if (!canSave || !state.pendingSave) return;
    void draftStore.save(userId, state.step, state.answers);
    dispatch({ type: 'saved', navigation: state.navigation });
  }, [canSave, draftStore, state, userId]);

  // The OS may kill a backgrounded app: keep what was typed on the current step.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') return;
      const current = latest.current;
      if (!current.canSave) return;
      void current.draftStore.save(current.userId, current.state.step, current.state.answers);
    });
    return () => subscription.remove();
  }, []);

  const submit = useMutation({
    mutationFn: ({ answers }: Submission) => completeOnboarding(answers),
    onSuccess: (_, { userId: submittedFor }) => {
      setCompletedFor(submittedFor);
      void draftStore.clear(submittedFor);
    },
    onError: (error, { userId: submittedFor }) => {
      if (submittedFor !== latest.current.userId) return;
      if (error instanceof OnboardingSubmitError && error.step) {
        dispatch({ type: 'edit', step: error.step });
      }
    },
  });

  const submitAnswers = () => {
    if (!isCurrentUser || isRestoring || submit.isPending) return;
    submit.mutate({ userId, answers: state.answers });
  };

  /**
   * Leaves the completion screen. The cached profile is marked completed first so
   * the guard opens Home even offline; the refetch then brings the server's copy.
   */
  const finish = () => {
    const key = profileQueryKeys.detail(userId);
    queryClient.setQueryData<Profile>(key, (profile) =>
      profile ? { ...profile, onboardingCompleted: true } : profile,
    );
    return queryClient.invalidateQueries({ queryKey: key });
  };

  return { state, dispatch, isRestoring, isCompleted, submit, submitAnswers, finish };
}
