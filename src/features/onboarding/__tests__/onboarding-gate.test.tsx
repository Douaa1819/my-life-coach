import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { getProfile } from '@/features/profile/profile.api';
import { type Profile } from '@/features/profile/profile.schema';
import { createChunkedStorage } from '@/lib/supabase/chunked-storage';
import { renderWithProviders } from '@/test/render';

import { OnboardingGate } from '../onboarding-gate';
import { createOnboardingDraftStore } from '../onboarding-draft-store';
import { completeAnswers, USER_A } from './onboarding-fixtures';

let mockUser: { id: string } | null = { id: USER_A };

jest.mock('@/features/auth/auth-provider', () => ({
  useSessionUser: () => mockUser,
}));

jest.mock('@/features/profile/profile.api', () => ({
  getProfile: jest.fn(),
}));

const getProfileMock = jest.mocked(getProfile);

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: USER_A,
    displayName: 'Sara',
    avatarUrl: null,
    timezone: 'UTC',
    onboardingCompleted: false,
    ...overrides,
  };
}

function memoryDraftStore() {
  const items = new Map<string, string>();
  return createOnboardingDraftStore(
    createChunkedStorage({
      getItemAsync: async (key) => items.get(key) ?? null,
      setItemAsync: async (key, value) => {
        items.set(key, value);
      },
      deleteItemAsync: async (key) => {
        items.delete(key);
      },
    }),
  );
}

const flow = jest.fn();

function renderGate(draftStore = memoryDraftStore()) {
  return renderWithProviders(
    <OnboardingGate draftStore={draftStore}>
      {(onboarding) => {
        flow(onboarding.state);
        return (
          <Text>{`flow:${onboarding.state.step}:${onboarding.state.answers.displayName}`}</Text>
        );
      }}
    </OnboardingGate>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { id: USER_A };
});

describe('OnboardingGate', () => {
  test('shows a loader, not the questions, while the profile loads', async () => {
    getProfileMock.mockReturnValue(new Promise(() => undefined));
    await renderGate();

    expect(screen.getByText('Loading your profile')).toBeOnTheScreen();
    expect(flow).not.toHaveBeenCalled();
  });

  test('a failed profile load offers a retry and then starts the flow', async () => {
    getProfileMock.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(profile());
    await renderGate();

    expect(await screen.findByText("We couldn't load your account")).toBeOnTheScreen();
    expect(flow).not.toHaveBeenCalled();

    await userEvent.setup().press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('flow:intro:Sara')).toBeOnTheScreen();
  });

  test("never starts with another user's profile", async () => {
    getProfileMock.mockResolvedValue(profile({ id: 'b0000000-0000-4000-8000-000000000002' }));
    await renderGate();

    await waitFor(() => expect(getProfileMock).toHaveBeenCalled());
    expect(screen.getByText('Loading your profile')).toBeOnTheScreen();
    expect(flow).not.toHaveBeenCalled();
  });

  test('an onboarded profile never sees the questions again', async () => {
    getProfileMock.mockResolvedValue(profile({ onboardingCompleted: true }));
    await renderGate();

    await waitFor(() => expect(getProfileMock).toHaveBeenCalled());
    expect(screen.queryByText(/^flow:/)).not.toBeOnTheScreen();
    expect(flow).not.toHaveBeenCalled();
  });

  test('waits for the draft, then opens on the saved step', async () => {
    getProfileMock.mockResolvedValue(profile());
    const draftStore = memoryDraftStore();
    await draftStore.save(USER_A, 'goal', { ...completeAnswers(), displayName: 'Sam' });

    await renderGate(draftStore);

    expect(await screen.findByText('flow:goal:Sam')).toBeOnTheScreen();
    expect(flow.mock.calls.every(([state]) => state.restoring === false)).toBe(true);
  });

  test('renders nothing of the flow without a signed-in user', async () => {
    mockUser = null;
    getProfileMock.mockResolvedValue(profile());
    await renderGate();

    expect(screen.getByText('Loading')).toBeOnTheScreen();
    expect(flow).not.toHaveBeenCalled();
  });
});
