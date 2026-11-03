import {
  formatDuration,
  getDailyProgress,
  getProgressMessage,
} from '@/features/missions/daily-progress';

describe('getDailyProgress', () => {
  test('counts completed missions', () => {
    expect(
      getDailyProgress([
        { isCompleted: true },
        { isCompleted: false },
        { isCompleted: true },
        { isCompleted: false },
      ]),
    ).toEqual({ completed: 2, total: 4, ratio: 0.5 });
  });

  test('returns zero progress for an empty day', () => {
    expect(getDailyProgress([])).toEqual({ completed: 0, total: 0, ratio: 0 });
  });
});

describe('getProgressMessage', () => {
  test.each([
    [{ completed: 0, total: 0, ratio: 0 }, 'Rest counts too'],
    [{ completed: 0, total: 3, ratio: 0 }, 'smallest one'],
    [{ completed: 1, total: 4, ratio: 0.25 }, 'Good start'],
    [{ completed: 3, total: 4, ratio: 0.75 }, 'halfway'],
    [{ completed: 4, total: 4, ratio: 1 }, 'Every mission done'],
  ])('adapts to %o', (progress, expected) => {
    expect(getProgressMessage(progress)).toContain(expected);
  });
});

describe('formatDuration', () => {
  test.each([
    [5, '5 min'],
    [60, '1 h'],
    [95, '1 h 35 min'],
  ])('formats %i minutes as %s', (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });
});
