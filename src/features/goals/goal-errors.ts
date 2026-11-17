import { DataAccessError } from '@/lib/supabase/data-access-error';

export function goalSaveErrorMessage(error: unknown) {
  if (error instanceof DataAccessError && error.kind === 'network') {
    return "Can't reach the server. Check your connection and try again.";
  }
  if (error instanceof DataAccessError && error.kind === 'invalid') {
    return 'That goal could not be saved. Check the title and try again.';
  }
  if (error instanceof DataAccessError && error.kind === 'notFound') {
    return 'This goal is no longer available.';
  }
  return "We couldn't save your goal. Please try again.";
}

export function goalLoadErrorMessage(error: unknown) {
  if (error instanceof DataAccessError && error.kind === 'network') {
    return "Can't reach the server. Check your connection and try again.";
  }
  if (error instanceof DataAccessError && error.kind === 'notFound') {
    return 'This goal is no longer available.';
  }
  return "We couldn't load your goals. Your data is safe. Try again in a moment.";
}
