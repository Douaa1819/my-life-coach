import { goalRowSchema, goalWriteSchema } from '../goal.schema';
import { goalRowFixture, validWriteInput } from './goal-fixtures';

describe('goalWriteSchema', () => {
  test('accepts a complete goal', () => {
    expect(goalWriteSchema.parse(validWriteInput)).toEqual(validWriteInput);
  });

  test('trims the title and empty description', () => {
    expect(
      goalWriteSchema.parse({
        ...validWriteInput,
        title: '  Run a 10 km race  ',
        description: '   ',
      }),
    ).toMatchObject({ title: 'Run a 10 km race', description: null });
  });

  test.each(['ab', 'a'.repeat(121), 'Run\n5 km', 'Go\u0007'])('rejects title %j', (title) => {
    expect(goalWriteSchema.safeParse({ ...validWriteInput, title }).success).toBe(false);
  });

  test('rejects an unknown category', () => {
    expect(
      goalWriteSchema.safeParse({ ...validWriteInput, category: 'spirituality' }).success,
    ).toBe(false);
  });

  test('rejects an unknown horizon', () => {
    expect(goalWriteSchema.safeParse({ ...validWriteInput, horizon: '2_weeks' }).success).toBe(
      false,
    );
  });

  test('accepts a blank deadline', () => {
    expect(goalWriteSchema.parse({ ...validWriteInput, targetDate: '' }).targetDate).toBeNull();
  });

  test('rejects an impossible date', () => {
    expect(
      goalWriteSchema.safeParse({ ...validWriteInput, targetDate: '2027-02-31' }).success,
    ).toBe(false);
  });
});

describe('goalRowSchema', () => {
  test('maps database columns to the app model', () => {
    expect(goalRowSchema.parse(goalRowFixture())).toMatchObject({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      userId: '11111111-1111-4111-8111-111111111111',
      title: 'Run a 10 km race',
      targetDate: '2027-05-01',
      status: 'active',
    });
  });

  test('rejects a row from an unknown category', () => {
    expect(goalRowSchema.safeParse(goalRowFixture({ category: 'other' })).success).toBe(false);
  });
});
