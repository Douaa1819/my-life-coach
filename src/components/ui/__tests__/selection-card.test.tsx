import { act, fireEvent, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { SelectionCard, SelectionGroup } from '@/components/ui';
import { renderWithProviders } from '@/test/render';

let mockReduceMotion = false;

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => mockReduceMotion,
}));

async function settle() {
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
}

async function setFontScale(fontScale: number) {
  const window = { width: 390, height: 844, scale: 3, fontScale };
  await act(async () => Dimensions.set({ window, screen: window }));
}

beforeEach(() => {
  jest.useFakeTimers();
  mockReduceMotion = false;
});

afterEach(async () => {
  await setFontScale(1);
  jest.useRealTimers();
});

describe('SelectionCard', () => {
  test('single choice is a radio with its state and description announced', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <SelectionCard
        mode="single"
        title="In 6 months"
        description="Steady progress"
        selected={false}
        onPress={onPress}
      />,
    );

    const card = screen.getByRole('radio', { name: 'In 6 months, Steady progress' });
    expect(card).not.toBeChecked();

    await fireEvent.press(card);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('multiple choice is a checkbox', async () => {
    await renderWithProviders(
      <SelectionCard mode="multiple" title="Career" icon="goals" selected onPress={jest.fn()} />,
    );
    expect(screen.getByRole('checkbox', { name: 'Career' })).toBeChecked();
  });

  test('a disabled card is announced and ignores presses', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <SelectionCard mode="multiple" title="Money" selected={false} disabled onPress={onPress} />,
    );

    const card = screen.getByRole('checkbox', { name: 'Money' });
    expect(card).toBeDisabled();
    await fireEvent.press(card);
    expect(onPress).not.toHaveBeenCalled();
  });

  test('selecting fades in the selected look and pops the radio dot', async () => {
    const { rerender } = await renderWithProviders(
      <SelectionCard mode="single" title="Gentle" selected={false} onPress={jest.fn()} />,
    );
    const layer = screen.getByTestId('selection-card-selected-layer');
    const dot = screen.getByTestId('selection-card-mark');
    expect(layer).toHaveAnimatedStyle({ opacity: 0 });
    expect(dot).toHaveAnimatedStyle({ transform: [{ scale: 0 }] });

    await rerender(<SelectionCard mode="single" title="Gentle" selected onPress={jest.fn()} />);
    await settle();

    expect(screen.getByRole('radio', { name: 'Gentle' })).toBeChecked();
    expect(layer).toHaveAnimatedStyle({ opacity: 1 });
    expect(dot).toHaveAnimatedStyle({ transform: [{ scale: 1 }] });
  });

  test('the checkbox check appears with the fill', async () => {
    const { rerender } = await renderWithProviders(
      <SelectionCard mode="multiple" title="Health" selected={false} onPress={jest.fn()} />,
    );
    await rerender(<SelectionCard mode="multiple" title="Health" selected onPress={jest.fn()} />);
    await settle();

    expect(screen.getByTestId('selection-card-mark')).toHaveAnimatedStyle({
      opacity: 1,
      transform: [{ scale: 1 }],
    });
  });

  test('under reduced motion the dot appears at once, without a bounce', async () => {
    mockReduceMotion = true;
    const { rerender } = await renderWithProviders(
      <SelectionCard mode="single" title="Direct" selected={false} onPress={jest.fn()} />,
    );
    await rerender(<SelectionCard mode="single" title="Direct" selected onPress={jest.fn()} />);
    // One frame: a spring would still be far from 1 here.
    await act(async () => {
      jest.advanceTimersByTime(20);
    });

    expect(screen.getByTestId('selection-card-mark')).toHaveAnimatedStyle({
      transform: [{ scale: 1 }],
    });
  });

  test('press feedback scales the card to 0.98', async () => {
    await renderWithProviders(
      <SelectionCard mode="single" title="Energetic" selected={false} onPress={jest.fn()} />,
    );
    const card = screen.getByRole('radio', { name: 'Energetic' });

    await fireEvent(card, 'pressIn');
    await settle();
    expect(card).toHaveAnimatedStyle({ transform: [{ scale: 0.98 }] });
  });
});

describe('SelectionGroup', () => {
  const options = ['Health', 'Career', 'Learning'];

  function renderGroup(columns: 1 | 2, mode: 'single' | 'multiple' = 'multiple') {
    return renderWithProviders(
      <SelectionGroup label="What would you like to work on?" mode={mode} columns={columns}>
        {options.map((title) => (
          <SelectionCard
            key={title}
            mode={mode}
            variant={columns === 2 ? 'tile' : 'row'}
            title={title}
            icon="goals"
            selected={false}
            onPress={jest.fn()}
          />
        ))}
      </SelectionGroup>,
    );
  }

  // The group stays a non-focusable container, so each card remains its own TalkBack stop.
  const groupLabel = 'What would you like to work on?';

  test('a single-choice group is a labelled radio group', async () => {
    await renderGroup(1, 'single');
    const group = screen.getByLabelText(groupLabel);
    expect(group.props.role).toBe('radiogroup');
    expect(group.props.accessible).not.toBe(true);
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  test('a multiple-choice group is a labelled group of checkboxes', async () => {
    await renderGroup(1);
    expect(screen.getByLabelText(groupLabel).props.role).toBe('group');
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });

  test('two columns put cards side by side', async () => {
    await renderGroup(2);
    const health = screen.getByRole('checkbox', { name: 'Health' });
    const career = screen.getByRole('checkbox', { name: 'Career' });
    expect(health.parent?.parent).toBe(career.parent?.parent);
    expect(health.parent?.parent).not.toBe(screen.getByLabelText(groupLabel));
  });

  test('the grid falls back to one column above 130 % font scale', async () => {
    await setFontScale(1.5);
    await renderGroup(2);
    const group = screen.getByLabelText(groupLabel);
    for (const title of options) {
      expect(screen.getByRole('checkbox', { name: title }).parent).toBe(group);
    }
  });
});
