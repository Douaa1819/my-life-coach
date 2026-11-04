import { completeOnboarding, OnboardingSubmitError } from '../onboarding.api';
import { completeAnswers } from './onboarding-fixtures';

const mockRpc = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({ rpc: mockRpc }),
}));

describe('completeOnboarding', () => {
  beforeEach(() => jest.clearAllMocks());

  test('sends exactly the validated fields', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    await completeOnboarding(completeAnswers({ displayName: ' Sara ', goalTitle: ' Run 5 km ' }));

    expect(mockRpc).toHaveBeenCalledWith('complete_onboarding', {
      p_display_name: 'Sara',
      p_focus_areas: ['health', 'career'],
      p_goal_title: 'Run 5 km',
      p_goal_category: 'health',
      p_goal_horizon: '6_months',
      p_daily_minutes: 15,
      p_coach_tone: 'gentle',
      p_goal_description: 'More energy for my kids',
      p_reminder_time: '08:00',
    });
  });

  test('omits the optional reason and reminder when not given', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    await completeOnboarding(completeAnswers({ motivation: '', checkIn: 'none' }));

    const args = mockRpc.mock.calls[0]?.[1];
    expect(args).not.toHaveProperty('p_goal_description');
    expect(args).not.toHaveProperty('p_reminder_time');
  });

  test('does not call the server with invalid answers', async () => {
    await expect(completeOnboarding(completeAnswers({ coachTone: null }))).rejects.toMatchObject({
      kind: 'invalid',
      step: 'coachStyle',
    });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  test('already_completed counts as success', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'already_completed' },
    });
    await expect(completeOnboarding(completeAnswers())).resolves.toBeUndefined();
  });

  test('maps a server validation error to its step', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: '22023', message: 'invalid_goal_title' },
    });
    await expect(completeOnboarding(completeAnswers())).rejects.toMatchObject({
      kind: 'invalid',
      step: 'goal',
    });
  });

  test.each([
    [{ code: '', message: 'TypeError: Network request failed' }, 'network'],
    [{ code: '42501', message: 'not_authenticated' }, 'forbidden'],
    [{ code: 'P0002', message: 'profile_not_found' }, 'unknown'],
  ])('maps %j to %s', async (error, kind) => {
    mockRpc.mockResolvedValue({ data: null, error });
    await expect(completeOnboarding(completeAnswers())).rejects.toMatchObject({ kind, step: null });
  });

  test('errors carry no answers or server text', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: 'XX000', message: 'internal detail about public.goals' },
    });
    const error = await completeOnboarding(completeAnswers()).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(OnboardingSubmitError);
    const serialized = JSON.stringify({ ...(error as object), message: (error as Error).message });
    expect(serialized).not.toMatch(/Sara|Run 5 km|energy|public\.goals/);
  });
});
