import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/render';

import { CheckinCard } from '../components/checkin-card';
import { WeeklyReviewCard } from '../components/weekly-review-card';

const mockSave = jest.fn();
const mockRemove = jest.fn();
const mockDecide = jest.fn();

let mockToday: { data: unknown; isPending: boolean; isError: boolean };
let mockWeekly: { data: unknown };

jest.mock('../use-checkins', () => ({
  useTodayCheckin: () => mockToday,
  useSaveCheckin: () => ({ mutate: mockSave, isPending: false, isError: false, reset: jest.fn() }),
  useDeleteCheckin: () => ({ mutate: mockRemove }),
  useWeeklyReview: () => mockWeekly,
  useDecideAdjustment: () => ({ mutate: mockDecide, isPending: false, isError: false }),
}));

const saved = {
  id: 'c1',
  localDate: '2026-11-28',
  mood: 4,
  energy: 2,
  stress: null,
  sleepQuality: null,
  effortVsResults: null,
  note: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockToday = { data: null, isPending: false, isError: false };
  mockWeekly = { data: undefined };
});

describe('CheckinCard', () => {
  test('is a quiet, optional invitation; skipping it removes it', async () => {
    await renderWithProviders(<CheckinCard localDate="2026-11-28" />);
    expect(screen.getByText('How are you today?')).toBeOnTheScreen();
    expect(screen.getByText(/Totally optional/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Not today' }));
    expect(screen.queryByText('How are you today?')).toBeNull();
  });

  test('every question can be skipped; a check-in sends only what was answered', async () => {
    await renderWithProviders(<CheckinCard localDate="2026-11-28" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Check in' }));
    expect(
      screen.getByText('Only for you. Answer what you like and skip the rest.'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole('radio', { name: 'Good' })[0]!);
    await fireEvent.press(screen.getByRole('button', { name: 'Save check-in' }));
    expect(mockSave).toHaveBeenCalledWith(
      { mood: 4, energy: 0, stress: 0, sleepQuality: 0, effortVsResults: 0, note: '' },
      expect.any(Object),
    );
  });

  test('saving nothing is not allowed, and says so kindly', async () => {
    await renderWithProviders(<CheckinCard localDate="2026-11-28" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Check in' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save check-in' }));
    expect(screen.getByText('Answer one question, or skip today.')).toBeOnTheScreen();
    expect(mockSave).not.toHaveBeenCalled();
  });

  test('after checking in it thanks the person and offers to change or delete', async () => {
    mockToday = { data: saved, isPending: false, isError: false };
    await renderWithProviders(<CheckinCard localDate="2026-11-28" />);
    expect(screen.getByText('Thanks for checking in.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    expect(mockRemove).toHaveBeenCalledWith('c1');
  });

  test('a load problem hides the card instead of showing an error', async () => {
    mockToday = { data: undefined, isPending: false, isError: true };
    await renderWithProviders(<CheckinCard localDate="2026-11-28" />);
    expect(screen.queryByText('How are you today?')).toBeNull();
  });
});

describe('WeeklyReviewCard', () => {
  const review = { id: 'r1', planned: 10, completed: 5 };
  const adjustment = {
    id: 'a1',
    kind: 'reduce_15',
    percentChange: -15,
    reason: 'This week asked a lot of you. Planning about 15% less next week might feel lighter.',
    status: 'proposed',
  };

  test('shows last week in plain words with a suggestion to take or leave', async () => {
    mockWeekly = { data: { review, adjustment } };
    await renderWithProviders(<WeeklyReviewCard />);
    expect(screen.getByText('5 of 10 steps done.')).toBeOnTheScreen();
    expect(screen.getByText(/Planning about 15% less/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'No thanks' }));
    expect(mockDecide).toHaveBeenCalledWith({ id: 'a1', accept: false });
    await fireEvent.press(screen.getByRole('button', { name: 'Sounds good' }));
    expect(mockDecide).toHaveBeenCalledWith({ id: 'a1', accept: true });
  });

  test('stays away when there is nothing to suggest or it was already answered', async () => {
    mockWeekly = { data: { review, adjustment: null } };
    const { unmount } = await renderWithProviders(<WeeklyReviewCard />);
    expect(screen.queryByText('Looking back at last week')).toBeNull();
    await unmount();

    mockWeekly = { data: { review, adjustment: { ...adjustment, status: 'declined' } } };
    await renderWithProviders(<WeeklyReviewCard />);
    expect(screen.queryByText('Looking back at last week')).toBeNull();
  });
});
