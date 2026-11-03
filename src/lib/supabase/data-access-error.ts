import { type PostgrestError } from '@supabase/supabase-js';

export type DataAccessErrorKind = 'network' | 'forbidden' | 'notFound' | 'invalid' | 'unknown';

/**
 * Database errors keep only their code. Messages, details and hints from
 * PostgREST describe the schema and are never shown or kept.
 */
export class DataAccessError extends Error {
  readonly kind: DataAccessErrorKind;
  readonly code: string | null;

  constructor(kind: DataAccessErrorKind, code: string | null) {
    super(`Data request failed (${kind})`);
    this.name = 'DataAccessError';
    this.kind = kind;
    this.code = code;
  }
}

const invalidDataCodes = new Set(['22001', '22023', '23502', '23505', '23514', 'PGRST204']);

export function toDataAccessError(
  error: Pick<PostgrestError, 'code' | 'message'>,
): DataAccessError {
  const code = error.code || null;
  if (!code && /network|fetch/i.test(error.message)) return new DataAccessError('network', null);
  if (code === '42501' || code === 'PGRST301' || code === 'PGRST302') {
    return new DataAccessError('forbidden', code);
  }
  if (code === 'PGRST116') return new DataAccessError('notFound', code);
  if (code && invalidDataCodes.has(code)) return new DataAccessError('invalid', code);
  return new DataAccessError('unknown', code);
}
