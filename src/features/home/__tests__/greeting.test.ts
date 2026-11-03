import { getGreeting } from '@/features/home/greeting';

const at = (hour: number) => new Date(2026, 10, 3, hour, 0, 0);

describe('getGreeting', () => {
  test.each([
    [3, 'Good evening'],
    [8, 'Good morning'],
    [14, 'Good afternoon'],
    [21, 'Good evening'],
  ])('at %i:00 says %s', (hour, expected) => {
    expect(getGreeting(at(hour))).toBe(expected);
  });
});
