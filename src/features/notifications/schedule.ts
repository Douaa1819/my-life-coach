import { reminderCatalogue } from './reminder-catalogue';
import {
  MAX_REMINDERS_PER_DAY,
  type ReminderPreferences,
  type ReminderType,
} from './notification.schema';

export type PlannedReminder = {
  /** Stable name, handy for tests. */
  key: string;
  type: ReminderType;
  title: string;
  body: string;
  hour: number;
  minute: number;
} & ({ kind: 'weekly'; weekday: number } | { kind: 'date'; date: Date });

/** 1 is Sunday, matching the weekday numbers expo-notifications uses. */
const MONDAY = 2;
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

/** When two reminders compete for a day, the earlier one in this list wins. */
const PRIORITY: readonly ReminderType[] = [
  'morning_plan',
  'evening_checkin',
  'weekly_review',
  'gentle_return',
];

const FALLBACK_REVIEW_TIME = '09:00';
const FALLBACK_RETURN_TIME = '10:00';
export const QUIET_DAYS_BEFORE_RETURN = 3;

function minutesOf(time: string) {
  const [hour = '0', minute = '0'] = time.split(':');
  return Number(hour) * 60 + Number(minute);
}

/** True when `time` is in [start, end), which may cross midnight. Mirrors the database. */
export function timeInWindow(time: string, start: string, end: string) {
  const t = minutesOf(time);
  const from = minutesOf(start);
  const to = minutesOf(end);
  if (from === to) return false;
  return from < to ? t >= from && t < to : t >= from || t < to;
}

/** 1 (Sunday) to 7 (Saturday) for a calendar date in the device's own zone. */
function weekdayOf(date: Date) {
  return date.getDay() + 1;
}

/**
 * Turns the person's choices into the exact reminders to schedule on the device.
 *
 * - Nothing at all unless reminders are on.
 * - A time inside quiet hours is never scheduled, whatever was saved.
 * - On any day at most `maxPerDay` (never above two) reminders, keeping the earlier item
 *   in the priority list. The gentle welcome-back note is a single date, and it is skipped
 *   rather than squeezed onto a full day.
 * - The welcome-back note is set a few days ahead and pushed forward each time the app is
 *   opened, so it only ever arrives after the person has been away.
 */
export function planReminders(prefs: ReminderPreferences, now: Date): PlannedReminder[] {
  if (!prefs.enabled) return [];
  const cap = Math.max(0, Math.min(prefs.maxPerDay, MAX_REMINDERS_PER_DAY));
  if (cap === 0) return [];
  const wants = (type: ReminderType) => prefs.types.includes(type);
  const allowed = (time: string) => !timeInWindow(time, prefs.quietStart, prefs.quietEnd);
  const split = (time: string) => ({
    hour: Number(time.slice(0, 2)),
    minute: Number(time.slice(3, 5)),
  });

  const make = (type: ReminderType, time: string) => ({
    key: type,
    type,
    ...reminderCatalogue[type],
    ...split(time),
  });

  const reviewTime = prefs.morningTime ?? FALLBACK_REVIEW_TIME;
  const returnTime = prefs.morningTime ?? FALLBACK_RETURN_TIME;

  const perDay = new Map<number, PlannedReminder[]>();
  for (const weekday of WEEKDAYS) {
    const day: PlannedReminder[] = [];
    if (wants('morning_plan') && prefs.morningTime && allowed(prefs.morningTime)) {
      day.push({ ...make('morning_plan', prefs.morningTime), kind: 'weekly', weekday });
    }
    if (wants('evening_checkin') && prefs.eveningTime && allowed(prefs.eveningTime)) {
      day.push({ ...make('evening_checkin', prefs.eveningTime), kind: 'weekly', weekday });
    }
    if (wants('weekly_review') && weekday === MONDAY && allowed(reviewTime)) {
      day.push({ ...make('weekly_review', reviewTime), kind: 'weekly', weekday });
    }
    day.sort((a, b) => PRIORITY.indexOf(a.type) - PRIORITY.indexOf(b.type));
    perDay.set(weekday, day.slice(0, cap));
  }

  const planned = WEEKDAYS.flatMap((weekday) => perDay.get(weekday) ?? []).map((item) => ({
    ...item,
    key: `${item.type}-${(item as { weekday: number }).weekday}`,
  })) as PlannedReminder[];

  if (wants('gentle_return') && allowed(returnTime)) {
    const { hour, minute } = split(returnTime);
    const date = new Date(now);
    date.setDate(date.getDate() + QUIET_DAYS_BEFORE_RETURN);
    date.setHours(hour, minute, 0, 0);
    if ((perDay.get(weekdayOf(date)) ?? []).length < cap) {
      planned.push({ ...make('gentle_return', returnTime), kind: 'date', date });
    }
  }

  return planned;
}
