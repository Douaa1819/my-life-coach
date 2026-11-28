import { localDateString } from '../local-date';

describe('localDateString', () => {
  const instant = new Date('2026-11-28T23:30:00.000Z');

  test('uses the date in the given time zone, not the device or UTC date', () => {
    expect(localDateString(instant, 'UTC')).toBe('2026-11-28');
    expect(localDateString(instant, 'Pacific/Kiritimati')).toBe('2026-11-29');
    expect(localDateString(instant, 'Pacific/Pago_Pago')).toBe('2026-11-28');
  });

  test('falls back to the device zone for an unknown name instead of throwing', () => {
    expect(localDateString(instant, 'Not/AZone')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
