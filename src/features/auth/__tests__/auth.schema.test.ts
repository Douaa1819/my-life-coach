import { getFieldErrors } from '@/lib/forms/use-zod-form';

import {
  emailSchema,
  forgotPasswordSchema,
  newPasswordSchema,
  signInSchema,
  signUpSchema,
} from '../auth.schema';

describe('emailSchema', () => {
  test('trims and lower-cases a valid address', () => {
    expect(emailSchema.parse('  Sara.K@Example.COM ')).toBe('sara.k@example.com');
  });

  test.each(['', '   ', 'sara', 'sara@', '@example.com', 'sara@example'])('rejects %p', (value) => {
    expect(emailSchema.safeParse(value).success).toBe(false);
  });

  test('rejects addresses longer than 254 characters', () => {
    expect(emailSchema.safeParse(`${'a'.repeat(250)}@x.io`).success).toBe(false);
  });
});

describe('newPasswordSchema', () => {
  test.each(['abcdefg1', 'correct horse 9', 'Pässwörd1'])('accepts %p', (value) => {
    expect(newPasswordSchema.safeParse(value).success).toBe(true);
  });

  test.each([
    ['too short', 'abc123'],
    ['no digit', 'abcdefgh'],
    ['no letter', '12345678'],
    ['only non-ASCII letters', 'ééééééé1'],
  ])('rejects a password with %s', (_case, value) => {
    expect(newPasswordSchema.safeParse(value).success).toBe(false);
  });

  test('rejects passwords over 72 bytes, the bcrypt limit', () => {
    expect(newPasswordSchema.safeParse(`a1${'x'.repeat(70)}`).success).toBe(true);
    expect(newPasswordSchema.safeParse(`a1${'x'.repeat(71)}`).success).toBe(false);
    expect(newPasswordSchema.safeParse(`a1${'é'.repeat(36)}`).success).toBe(false);
  });

  test('does not trim: spaces are part of the password', () => {
    expect(newPasswordSchema.parse(' abcdef1 ')).toBe(' abcdef1 ');
  });
});

describe('signInSchema', () => {
  test('only requires a password to be present', () => {
    expect(signInSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
  });

  test('reports one message per field', () => {
    const result = signInSchema.safeParse({ email: 'nope', password: '' });
    expect(result.success).toBe(false);
    expect(getFieldErrors(result.error!)).toEqual({
      email: 'Enter a valid email address.',
      password: 'Enter your password.',
    });
  });
});

describe('signUpSchema', () => {
  const valid = { displayName: ' Sara ', email: 'sara@example.com', password: 'runfast10k' };

  test('accepts and normalizes a valid registration', () => {
    expect(signUpSchema.parse(valid)).toEqual({
      displayName: 'Sara',
      email: 'sara@example.com',
      password: 'runfast10k',
    });
  });

  test('requires a name', () => {
    const result = signUpSchema.safeParse({ ...valid, displayName: '   ' });
    expect(getFieldErrors(result.error!).displayName).toBe('Enter your first name.');
  });

  test('applies the new-password rules', () => {
    const result = signUpSchema.safeParse({ ...valid, password: 'short1' });
    expect(getFieldErrors(result.error!).password).toBe('Use at least 8 characters.');
  });
});

describe('forgotPasswordSchema', () => {
  test('requires a valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: '' }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.co' }).success).toBe(true);
  });
});
