import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useReducer, useRef, useState } from 'react';

import { profileQueryKeys } from '@/features/profile/use-profile';

import { completeOnboarding, OnboardingSubmitError } from './onboarding.api';
import { onboardingDraftStore } from './onboarding-draft';
import { type OnboardingDraftStore } from './onboarding-draft-store';
import { createInitialState, onboardingReducer } from './onboarding-flow';

type UseOnboardingOptions = {
  userId: string;
  /** Prefills the name step from the profile. */
  initialName: string;
  draftStore?: OnboardingDraftStore;
};

export function useOnboarding({
  userId,
  initialName,
  draftStore = onboardingDraftStore,
}: UseOnboardingOptions) {
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(onboardingReducer, initialName, createInitialState);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const savedNavigation = useRef(state.navigation);

  useEffect(() => {
    let active = true;
    void draftStore.load(userId).then((draft) => {
      if (!active) return;
      if (draft) dispatch({ type: 'restore', draft });
      setIsRestoring(false);
    });
    return () => {
      active = false;
    };
  }, [draftStore, userId]);

  useEffect(() => {
    if (isRestoring || isCompleted || state.navigation === savedNavigation.current) return;
    savedNavigation.current = state.navigation;
    void draftStore.save(userId, state.step, state.answers);
  }, [draftStore, isCompleted, isRestoring, state, userId]);

  const submit = useMutation({
    mutationFn: () => completeOnboarding(state.answers),
    onSuccess: () => {
      setIsCompleted(true);
      void draftStore.clear(userId);
    },
    onError: (error) => {
      if (error instanceof OnboardingSubmitError && error.step) {
        dispatch({ type: 'edit', step: error.step });
      }
    },
  });

  /** Leaves the completion screen: the refreshed profile lets the guard open Home. */
  const finish = () => queryClient.invalidateQueries({ queryKey: profileQueryKeys.detail(userId) });

  return { state, dispatch, isRestoring, isCompleted, submit, finish };
}
