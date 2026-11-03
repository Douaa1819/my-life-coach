import { DataAccessError, toDataAccessError } from '../data-access-error';

describe('toDataAccessError', () => {
  test.each([
    ['42501', 'forbidden'],
    ['PGRST301', 'forbidden'],
    ['PGRST116', 'notFound'],
    ['23514', 'invalid'],
    ['22023', 'invalid'],
    ['XX000', 'unknown'],
  ])('maps %s to %s', (code, kind) => {
    expect(toDataAccessError({ code, message: 'relation details' }).kind).toBe(kind);
  });

  test('recognizes network failures', () => {
    expect(toDataAccessError({ code: '', message: 'TypeError: Network request failed' }).kind).toBe(
      'network',
    );
  });

  test('drops the database message', () => {
    const error = toDataAccessError({
      code: '23514',
      message: 'new row for relation "profiles" violates check constraint',
    });
    expect(error).toBeInstanceOf(DataAccessError);
    expect(error.message).not.toContain('profiles');
    expect(JSON.stringify(error)).not.toContain('constraint');
  });
});
