import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/render';

import { RemindersSetting } from '../components/reminders-setting';
import { DEFAULT_PREFERENCES, type ReminderPreferences } from '../notification.schema';

const mockSave = jest.fn();
const mockRequest = jest.fn();
const mockSync = jest.fn();

let mockPrefs: ReminderPreferences | undefined;

jest.mock('../use-notifications', () => ({
  useReminderPreferences: () => ({ data: mockPrefs }),
  useSaveReminderPreferences: () => ({ mutateAsync: mockSave }),
}));
jest.mock('../reminder-service', () => ({
  remindersSupported: true,
  requestReminderPermission: () => mockRequest(),
  syncReminders: (...args: unknown[]) => mockSync(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockPrefs = DEFAULT_PREFERENCES;
  mockSave.mockImplementation(async (input: Record<string, unknown>) => ({
    ...DEFAULT_PREFERENCES,
    ...input,
  }));
  mockRequest.mockResolvedValue('granted');
});

const reminderSwitch = () => screen.getByRole('switch', { name: 'Gentle reminders' });

describe('RemindersSetting', () => {
  test('is off by default and promises quiet hours and at most two a day', async () => {
    await renderWithProviders(<RemindersSetting />);
    expect(reminderSwitch().props.value ?? reminderSwitch().props['aria-checked']).toBeFalsy();
    expect(screen.getByText(/Never in quiet hours, and at most two a day/)).toBeOnTheScreen();
    expect(screen.queryByText('Morning time')).toBeNull();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  test('turning it on asks the phone, then saves starter choices and schedules them', async () => {
    await renderWithProviders(<RemindersSetting />);
    await fireEvent(reminderSwitch(), 'valueChange', true);
    await waitFor(() => expect(mockSave).toHaveBeenCalled());
    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        morningTime: '09:00',
        eveningTime: '20:00',
        types: ['morning_plan', 'evening_checkin'],
        permissionAskedAt: expect.any(String),
      }),
    );
    await waitFor(() =>
      expect(mockSync).toHaveBeenCalledWith(expect.objectContaining({ enabled: true })),
    );
  });

  test('if the phone says no, reminders stay off and nothing is scheduled as on', async () => {
    mockRequest.mockResolvedValue('denied');
    await renderWithProviders(<RemindersSetting />);
    await fireEvent(reminderSwitch(), 'valueChange', true);
    expect(await screen.findByText('No problem. Reminders stay off.')).toBeOnTheScreen();
    expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  test('if reminders are blocked in the phone settings it says so and offers to open them', async () => {
    mockRequest.mockResolvedValue('blocked');
    await renderWithProviders(<RemindersSetting />);
    await fireEvent(reminderSwitch(), 'valueChange', true);
    expect(await screen.findByText(/switched off in your phone settings/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Open phone settings' })).toBeOnTheScreen();
  });

  test('turning it off cancels everything', async () => {
    mockPrefs = {
      ...DEFAULT_PREFERENCES,
      enabled: true,
      morningTime: '09:00',
      types: ['morning_plan'],
    };
    await renderWithProviders(<RemindersSetting />);
    await fireEvent(reminderSwitch(), 'valueChange', false);
    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ enabled: false })),
    );
    await waitFor(() =>
      expect(mockSync).toHaveBeenCalledWith(expect.objectContaining({ enabled: false })),
    );
  });

  test('times inside quiet hours are not offered as reminder times', async () => {
    mockPrefs = { ...DEFAULT_PREFERENCES, enabled: true, types: ['morning_plan'] };
    await renderWithProviders(<RemindersSetting />);
    const morning = within(screen.getByLabelText('Morning time'));
    expect(morning.getByRole('radio', { name: '09:00' })).toBeOnTheScreen();
    expect(morning.queryByRole('radio', { name: '07:00' })).toBeNull();
    const evening = within(screen.getByLabelText('Evening time'));
    expect(evening.getByRole('radio', { name: '21:00' })).toBeOnTheScreen();
    expect(evening.queryByRole('radio', { name: '22:00' })).toBeNull();
  });

  test('choosing a morning time saves it and reschedules', async () => {
    mockPrefs = { ...DEFAULT_PREFERENCES, enabled: true, types: ['morning_plan'] };
    await renderWithProviders(<RemindersSetting />);
    const morning = within(screen.getByLabelText('Morning time'));
    await fireEvent.press(morning.getByRole('radio', { name: '10:00' }));
    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ morningTime: '10:00' })),
    );
    await waitFor(() => expect(mockSync).toHaveBeenCalled());
  });

  test('a reminder type can be switched off on its own', async () => {
    mockPrefs = {
      ...DEFAULT_PREFERENCES,
      enabled: true,
      types: ['morning_plan', 'evening_checkin'],
    };
    await renderWithProviders(<RemindersSetting />);
    await fireEvent(screen.getByRole('switch', { name: 'Evening check-in' }), 'valueChange', false);
    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ types: ['morning_plan'] })),
    );
  });
});
