import { decideAdjustment, getCheckin, getWeeklyReview, saveCheckin } from '../checkins.api';
import { checkinWriteSchema } from '../checkin.schema';

const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({ from: mockFrom, rpc: mockRpc }),
}));

const ID = '11111111-1111-4111-8111-111111111111';

function checkinRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ID,
    user_id: ID,
    local_date: '2026-11-28',
    mood: 4,
    energy: null,
    stress: null,
    sleep_quality: null,
    effort_vs_results: null,
    note: null,
    created_at: '2026-11-28T08:00:00.000Z',
    updated_at: '2026-11-28T08:00:00.000Z',
    ...overrides,
  };
}

describe('checkins.api', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getCheckin returns null when the person skipped the day', async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockFrom.mockReturnValue(query);
    await expect(getCheckin('2026-11-28')).resolves.toBeNull();
    expect(query.eq).toHaveBeenCalledWith('local_date', '2026-11-28');
  });

  test('saveCheckin sends skipped questions as nothing, never as a score of 0', async () => {
    mockRpc.mockResolvedValue({ data: checkinRow(), error: null });
    await saveCheckin({
      mood: 4,
      energy: 0,
      stress: 0,
      sleepQuality: 0,
      effortVsResults: 0,
      note: '',
    });
    expect(mockRpc).toHaveBeenCalledWith('log_checkin', {
      p_mood: 4,
      p_energy: undefined,
      p_stress: undefined,
      p_sleep_quality: undefined,
      p_effort_vs_results: undefined,
      p_note: undefined,
    });
  });

  test('saveCheckin refuses an empty check-in before calling the server', async () => {
    await expect(
      saveCheckin({ mood: 0, energy: 0, stress: 0, sleepQuality: 0, effortVsResults: 0, note: '' }),
    ).rejects.toMatchObject({ kind: 'invalid' });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  test('the schema accepts a note on its own and trims it', () => {
    const parsed = checkinWriteSchema.parse({
      mood: 0,
      energy: 0,
      stress: 0,
      sleepQuality: 0,
      effortVsResults: 0,
      note: '  Slow morning ',
    });
    expect(parsed.note).toBe('Slow morning');
  });

  test('getWeeklyReview maps the review and its suggestion', async () => {
    mockRpc.mockResolvedValue({
      data: {
        review: {
          id: ID,
          week_start: '2026-11-16',
          planned: 10,
          completed: 5,
          completion_rate: 0.5,
          band: 'under_60',
          wellness_score: null,
          wellness_confidence: 'none',
          checkin_days: 0,
        },
        adjustment: {
          id: ID,
          review_id: ID,
          kind: 'reduce_15',
          percent_change: -15,
          reason: 'This week asked a lot of you.',
          status: 'proposed',
          decided_at: null,
        },
      },
      error: null,
    });
    await expect(getWeeklyReview()).resolves.toMatchObject({
      review: { planned: 10, completed: 5, band: 'under_60' },
      adjustment: { kind: 'reduce_15', percentChange: -15, status: 'proposed' },
    });
  });

  test('a week with too little to say has no suggestion', async () => {
    mockRpc.mockResolvedValue({
      data: {
        review: {
          id: ID,
          week_start: '2026-11-16',
          planned: 1,
          completed: 1,
          completion_rate: null,
          band: null,
          wellness_score: null,
          wellness_confidence: 'none',
          checkin_days: 0,
        },
        adjustment: null,
      },
      error: null,
    });
    await expect(getWeeklyReview()).resolves.toMatchObject({ adjustment: null });
  });

  test('decideAdjustment sends the choice to the server', async () => {
    mockRpc.mockResolvedValue({
      data: {
        id: ID,
        review_id: ID,
        kind: 'maintain',
        percent_change: 0,
        reason: 'Steady.',
        status: 'declined',
        decided_at: '2026-11-28T09:00:00.000Z',
      },
      error: null,
    });
    await expect(decideAdjustment(ID, false)).resolves.toMatchObject({ status: 'declined' });
    expect(mockRpc).toHaveBeenCalledWith('decide_adjustment', {
      p_adjustment_id: ID,
      p_accept: false,
    });
  });
});
