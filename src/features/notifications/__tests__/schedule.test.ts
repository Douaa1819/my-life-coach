import { forbiddenReminderWords, reminderCatalogue } from '../reminder-catalogue';
import {
  DEFAULT_PREFERENCES,
  type ReminderPreferences,
  reminderTypes,
} from '../notification.schema';
import { planReminders, timeInWindow } from '../schedule';

// Saturday 28 November 2026, midday.
const NOW = new Date(2026, 10, 28, 12, 0, 0);

function prefs(overrides: Partial<ReminderPreferences>): ReminderPreferences {
  return { ...DEFAULT_PREFERENCES, enabled: true, ...overrides };
}

const weekly = (list: ReturnType<typeof planReminders>) =>
  list.filter((item) => item.kind === 'weekly') as Extract<
    (typeof list)[number],
    { kind: 'weekly' }
  >[];

describe('timeInWindow', () => {
  test('matches the database rule, including windows across midnight', () => {
    expect(timeInWindow('23:00', '21:30', '08:00')).toBe(true);
    expect(timeInWindow('03:00', '21:30', '08:00')).toBe(true);
    expect(timeInWindow('21:30', '21:30', '08:00')).toBe(true);
    expect(timeInWindow('08:00', '21:30', '08:00')).toBe(false);
    expect(timeInWindow('12:00', '21:30', '08:00')).toBe(false);
    expect(timeInWindow('13:00', '12:00', '14:00')).toBe(true);
    expect(timeInWindow('12:00', '12:00', '12:00')).toBe(false);
  });
});

describe('planReminders', () => {
  test('nothing is scheduled while reminders are off, whatever else is saved', () => {
    const saved = prefs({
      enabled: false,
      morningTime: '09:00',
      eveningTime: '20:00',
      types: ['morning_plan', 'evening_checkin'],
    });
    expect(planReminders(saved, NOW)).toEqual([]);
  });

  test('turned on with nothing chosen still schedules nothing', () => {
    expect(planReminders(prefs({}), NOW)).toEqual([]);
  });

  test('a morning and an evening reminder repeat on every day of the week', () => {
    const list = weekly(
      planReminders(
        prefs({
          morningTime: '09:00',
          eveningTime: '20:00',
          types: ['morning_plan', 'evening_checkin'],
        }),
        NOW,
      ),
    );
    expect(list).toHaveLength(14);
    expect(new Set(list.map((item) => item.weekday))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7]));
    expect(
      list.filter((item) => item.type === 'morning_plan').every((item) => item.hour === 9),
    ).toBe(true);
    expect(
      list.filter((item) => item.type === 'evening_checkin').every((item) => item.hour === 20),
    ).toBe(true);
  });

  test('a time inside quiet hours is never scheduled, even if it was saved', () => {
    const list = planReminders(
      prefs({
        morningTime: '07:00',
        eveningTime: '22:30',
        types: ['morning_plan', 'evening_checkin'],
      }),
      NOW,
    );
    expect(list).toEqual([]);
  });

  test('custom quiet hours are respected', () => {
    const list = weekly(
      planReminders(
        prefs({
          quietStart: '18:00',
          quietEnd: '09:00',
          morningTime: '08:00',
          eveningTime: '20:00',
          types: ['morning_plan', 'evening_checkin'],
        }),
        NOW,
      ),
    );
    expect(list).toEqual([]);
  });

  test('never more than two reminders on any day, and Mondays keep the earlier ones', () => {
    const list = weekly(
      planReminders(
        prefs({
          morningTime: '09:00',
          eveningTime: '20:00',
          types: ['morning_plan', 'evening_checkin', 'weekly_review'],
        }),
        NOW,
      ),
    );
    const perDay = new Map<number, string[]>();
    for (const item of list)
      perDay.set(item.weekday, [...(perDay.get(item.weekday) ?? []), item.type]);
    for (const types of perDay.values()) expect(types.length).toBeLessThanOrEqual(2);
    expect(perDay.get(2)).toEqual(['morning_plan', 'evening_checkin']);
  });

  test('the weekly look-back lands on Monday at the morning time', () => {
    const list = weekly(
      planReminders(prefs({ morningTime: '10:00', types: ['weekly_review'] }), NOW),
    );
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ type: 'weekly_review', weekday: 2, hour: 10, minute: 0 });
  });

  test('the welcome-back note is one date a few days ahead, not a repeating nag', () => {
    const list = planReminders(prefs({ morningTime: '09:00', types: ['gentle_return'] }), NOW);
    expect(list).toHaveLength(1);
    const note = list[0]!;
    expect(note.kind).toBe('date');
    if (note.kind !== 'date') return;
    expect(note.date.getDate()).toBe(1); // 28 November + 3 days = 1 December
    expect(note.date.getHours()).toBe(9);
  });

  test('the welcome-back note is skipped rather than squeezed onto a full day', () => {
    // 28 Nov + 3 days = Tuesday 1 Dec (weekday 3), which already has two reminders.
    const list = planReminders(
      prefs({
        morningTime: '09:00',
        eveningTime: '20:00',
        types: ['morning_plan', 'evening_checkin', 'gentle_return'],
      }),
      NOW,
    );
    expect(list.some((item) => item.type === 'gentle_return')).toBe(false);
  });

  test('a cap below two is honoured', () => {
    const list = weekly(
      planReminders(
        prefs({
          maxPerDay: 1,
          morningTime: '09:00',
          eveningTime: '20:00',
          types: ['morning_plan', 'evening_checkin'],
        }),
        NOW,
      ),
    );
    expect(list).toHaveLength(7);
    expect(list.every((item) => item.type === 'morning_plan')).toBe(true);
  });

  test('a cap of zero schedules nothing', () => {
    expect(
      planReminders(prefs({ maxPerDay: 0, morningTime: '09:00', types: ['morning_plan'] }), NOW),
    ).toEqual([]);
  });
});

describe('reminder wording', () => {
  test('every reminder is warm and free of guilt, streaks and pressure', () => {
    for (const type of reminderTypes) {
      const { title, body } = reminderCatalogue[type];
      expect(`${title} ${body}`).not.toMatch(forbiddenReminderWords);
    }
  });

  test('no reminder carries personal data such as goal names or numbers', () => {
    for (const type of reminderTypes) {
      const { title, body } = reminderCatalogue[type];
      expect(`${title} ${body}`).not.toMatch(/\d/);
    }
  });

  test('the guard really catches pressuring words', () => {
    expect('Do not lose your streak!').toMatch(forbiddenReminderWords);
    expect("Don't forget your habit").toMatch(forbiddenReminderWords);
    expect('You missed yesterday').toMatch(forbiddenReminderWords);
  });
});
