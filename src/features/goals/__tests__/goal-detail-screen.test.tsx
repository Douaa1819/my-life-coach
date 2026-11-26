import { screen, userEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { renderWithProviders } from '@/test/render';

import { GoalDetailScreen } from '../screens/goal-detail-screen';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockMutateStatus = jest.fn();
const mockMutateDelete = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    back: () => mockBack(),
    canGoBack: () => true,
    replace: jest.fn(),
  },
}));

jest.mock('../use-goals', () => ({
  useGoal: () => ({
    data: {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      userId: '11111111-1111-4111-8111-111111111111',
      title: 'Run a 10 km race',
      description: 'More energy for my kids',
      category: 'health',
      horizon: '6_months',
      status: 'active',
      targetDate: '2027-05-01',
      completedAt: null,
      createdAt: '2026-11-13T10:00:00.000Z',
      updatedAt: '2026-11-13T10:00:00.000Z',
    },
    isPending: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useUpdateGoalStatus: () => ({
    mutate: mockMutateStatus,
    isPending: false,
    isError: false,
    error: null,
  }),
  useDeleteGoal: () => ({
    mutate: mockMutateDelete,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

describe('GoalDetailScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  test('shows the goal and edits it', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<GoalDetailScreen goalId="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" />);
    expect(screen.getByRole('heading', { name: 'Run a 10 km race' })).toBeOnTheScreen();
    expect(screen.getByText('More energy for my kids')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Edit' }));
    expect(mockPush).toHaveBeenCalledWith('/goal/edit/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  });

  test('marks a goal as reached', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<GoalDetailScreen goalId="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" />);
    await user.press(screen.getByRole('button', { name: 'Mark as reached' }));
    expect(mockMutateStatus).toHaveBeenCalledWith('completed');
  });

  test('asks before deleting', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const confirm = buttons?.find((button) => button.style === 'destructive');
      confirm?.onPress?.();
    });
    const user = userEvent.setup();
    await renderWithProviders(<GoalDetailScreen goalId="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" />);
    await user.press(screen.getByRole('button', { name: 'Delete' }));
    expect(alert).toHaveBeenCalled();
    expect(mockMutateDelete).toHaveBeenCalled();
    alert.mockRestore();
  });
});
