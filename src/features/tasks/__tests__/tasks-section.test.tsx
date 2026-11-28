import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/render';

import { TasksSection } from '../components/tasks-section';

const mockComplete = jest.fn();
const mockUndo = jest.fn();
const mockSkip = jest.fn();
const mockRemove = jest.fn();
const mockCreate = jest.fn();

let mockTasks: { data: unknown[] | undefined; isError: boolean };
let mockXp: { data: { totalXp: number; level: number } | undefined };

jest.mock('../use-tasks', () => ({
  useTasks: () => mockTasks,
  useXpTotals: () => mockXp,
  useCompleteTask: () => ({ mutate: mockComplete, isError: false }),
  useUndoTask: () => ({ mutate: mockUndo, isError: false }),
  useSkipTask: () => ({ mutate: mockSkip, isError: false }),
  useDeleteTask: () => ({ mutate: mockRemove, isError: false }),
  useCreateTask: () => ({ mutate: mockCreate, isPending: false, isError: false, reset: jest.fn() }),
}));

const NOW = new Date('2026-11-28T10:00:00.000Z').getTime();

function task(overrides: Record<string, unknown>) {
  return {
    id: 'task-1',
    userId: 'user-a',
    goalId: null,
    planItemId: null,
    taskDate: '2026-11-28',
    position: 1,
    title: 'Walk for 10 minutes',
    durationMinutes: 10,
    effort: 2,
    source: 'user',
    status: 'pending',
    completedAt: null,
    xpAwarded: 0,
    createdAt: '2026-11-28T08:00:00.000Z',
    updatedAt: '2026-11-28T08:00:00.000Z',
    ...overrides,
  };
}

function renderSection() {
  return renderWithProviders(<TasksSection taskDate="2026-11-28" goals={[]} now={NOW} />);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockTasks = { data: [], isError: false };
  mockXp = { data: { totalXp: 0, level: 1 } };
});

describe('TasksSection', () => {
  test('with nothing planned it says so and invites one step; no made-up tasks', async () => {
    await renderSection();
    expect(screen.getByText('Nothing planned yet.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Add a step' })).toBeOnTheScreen();
    expect(screen.queryByText(/XP/)).toBeNull();
  });

  test('lists real steps with their length and effort', async () => {
    mockTasks = { data: [task({})], isError: false };
    await renderSection();
    expect(screen.getByText('Walk for 10 minutes')).toBeOnTheScreen();
    expect(screen.getByText('10 min · Steady')).toBeOnTheScreen();
  });

  test('checking a step asks the server to complete it', async () => {
    mockTasks = { data: [task({})], isError: false };
    await renderSection();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Walk for 10 minutes' }));
    expect(mockComplete).toHaveBeenCalledWith('task-1');
  });

  test('a completed step shows the XP the server awarded, and level and total', async () => {
    mockXp = { data: { totalXp: 230, level: 2 } };
    mockTasks = {
      data: [
        task({
          status: 'completed',
          xpAwarded: 20,
          completedAt: new Date(NOW - 60_000).toISOString(),
        }),
      ],
      isError: false,
    };
    await renderSection();
    expect(screen.getByText('10 min · Steady · +20 XP')).toBeOnTheScreen();
    expect(screen.getByText('Level 2 · 230 XP')).toBeOnTheScreen();
  });

  test('a recent completion can be undone', async () => {
    mockTasks = {
      data: [
        task({
          status: 'completed',
          xpAwarded: 20,
          completedAt: new Date(NOW - 60_000).toISOString(),
        }),
      ],
      isError: false,
    };
    await renderSection();
    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    expect(mockUndo).toHaveBeenCalledWith('task-1');
  });

  test('an old completion is history: no undo', async () => {
    mockTasks = {
      data: [
        task({
          status: 'completed',
          xpAwarded: 20,
          completedAt: new Date(NOW - 3_600_000).toISOString(),
        }),
      ],
      isError: false,
    };
    await renderSection();
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });

  test('skipping is kind: no penalty wording, no XP', async () => {
    mockTasks = { data: [task({ status: 'skipped' })], isError: false };
    await renderSection();
    expect(screen.getByText('Skipped. No pressure.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull();
  });

  test('pending steps can be skipped or removed', async () => {
    mockTasks = { data: [task({})], isError: false };
    await renderSection();
    await fireEvent.press(screen.getByRole('button', { name: 'Skip' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Remove' }));
    expect(mockSkip).toHaveBeenCalledWith('task-1');
    expect(mockRemove).toHaveBeenCalledWith('task-1');
  });

  test('adds a step with a name, length and effort', async () => {
    await renderSection();
    await fireEvent.press(screen.getByRole('button', { name: 'Add a step' }));
    await fireEvent.changeText(screen.getByLabelText('What is one small step?'), 'Stretch');
    await fireEvent.press(screen.getByRole('radio', { name: '25 min' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Hard' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add step' }));
    expect(mockCreate).toHaveBeenCalledWith(
      { title: 'Stretch', durationMinutes: 25, effort: 3, taskDate: '2026-11-28', goalId: null },
      expect.any(Object),
    );
  });

  test('an empty name is not sent', async () => {
    await renderSection();
    await fireEvent.press(screen.getByRole('button', { name: 'Add a step' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add step' }));
    expect(screen.getByText('Give the step a name.')).toBeOnTheScreen();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test('a load failure is calm and says the data is safe', async () => {
    mockTasks = { data: undefined, isError: true };
    await renderSection();
    expect(screen.getByText(/Your data is safe/)).toBeOnTheScreen();
  });
});
