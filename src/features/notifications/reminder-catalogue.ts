import { type ReminderType } from './notification.schema';

export type ReminderContent = { title: string; body: string };

/**
 * Every reminder the app can send. They are fixed, warm and about the person's own pace:
 * no streaks, no counts, no "don't forget", nothing that makes skipping feel like failing,
 * and no personal data (no goal names, no scores). They also say nothing a stranger glancing
 * at a lock screen could learn from.
 */
export const reminderCatalogue: Record<ReminderType, ReminderContent> = {
  morning_plan: {
    title: 'A small step for today?',
    body: 'Whenever you are ready, your plan is here.',
  },
  evening_checkin: {
    title: 'How was today?',
    body: 'A minute to notice how you feel, if you would like.',
  },
  weekly_review: {
    title: 'A look back at last week',
    body: 'Your week in a few words, whenever you want it.',
  },
  gentle_return: {
    title: 'No rush',
    body: 'Your plan will be right here whenever you want to come back.',
  },
};

/** Words that must never appear in a reminder. A test checks the whole catalogue. */
export const forbiddenReminderWords =
  /streak|miss(ed|ing)?\b|lost|lose|behind|overdue|don't forget|dont forget|last chance|hurry|falling|failed|failing|guilt|disappoint/i;
