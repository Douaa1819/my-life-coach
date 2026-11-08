import { type PebbleMood } from '@/components/brand';
import { type IconName } from '@/components/ui';

import {
  checkInOptions,
  coachToneOptions,
  dailyMinutesOptions,
  type FocusArea,
  focusAreaLabels,
  horizonOptions,
  type OnboardingAnswers,
  type OnboardingStep,
} from './onboarding.schema';

export function firstName(displayName: string) {
  return displayName.trim().split(/\s+/)[0] || '';
}

export const focusAreaIcons: Record<FocusArea, IconName> = {
  health: 'health',
  career: 'career',
  learning: 'learning',
  finance: 'finance',
  relationships: 'relationships',
  personal: 'personal',
};

export const stepMood: Record<OnboardingStep, PebbleMood> = {
  intro: 'idle',
  name: 'encourage',
  focusAreas: 'encourage',
  goal: 'grow',
  horizon: 'idle',
  motivation: 'rest',
  dailyTime: 'idle',
  checkIn: 'rest',
  coachStyle: 'encourage',
  review: 'idle',
};

export function questionCopy(step: OnboardingStep, answers: OnboardingAnswers) {
  const name = firstName(answers.displayName);

  switch (step) {
    case 'intro':
      return {
        title: "Hi! Let's shape your first plan.",
        why: 'A few quick questions, about two minutes. You can change anything later.',
      };
    case 'name':
      return { title: 'What should I call you?', why: "I'll use it when we talk." };
    case 'focusAreas':
      return {
        title: name
          ? `What would you like to work on, ${name}?`
          : 'What would you like to work on?',
        why: "Pick up to three. We'll start with these.",
      };
    case 'goal':
      return {
        title: "What's one goal you'd love to reach?",
        why: 'Start with one. Big or small, both work.',
      };
    case 'horizon':
      return {
        title: 'When would you like to get there?',
        why: 'This sets the pace. No pressure, you can adjust it.',
      };
    case 'motivation':
      return {
        title: 'Why does this matter to you?',
        why: "When motivation dips, I'll remind you. This stays private.",
      };
    case 'dailyTime':
      return {
        title: 'How much time can you give it on a normal day?',
        why: 'So your missions fit your day, not the other way round.',
      };
    case 'checkIn':
      return {
        title: 'When should I check in with you?',
        why: 'A short note to plan the day or review it.',
      };
    case 'coachStyle':
      return { title: 'How should I coach you?', why: 'You can switch anytime.' };
    case 'review':
      return { title: "Here's what I heard", why: 'Change anything before we save it.' };
  }
}

export function reviewRows(answers: OnboardingAnswers) {
  const focus = answers.focusAreas.map((area) => focusAreaLabels[area]).join(', ') || '—';
  const horizon = horizonOptions.find((option) => option.value === answers.horizon)?.label ?? '—';
  const time = dailyMinutesOptions.find((option) => option.value === answers.dailyMinutes)?.label;
  const checkIn = checkInOptions.find((option) => option.value === answers.checkIn)?.label ?? '—';
  const tone = coachToneOptions.find((option) => option.value === answers.coachTone)?.label ?? '—';
  const motivation = answers.motivation.trim() || 'Skipped';

  return [
    { step: 'name' as const, label: 'Name', value: answers.displayName.trim() || '—' },
    { step: 'focusAreas' as const, label: 'Focus', value: focus },
    { step: 'goal' as const, label: 'Goal', value: answers.goalTitle.trim() || '—' },
    { step: 'horizon' as const, label: 'Horizon', value: horizon },
    { step: 'motivation' as const, label: 'Why it matters', value: motivation },
    { step: 'dailyTime' as const, label: 'Daily time', value: time ?? '—' },
    { step: 'checkIn' as const, label: 'Check-in', value: checkIn },
    { step: 'coachStyle' as const, label: 'Coach style', value: tone },
  ];
}

/** Honest Phase 4 copy: missions are not generated yet. */
export const completionBody =
  "I'll use your answers to shape your daily missions. Until then, Home shows a sample plan.";
