import { fireEvent, screen, userEvent } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/render';

import { GoalStep } from '../screens/goal-step';
import { goalSuggestions, textInputLimits } from '../onboarding.schema';
import { completeAnswers } from './onboarding-fixtures';

async function setup(props: Partial<Parameters<typeof GoalStep>[0]> = {}) {
  const handlers = {
    onChangeTitle: jest.fn(),
    onChangeCategory: jest.fn(),
    onSubmit: jest.fn(),
  };
  const utils = await renderWithProviders(
    <GoalStep answers={completeAnswers({ focusAreas: ['health'] })} {...handlers} {...props} />,
  );
  return { ...handlers, ...utils };
}

describe('GoalStep', () => {
  test('typing reports the new title', async () => {
    const { onChangeTitle } = await setup({ answers: completeAnswers({ goalTitle: '' }) });

    await fireEvent.changeText(screen.getByLabelText('Your goal'), 'Run');
    expect(onChangeTitle).toHaveBeenLastCalledWith('Run');
  });

  test('limits the title input to the shared maximum', async () => {
    await setup();
    expect(screen.getByLabelText('Your goal').props.maxLength).toBe(textInputLimits.goalTitle);
  });

  test('suggestions follow the first focus area and fill the title when pressed', async () => {
    const { onChangeTitle } = await setup({
      answers: completeAnswers({ focusAreas: ['career', 'health'] }),
    });

    const [first] = goalSuggestions.career;
    expect(
      screen.queryByRole('button', { name: `Use suggestion: ${goalSuggestions.health[0]}` }),
    ).toBeNull();
    await userEvent.setup().press(screen.getByRole('button', { name: `Use suggestion: ${first}` }));
    expect(onChangeTitle).toHaveBeenCalledWith(first);
  });

  test('falls back to health suggestions when no area is chosen', async () => {
    await setup({ answers: completeAnswers({ focusAreas: [] }) });
    expect(
      screen.getByRole('button', { name: `Use suggestion: ${goalSuggestions.health[0]}` }),
    ).toBeOnTheScreen();
  });

  test('the category picker is hidden with a single focus area', async () => {
    await setup({ answers: completeAnswers({ focusAreas: ['health'] }) });
    expect(screen.queryByRole('radiogroup', { name: 'This goal is about' })).toBeNull();
  });

  test('the category picker lets the user choose among their focus areas', async () => {
    const { onChangeCategory } = await setup({
      answers: completeAnswers({ focusAreas: ['health', 'career'], goalCategory: 'health' }),
    });
    expect(screen.getByRole('radio', { name: /Health/ })).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('radio', { name: /Career/ }));
    expect(onChangeCategory).toHaveBeenCalledWith('career');
  });

  test('hides the character counter below 100 characters', async () => {
    await setup({ answers: completeAnswers({ goalTitle: 'a'.repeat(99) }) });
    expect(screen.queryByText(/characters$/)).toBeNull();
  });

  test('shows the character counter from 100 characters', async () => {
    await setup({ answers: completeAnswers({ goalTitle: 'a'.repeat(100) }) });
    expect(screen.getByText(/^100 of \d+ characters$/)).toBeOnTheScreen();
  });

  test('counts emoji as one character', async () => {
    await setup({ answers: completeAnswers({ goalTitle: '🏃'.repeat(100) }) });
    expect(screen.getByText(/^100 of \d+ characters$/)).toBeOnTheScreen();
  });

  test('shows a validation message and submits from the keyboard', async () => {
    const { onSubmit } = await setup({ errorText: 'Give your goal a short name.' });
    expect(screen.getByText('Give your goal a short name.')).toBeOnTheScreen();

    await fireEvent(screen.getByLabelText('Your goal'), 'submitEditing');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
