import { displayNameSchema, profileRowSchema, profileUpdateSchema } from '../profile.schema';

const row = {
  id: '11111111-1111-4111-8111-111111111111',
  display_name: 'Sara',
  avatar_url: null,
  timezone: 'Europe/Paris',
  onboarding_completed: false,
};

describe('profileRowSchema', () => {
  test('maps a database row to the app shape', () => {
    expect(profileRowSchema.parse(row)).toEqual({
      id: row.id,
      displayName: 'Sara',
      avatarUrl: null,
      timezone: 'Europe/Paris',
      onboardingCompleted: false,
    });
  });

  test('rejects rows that do not match the contract', () => {
    expect(profileRowSchema.safeParse({ ...row, id: 'not-a-uuid' }).success).toBe(false);
    expect(profileRowSchema.safeParse({ ...row, onboarding_completed: 'yes' }).success).toBe(false);
    expect(profileRowSchema.safeParse({ ...row, display_name: undefined }).success).toBe(false);
  });
});

describe('displayNameSchema', () => {
  test('trims surrounding spaces', () => {
    expect(displayNameSchema.parse('  Sara  ')).toBe('Sara');
  });

  test.each([
    ['empty', ''],
    ['only spaces', '   '],
    ['too long', 'a'.repeat(51)],
    ['a line break', 'Sa\nra'],
    ['a control character', 'Sa\u0007ra'],
    ['a C1 control character', 'Sa\u0085ra'],
  ])('rejects a name that is %s', (_case, value) => {
    expect(displayNameSchema.safeParse(value).success).toBe(false);
  });

  test('accepts accented and non-Latin names', () => {
    expect(displayNameSchema.safeParse('Zoé').success).toBe(true);
    expect(displayNameSchema.safeParse('دعاء').success).toBe(true);
  });
});

describe('profileUpdateSchema', () => {
  test('only contains client-editable fields', () => {
    const parsed = profileUpdateSchema.parse({
      displayName: 'Sara',
      onboardingCompleted: true,
      id: 'someone-else',
    });
    expect(parsed).toEqual({ displayName: 'Sara' });
  });
});
