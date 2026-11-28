import { describeCadence, streakMessage } from '../habit-copy';
import { type Streak } from '../habit.schema';

const streak = (overrides: Partial<Streak>): Streak => ({
  current: 0,
  best: 0,
  checkedToday: false,
  daysSinceLast: null,
  welcomeBack: false,
  ...overrides,
});

describe('describeCadence', () => {
  test('names each cadence plainly', () => {
    expect(describeCadence({ cadence: 'daily', daysOfWeek: [], targetPerPeriod: 1 })).toBe(
      'Every day',
    );
    expect(describeCadence({ cadence: 'weekdays', daysOfWeek: [], targetPerPeriod: 1 })).toBe(
      'Weekdays',
    );
    expect(describeCadence({ cadence: 'weekly', daysOfWeek: [], targetPerPeriod: 3 })).toBe(
      '3 times a week',
    );
    expect(describeCadence({ cadence: 'weekly', daysOfWeek: [], targetPerPeriod: 1 })).toBe(
      '1 time a week',
    );
    expect(describeCadence({ cadence: 'custom', daysOfWeek: [3, 1], targetPerPeriod: 1 })).toBe(
      'Mon, Wed',
    );
  });
});

describe('streakMessage', () => {
  const daily = { cadence: 'daily' } as const;

  test('celebrates a running streak', () => {
    expect(streakMessage(daily, streak({ current: 1 }))).toBe('1 day in a row');
    expect(streakMessage(daily, streak({ current: 5, best: 5 }))).toBe('5 days in a row');
    expect(streakMessage({ cadence: 'weekly' }, streak({ current: 2 }))).toBe('2 weeks in a row');
  });

  test('a restart is a fresh start, never a loss', () => {
    expect(streakMessage(daily, streak({ current: 0, best: 4 }))).toBe(
      'Fresh start today. Your best is 4 days.',
    );
    expect(streakMessage(daily, streak({ welcomeBack: true, best: 9 }))).toBe(
      'Welcome back. Today is a fresh start.',
    );
  });

  test('a new habit is simply ready', () => {
    expect(streakMessage(daily, streak({}))).toBe('Ready when you are.');
  });

  test('no message can contain guilt or loss wording', () => {
    const everything = [
      streakMessage(daily, streak({ current: 3 })),
      streakMessage(daily, streak({ best: 5 })),
      streakMessage(daily, streak({ welcomeBack: true })),
      streakMessage(daily, streak({})),
    ].join(' ');
    expect(everything).not.toMatch(/broke|lost|missed|failed|behind|streak ended/i);
  });
});
