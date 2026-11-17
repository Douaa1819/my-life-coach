import { screen, userEvent } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/render';

import { GoalForm } from '../components/goal-form';
import { goalFixture } from './goal-fixtures';

describe('GoalForm', () => {
  test('blocks submit until the title is long enough', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await renderWithProviders(<GoalForm submitLabel="Save goal" onSubmit={onSubmit} />);

    await user.press(screen.getByRole('button', { name: 'Save goal' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Tell me a bit more, at least 3 characters.')).toBeOnTheScreen();
  });

  test('submits a valid new goal', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await renderWithProviders(<GoalForm submitLabel="Save goal" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Your goal'), 'Run a 10 km race');
    await user.press(screen.getByRole('radio', { name: 'Health & fitness' }));
    await user.press(screen.getByRole('radio', { name: /In 3 months/ }));
    await user.press(screen.getByRole('button', { name: 'Save goal' }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Run a 10 km race',
      description: null,
      category: 'health',
      horizon: '3_months',
      targetDate: null,
    });
  });

  test('prefills an existing goal', async () => {
    const onSubmit = jest.fn();
    await renderWithProviders(
      <GoalForm initial={goalFixture()} submitLabel="Save changes" onSubmit={onSubmit} />,
    );
    expect(screen.getByLabelText('Your goal')).toHaveDisplayValue('Run a 10 km race');
    expect(screen.getByLabelText('Date')).toHaveDisplayValue('2027-05-01');
    expect(screen.getByRole('button', { name: 'Clear date' })).toBeOnTheScreen();
  });

  test('shows a save error without raw details', async () => {
    await renderWithProviders(
      <GoalForm
        submitLabel="Save goal"
        errorMessage="Can't reach the server. Check your connection and try again."
        onSubmit={jest.fn()}
      />,
    );
    expect(screen.getByText(/Can't reach the server/)).toBeOnTheScreen();
    expect(screen.queryByText(/ECONNREFUSED|postgres|42501/i)).toBeNull();
  });
});
