import { screen, userEvent } from '@testing-library/react-native';

import { Button } from '@/components/ui';
import { renderWithProviders } from '@/test/render';

describe('Button', () => {
  test('calls onPress when pressed', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await renderWithProviders(<Button label="Save goal" onPress={onPress} />);

    await user.press(screen.getByRole('button', { name: 'Save goal' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('is disabled and busy while loading', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await renderWithProviders(<Button label="Save goal" onPress={onPress} loading />);

    const button = screen.getByRole('button', { name: 'Save goal' });
    expect(button).toBeDisabled();
    expect(button).toBeBusy();

    await user.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
