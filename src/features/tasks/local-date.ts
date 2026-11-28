/**
 * Today's calendar date (YYYY-MM-DD) in the person's own time zone, the same one the server
 * uses to decide what "today" is. Falls back to the device zone for an unknown name.
 */
export function localDateString(now: Date, timeZone?: string): string {
  const options = { year: 'numeric', month: '2-digit', day: '2-digit' } as const;
  try {
    return new Intl.DateTimeFormat('en-CA', { ...options, timeZone }).format(now);
  } catch {
    return new Intl.DateTimeFormat('en-CA', options).format(now);
  }
}
