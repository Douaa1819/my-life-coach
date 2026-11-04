import {
  focusAreasSchema,
  goalTitleSchema,
  motivationSchema,
  onboardingAnswersSchema,
  onboardingDraftSchema,
} from '../onboarding.schema';
import { completeAnswers, USER_A } from './onboarding-fixtures';

describe('focusAreasSchema', () => {
  test.each([
    [[], false],
    [['health'], true],
    [['health', 'career', 'learning'], true],
    [['health', 'career', 'learning', 'finance'], false],
    [['health', 'health'], false],
    [['cooking'], false],
  ])('%j is valid: %s', (areas, expected) => {
    expect(focusAreasSchema.safeParse(areas).success).toBe(expected);
  });
});

describe('goalTitleSchema', () => {
  test.each([
    ['ab', false],
    ['abc', true],
    ['a'.repeat(120), true],
    ['a'.repeat(121), false],
    ['  Run 5 km  ', true],
    ['Run\n5 km', false],
  ])('%j is valid: %s', (title, expected) => {
    expect(goalTitleSchema.safeParse(title).success).toBe(expected);
  });

  test('counts code points like the database', () => {
    expect(goalTitleSchema.safeParse('🏃🏃').success).toBe(false);
    expect(goalTitleSchema.safeParse('🏃'.repeat(120)).success).toBe(true);
  });

  test('trims the value', () => {
    expect(goalTitleSchema.parse('  Run 5 km  ')).toBe('Run 5 km');
  });
});

describe('motivationSchema', () => {
  test('empty or blank means skipped', () => {
    expect(motivationSchema.parse('')).toBeNull();
    expect(motivationSchema.parse('   ')).toBeNull();
  });

  test.each([
    ['a'.repeat(280), true],
    ['a'.repeat(281), false],
    ['line one\nline two', true],
    ['tab\there', false],
  ])('%j is valid: %s', (value, expected) => {
    expect(motivationSchema.safeParse(value).success).toBe(expected);
  });
});

describe('onboardingAnswersSchema', () => {
  test('builds the submission with a trimmed name and the reminder time', () => {
    expect(onboardingAnswersSchema.parse(completeAnswers({ displayName: '  Sara ' }))).toEqual({
      displayName: 'Sara',
      focusAreas: ['health', 'career'],
      goalTitle: 'Run 5 km',
      goalCategory: 'health',
      goalDescription: 'More energy for my kids',
      horizon: '6_months',
      dailyMinutes: 15,
      reminderTime: '08:00',
      coachTone: 'gentle',
    });
  });

  test('"No reminders" and a skipped reason become null', () => {
    const submission = onboardingAnswersSchema.parse(
      completeAnswers({ checkIn: 'none', motivation: '' }),
    );
    expect(submission.reminderTime).toBeNull();
    expect(submission.goalDescription).toBeNull();
  });

  test.each([
    { displayName: '' },
    { displayName: 'a'.repeat(51) },
    { goalCategory: 'finance' as const },
    { checkIn: null },
    { coachTone: null },
  ])('rejects %j', (override) => {
    expect(onboardingAnswersSchema.safeParse(completeAnswers(override)).success).toBe(false);
  });
});

describe('onboardingDraftSchema', () => {
  const draft = {
    version: 1,
    userId: USER_A,
    step: 'goal',
    answers: completeAnswers(),
    savedAt: '2026-11-03T10:00:00.000Z',
  };

  test('accepts a valid draft', () => {
    expect(onboardingDraftSchema.safeParse(draft).success).toBe(true);
  });

  test.each([
    { version: 2 },
    { userId: 'not-a-uuid' },
    { step: 'completion' },
    { answers: { ...completeAnswers(), focusAreas: ['health', 'career', 'learning', 'finance'] } },
    { answers: { ...completeAnswers(), goalTitle: 'a'.repeat(501) } },
  ])('rejects %j', (override) => {
    expect(onboardingDraftSchema.safeParse({ ...draft, ...override }).success).toBe(false);
  });
});
